import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime, timezone
import numpy as np
from model import train_and_forecast_aqi

app = FastAPI(title="Air Quality Index (AQI) Forecast API")

# Setup CORS to allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants for AQI categories and advice
def get_aqi_details(aqi: float):
    aqi_val = int(round(aqi))
    if aqi_val <= 50:
        return {
            "level": aqi_val,
            "category": "Good",
            "color": "#10b981", # Emerald
            "bg_color": "rgba(16, 185, 129, 0.1)",
            "assessment": "Normal",
            "health_advisory": "Air quality is satisfactory, and air pollution poses little or no risk.",
            "precautions": {
                "outdoor_activities": "Great day to be active outdoors.",
                "sensitive_groups": "No special precautions needed.",
                "masks": "Not required.",
                "indoor_air": "Ventilate indoor spaces by keeping windows open."
            }
        }
    elif aqi_val <= 100:
        return {
            "level": aqi_val,
            "category": "Moderate",
            "color": "#f59e0b", # Amber
            "bg_color": "rgba(245, 158, 11, 0.1)",
            "assessment": "Acceptable",
            "health_advisory": "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.",
            "precautions": {
                "outdoor_activities": "Unusually sensitive people should consider reducing prolonged or heavy exertion.",
                "sensitive_groups": "Monitor symptoms. Asthma sufferers may need to take medication.",
                "masks": "Consider wearing a mask if you are highly sensitive.",
                "indoor_air": "Open windows for ventilation, but monitor dust/haze levels."
            }
        }
    elif aqi_val <= 150:
        return {
            "level": aqi_val,
            "category": "Unhealthy for Sensitive Groups",
            "color": "#f97316", # Orange
            "bg_color": "rgba(249, 115, 22, 0.1)",
            "assessment": "Poor",
            "health_advisory": "Members of sensitive groups (children, elderly, asthmatics) may experience health effects. The general public is less likely to be affected.",
            "precautions": {
                "outdoor_activities": "Sensitive groups should reduce outdoor activity. General public can continue normal activity.",
                "sensitive_groups": "Avoid prolonged outdoor activities. Keep rescue inhalers handy.",
                "masks": "Sensitive groups should wear N95 masks when spending extended time outdoors.",
                "indoor_air": "Close windows to reduce outdoor air entering. Run an air purifier if available."
            }
        }
    elif aqi_val <= 200:
        return {
            "level": aqi_val,
            "category": "Unhealthy",
            "color": "#ef4444", # Red
            "bg_color": "rgba(239, 68, 68, 0.1)",
            "assessment": "Bad",
            "health_advisory": "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.",
            "precautions": {
                "outdoor_activities": "Avoid or cut back on strenuous outdoor activities. Shift sports indoors.",
                "sensitive_groups": "Avoid all outdoor physical activity. Keep active indoors.",
                "masks": "N95/KN95 masks are highly recommended for anyone going outdoors.",
                "indoor_air": "Keep windows closed. Turn on air purifiers to full speed. Run AC on recirculate mode."
            }
        }
    elif aqi_val <= 300:
        return {
            "level": aqi_val,
            "category": "Very Unhealthy",
            "color": "#8b5cf6", # Violet
            "bg_color": "rgba(139, 92, 246, 0.1)",
            "assessment": "Very Bad",
            "health_advisory": "Health alert: The risk of health effects is increased for everyone, indicating potential emergency conditions.",
            "precautions": {
                "outdoor_activities": "Avoid all outdoor activities. Remain indoors as much as possible.",
                "sensitive_groups": "Stay in a clean room indoors. Avoid any physical exertion.",
                "masks": "N95 masks are mandatory for any essential outdoor travel.",
                "indoor_air": "Keep windows shut tight. Use HEPA air purifiers. Avoid frying food or burning candles indoors."
            }
        }
    else:
        return {
            "level": aqi_val,
            "category": "Hazardous",
            "color": "#7f1d1d", # Dark Red/Maroon
            "bg_color": "rgba(127, 29, 29, 0.1)",
            "assessment": "Severe",
            "health_advisory": "Health warning of emergency conditions: Everyone is more likely to experience serious health effects.",
            "precautions": {
                "outdoor_activities": "Do not go outdoors. Remain strictly indoors.",
                "sensitive_groups": "Remain strictly inside. Use air purifiers and medical respirators if necessary.",
                "masks": "Avoid going out. If absolutely necessary, wear a high-grade respirator (N95/FFP2).",
                "indoor_air": "Seal windows and doors if possible. Run multiple air purifiers. Use indoor air conditioning."
            }
        }

# WHO 24-hour guidelines
WHO_GUIDELINES = {
    "pm2_5": 15.0,     # µg/m³
    "pm10": 45.0,      # µg/m³
    "carbon_monoxide": 4000.0, # µg/m³ (4 mg/m³)
    "nitrogen_dioxide": 25.0,  # µg/m³
    "sulphur_dioxide": 40.0,   # µg/m³
    "ozone": 100.0     # µg/m³
}

