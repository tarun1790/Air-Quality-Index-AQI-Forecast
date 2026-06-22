# Purple AQI Forecast

An AI-powered, high-fidelity Air Quality Index (AQI) forecasting and health diagnostic dashboard. This application tracks live GPS coordinates, performs reverse geocoding to resolve nearby town names, displays detailed EPA air pollutant levels compared to WHO guidelines, and trains a local PyTorch LSTM neural network dynamically on the GPU (using CUDA) to compare physical CAMS predictions against machine learning forecasts.

---

## Intern Project Details
* **Intern Name**: Jampani Tarun Sai
* **Intern ID**: CITS1344
* **Internship Duration**: 12 Weeks Internship

---

## Key Features

1. **Cinematic Hero Landing Page**:
   - A full-screen (`100vh`) black aesthetic interface displaying the brand name **Purple AQI Forecast** with glowing typography.
   - Built-in bouncing mouse-wheel scroll animation directing viewers to the main dashboard.
2. **Reverse-Geocoded GPS Tracking**:
   - Automatically tracks coordinates via the HTML5 Geolocation API.
   - Dynamically calls OpenStreetMap's Nominatim API to resolve the raw coordinates into a nearby town or suburb name (e.g. resolving coordinates to your exact town).
3. **Circular AQI Gauge**:
   - Interactive circular SVG gauge representing the US AQI index (0 to 500) color-coded to EPA standards.
   - Contextual health advisory recommendations updated dynamically based on AQI categories.
4. **WHO Pollutant Guidelines Grid**:
   - Compares current concentrations of Particulate Matter ($\text{PM}_{2.5}$, $\text{PM}_{10}$), Carbon Monoxide ($\text{CO}$), Nitrogen Dioxide ($\text{NO}_2$), Sulfur Dioxide ($\text{SO}_2$), and Ozone ($\text{O}_3$) as a percentage relative to World Health Organization (WHO) 24h safety standards.
5. **AI Forecast comparison (GPU PyTorch LSTM vs. CAMS Physical Model)**:
   - Trains a dynamic 1-layer LSTM network on the host's GPU (CUDA) on 30 days (720 hours) of local hourly history.
   - Plots a side-by-side 24-hour forecast comparing our custom AI forecast against the Copernicus Atmospheric Transport physical model.
6. **7-Day Trend Chart**:
   - Visualizes past hourly levels of AQI, $\text{PM}_{2.5}$, and $\text{PM}_{10}$.
7. **City Comparison Dashboard**:
   - Allows users to search and stack cities to compare current AQI, $\text{PM}_{2.5}$, and $\text{PM}_{10}$ side-by-side.

---

## Tech Stack

* **Frontend**: React, TypeScript, Vite, Vanilla CSS (Glassmorphism layout, custom animations), Recharts (data visualization), Lucide React (vector icon systems).
* **Backend**: Python, FastAPI, Uvicorn, Requests (API calling), Pandas & scikit-learn (data scaling and preprocessing).
* **Machine Learning**: PyTorch (LSTM sequence-to-vector model trained dynamically on GPU/CUDA).
* **Data Sources**: Open-Meteo Air Quality API (live CAMS forecast/history), OpenStreetMap Nominatim API (reverse geocoding lookup), Open-Meteo Geocoding API (city coordinate resolution).

---

## How to Run Locally

### Prerequisites
Make sure you have Python (version 3.10+ recommended) and Node.js installed.

### Quick Start
1. Double-click the `run_project.bat` batch script in the root directory.
2. The script will boot up the FastAPI backend (`http://localhost:8000`), launch the Vite React dev server (`http://localhost:5173`), and open your default browser to the dashboard.

---

## Production Deployment

### Backend (Google Cloud Run / Render)
The backend is containerized. Build and deploy the [backend/Dockerfile](backend/Dockerfile) to Render or Google Cloud Run. Once deployed, copy your hosted URL.

### Frontend (Vercel / Firebase Hosting)
1. Paste your backend URL into `VITE_API_URL` inside the [frontend/.env.production](frontend/.env.production) configuration file.
2. Push your changes to GitHub.
3. Import the `frontend` directory into Vercel or initialize Firebase Hosting, setting `dist` as the build output directory.
