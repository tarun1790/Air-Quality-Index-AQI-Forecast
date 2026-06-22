import numpy as np
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler

class AQILSTM(nn.Module):
    def __init__(self, input_size=1, hidden_size=64, num_layers=1, output_size=24):
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
        
        # Take the output of the last time step and project it
        out = self.fc(out[:, -1, :])
        return out

def train_and_forecast_aqi(historical_data, forecast_length=24, input_seq_length=72, epochs=80, batch_size=32):
    """
    Trains a local PyTorch LSTM model on historical hourly AQI data
    and forecasts the next 24 hours.
    
    device: Always defaults to CUDA/GPU if available.
    """
    try:
        # Check inputs
        if len(historical_data) < (input_seq_length + forecast_length):
            # Fallback if there is not enough historical data
            return list(np.clip(np.array(historical_data[-forecast_length:]), 0, 500))
        
        # Data preparation
        data = np.array(historical_data, dtype=np.float32).reshape(-1, 1)
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(data).flatten()
        
        # Create rolling windows
        X, y = [], []
        for i in range(len(scaled_data) - input_seq_length - forecast_length + 1):
            X.append(scaled_data[i : i + input_seq_length])
            y.append(scaled_data[i + input_seq_length : i + input_seq_length + forecast_length])
            
        X = np.array(X, dtype=np.float32)
        y = np.array(y, dtype=np.float32)
        
        # Convert to PyTorch tensors
        X_tensor = torch.tensor(X, dtype=torch.float32).unsqueeze(-1)  # Shape: (N, seq_length, 1)
        y_tensor = torch.tensor(y, dtype=torch.float32)               # Shape: (N, forecast_length)
        
        # GPU / CUDA configuration
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"[Model] Using device: {device}")
        
        # Initialize model, loss, and optimizer
        model = AQILSTM(input_size=1, hidden_size=64, num_layers=1, output_size=forecast_length).to(device)
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
            
            # Print intermediate loss logs occasionally (optional diagnostics)
            if (epoch + 1) % 40 == 0:
                print(f"[Model] Epoch {epoch+1}/{epochs} - Loss: {epoch_loss / num_samples:.6f}")
                
        # Inference
        model.eval()
        last_seq = scaled_data[-input_seq_length:]
        input_tensor = torch.tensor(last_seq, dtype=torch.float32).unsqueeze(0).unsqueeze(-1).to(device)
        
        with torch.no_grad():
            pred_scaled = model(input_tensor).cpu().numpy().flatten()
            
        pred_actual = scaler.inverse_transform(pred_scaled.reshape(-1, 1)).flatten()
        
        # Clip outputs to realistic AQI levels
        forecast = list(np.clip(pred_actual, 0, 500).astype(float))
        return forecast

    except Exception as e:
        print(f"[Model Error] Model training failed: {e}. Falling back to default baseline.")
        # Simple fallback baseline: moving average trend projection
        last_val = historical_data[-1]
        fallback = []
        for i in range(1, forecast_length + 1):
            # Repeat last value with minor noise/damping
            fallback.append(max(0.0, float(last_val + np.random.normal(0, 1))))
        return fallback