@app.get("/api/air-quality")
def get_air_quality(lat: float, lon: float):
    # Call Open-Meteo Air Quality API
    url = f"https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "us_aqi,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
        "hourly": "us_aqi,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
        "past_days": 30,
        "timezone": "auto"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch air quality data from Open-Meteo: {e}")
        
    current = data.get("current", {})
    hourly = data.get("hourly", {})
    
    if not current or not hourly:
        raise HTTPException(status_code=500, detail="Incomplete data returned by Open-Meteo")
        
    # Get current AQI and classifications
    current_us_aqi = current.get("us_aqi", 0)
    current_aqi_details = get_aqi_details(current_us_aqi)
    
    # Calculate WHO comparisons
    pollutants = ["pm2_5", "pm10", "carbon_monoxide", "nitrogen_dioxide", "sulphur_dioxide", "ozone"]
    pollutants_details = {}
    for p in pollutants:
        val = current.get(p, 0.0)
        who_limit = WHO_GUIDELINES.get(p, 1.0)
        ratio = (val / who_limit) * 100
        pollutants_details[p] = {
            "value": val,
            "who_limit": who_limit,
            "percentage_of_limit": round(ratio, 1),
            "status": "Exceeded" if ratio > 100 else "Safe"
        }
        
    # Prepare historical data for training PyTorch model (past 30 days)
    # Open-Meteo hourly contains past 30 days + 7 days forecast.
    # The API returns them in chronological order. We can split history vs forecast based on the current time index.
    times = hourly.get("time", [])
    us_aqi_hourly = hourly.get("us_aqi", [])
    
    # Find current time index in hourly array
    current_time_str = current.get("time", "")
    try:
        current_idx = times.index(current_time_str)
    except ValueError:
        # Fallback to splitting by 30 days * 24 hours
        current_idx = 30 * 24
        
    # Historical AQI is everything up to the current index
    history_aqi = us_aqi_hourly[:current_idx + 1]
    history_times = times[:current_idx + 1]
    
    # Standard Physical Forecast is the remaining hours (next 7 days, but let's grab next 24 hours for direct comparison)
    physical_forecast_aqi = us_aqi_hourly[current_idx + 1: current_idx + 25]
    forecast_times = times[current_idx + 1: current_idx + 25]
    
    # Trigger PyTorch dynamic model training on CUDA
    print(f"[API] Initializing custom PyTorch LSTM forecast model training for lat: {lat}, lon: {lon}...")
    ai_forecast_aqi = train_and_forecast_aqi(history_aqi, forecast_length=24, input_seq_length=72, epochs=80)
    
    # Format hourly trends (e.g. past 7 days for the history chart)
    past_7_days_idx = max(0, current_idx - 7 * 24)
    history_trend = []
    for idx in range(past_7_days_idx, current_idx + 1):
        history_trend.append({
            "time": times[idx],
            "us_aqi": us_aqi_hourly[idx],
            "pm2_5": hourly.get("pm2_5", [])[idx] if hourly.get("pm2_5") else 0,
            "pm10": hourly.get("pm10", [])[idx] if hourly.get("pm10") else 0
        })
        
    # Format comparison forecasts (next 24 hours)
    comparison_forecast = []
    for i in range(min(len(forecast_times), len(ai_forecast_aqi), len(physical_forecast_aqi))):
        comparison_forecast.append({
            "time": forecast_times[i],
            "ai_aqi": round(ai_forecast_aqi[i], 1),
            "physical_aqi": physical_forecast_aqi[i]
        })
        
    return {
        "latitude": lat,
        "longitude": lon,
        "timezone": data.get("timezone", "UTC"),
        "elevation": data.get("elevation", 0),
        "current": {
            "time": current.get("time"),
            "aqi": current_aqi_details,
            "pollutants": pollutants_details
        },
        "forecast_comparison": comparison_forecast,
        "history_trend": history_trend
    }

@app.get("/api/search-cities")
def search_cities(query: str = Query(..., min_length=2)):
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": query,
        "count": 6,
        "language": "en",
        "format": "json"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to query Geocoding API: {e}")
        
    results = data.get("results", [])
    formatted_results = []
    for city in results:
        formatted_results.append({
            "name": city.get("name"),
            "country": city.get("country"),
            "admin1": city.get("admin1"), # State / Region
            "latitude": city.get("latitude"),
            "longitude": city.get("longitude")
        })
    return formatted_results

@app.get("/api/compare-cities")
def compare_cities(coords: str = Query(..., description="Format: lat,lon,name|lat,lon,name")):
    """
    Fetches the current AQI for multiple locations for side-by-side comparison.
    """
    cities_data = []
    locations = coords.split("|")
    
    for loc in locations:
        if not loc:
            continue
        try:
            lat_str, lon_str, name = loc.split(",")
            lat, lon = float(lat_str), float(lon_str)
        except Exception:
            continue
            
        url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "us_aqi,pm2_5,pm10",
            "timezone": "auto"
        }
        
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                res_data = response.json()
                current = res_data.get("current", {})
                aqi_val = current.get("us_aqi", 0)
                details = get_aqi_details(aqi_val)
                cities_data.append({
                    "name": name,
                    "latitude": lat,
                    "longitude": lon,
                    "aqi": aqi_val,
                    "category": details["category"],
                    "color": details["color"],
                    "assessment": details["assessment"],
                    "pm2_5": current.get("pm2_5", 0.0),
                    "pm10": current.get("pm10", 0.0)
                })
        except Exception as e:
            # Skip cities that fail to fetch rather than crashing the whole call
            print(f"[API Compare Error] Failed to fetch data for {name}: {e}")
            continue
            
    return cities_data
