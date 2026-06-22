@echo off
echo =============================================================
echo             Purple AQI Forecast Dashboard
echo =============================================================
echo.

echo [1/3] Starting FastAPI Backend on port 8000...
start "Purple AQI Backend API" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"

echo [2/3] Starting React + Vite Development server...
start "Purple AQI Frontend Dev" cmd /k "cd frontend && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 5 >nul

echo.
echo Launching browser to http://localhost:5173 ...
start http://localhost:5173

echo.
echo =============================================================
echo Purple AQI Forecast has started. You can close this window.
echo Keep the launched terminal windows open to keep the app running.
echo =============================================================
pause
