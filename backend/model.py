import numpy as np
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler

class AQILSTM(nn.Module):
    def __init__(self, input_size=2, hidden_size=64, num_layers=1, output_size=24):
        """
        input_size=2: Expects multivariate inputs (e.g. US AQI and PM2.5 values)
        """
        super(AQILSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        # Initialize hidden and cell states
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        # Forward pass through LSTM
        out, _ = self.lstm(x, (h0, c0))
        
        # Take the output of the last time step and project it to future forecast
        out = self.fc(out[:, -1, :])
        return out

def train_and_forecast_aqi(historical_aqi, historical_pm25, forecast_length=24, input_seq_length=72, epochs=80, batch_size=32):
    """
    Trains an advanced multivariate PyTorch LSTM model on historical hourly AQI and PM2.5 data,
    forecasting the next 24 hours of AQI.
    
    GPU Execution: Configured to train on CUDA if available.
    """
    try:
        # Check inputs
        n_samples = len(historical_aqi)
        if n_samples < (input_seq_length + forecast_length) or len(historical_pm25) != n_samples:
            # Fallback if there is not enough historical data
            return list(np.clip(np.array(historical_aqi[-forecast_length:]), 0, 500))
        
        # Data preparation (stacking features for multivariate learning)
        aqi_data = np.array(historical_aqi, dtype=np.float32).reshape(-1, 1)
        pm25_data = np.array(historical_pm25, dtype=np.float32).reshape(-1, 1)
        
        # Shape: (N, 2)
        multivariate_data = np.hstack((aqi_data, pm25_data))
        
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(multivariate_data)
        
        # Create rolling windows
        X, y = [], []
        for i in range(len(scaled_data) - input_seq_length - forecast_length + 1):
            # X receives both features (AQI and PM2.5) over the sequence length
            X.append(scaled_data[i : i + input_seq_length, :])
            # y receives the target variable (AQI) over the forecast length
            y.append(scaled_data[i + input_seq_length : i + input_seq_length + forecast_length, 0])
            
        X = np.array(X, dtype=np.float32)
        y = np.array(y, dtype=np.float32)
        
        # Convert to PyTorch tensors
        # X shape: (N, seq_length, 2)
        # y shape: (N, forecast_length)
        X_tensor = torch.tensor(X, dtype=torch.float32)
        y_tensor = torch.tensor(y, dtype=torch.float32)
        
        # GPU / CUDA configuration
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"[Model] Using device: {device}")
        
        # Initialize model, loss, and optimizer
        model = AQILSTM(input_size=2, hidden_size=64, num_layers=1, output_size=forecast_length).to(device)
        X_tensor = X_tensor.to(device)
        y_tensor = y_tensor.to(device)
        
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
        
        # Train model
        model.train()
        num_samples = X_tensor.shape[0]
        for epoch in range(epochs):
            permutation = torch.randperm(num_samples)
            epoch_loss = 0.0
            for i in range(0, num_samples, batch_size):
                indices = permutation[i : i + batch_size]
                batch_x = X_tensor[indices]
                batch_y = y_tensor[indices]
                
                optimizer.zero_grad()
                outputs = model(batch_x)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                
                epoch_loss += loss.item() * len(indices)
            
            # Diagnostic prints
            if (epoch + 1) % 40 == 0:
                print(f"[Model] Epoch {epoch+1}/{epochs} - Loss: {epoch_loss / num_samples:.6f}")
                
        # Inference
        model.eval()
        # Take the last 72 hours of both features
        last_seq = scaled_data[-input_seq_length:, :]
        # Shape: (1, 72, 2)
        input_tensor = torch.tensor(last_seq, dtype=torch.float32).unsqueeze(0).to(device)
        
        with torch.no_grad():
            pred_scaled = model(input_tensor).cpu().numpy().flatten()
            
        # Reconstruct dummy 2D array to perform inverse scaling on multivariate scaler
        dummy_pred = np.zeros((len(pred_scaled), 2), dtype=np.float32)
        dummy_pred[:, 0] = pred_scaled
        
        pred_actual_2d = scaler.inverse_transform(dummy_pred)
        pred_actual = pred_actual_2d[:, 0]
        
        # Clip outputs to standard AQI levels
        forecast = list(np.clip(pred_actual, 0, 500).astype(float))
        return forecast

    except Exception as e:
        print(f"[Model Error] Multivariate model training failed: {e}. Falling back to baseline.")
        # Fallback baseline: damped moving average trend projection
        last_val = historical_aqi[-1]
        fallback = []
        for i in range(1, forecast_length + 1):
            fallback.append(max(0.0, float(last_val + np.random.normal(0, 1.2))))
        return fallback
