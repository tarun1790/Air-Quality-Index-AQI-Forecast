import os
import time
import torch
import httpx
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from model import train_and_forecast_aqi
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import init_db, get_db, FavoriteCity, SearchLog

load_dotenv()
init_db()

app = FastAPI(title="Purple AQI Forecast API")

# Setup CORS to allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "purple-aqi-api", "timestamp": time.time()}

# In-Memory Cache Manager
class APICache:
    def __init__(self, ttl_seconds=3600):
        self.cache = {}
        self.ttl = ttl_seconds
        
    def get(self, lat: float, lon: float):
        # Round coordinates to 3 decimal places (~110m accuracy) for cache key matching
        key = (round(lat, 3), round(lon, 3))
        if key in self.cache:
            val, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return val
            else:
                del self.cache[key] # Cache expired
        return None
        
    def set(self, lat: float, lon: float, value: dict):
        key = (round(lat, 3), round(lon, 3))
        self.cache[key] = (value, time.time())

# Instantiate the cache (5 minutes TTL for fresh data)
api_cache = APICache(ttl_seconds=300)

async def reverse_geocode_async(lat: float, lon: float) -> str:
    """
    Asynchronously queries OpenStreetMap Nominatim for town/city name.
    """
    headers = {
        "User-Agent": "PurpleAQIForecast/2.0 (tarun1790@github.com)"
    }
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&zoom=14"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=2.0)
            if response.status_code == 200:
                addr = response.json().get("address", {})
                name = addr.get("town") or addr.get("village") or addr.get("suburb") or addr.get("city") or addr.get("neighbourhood") or addr.get("municipality")
                country = addr.get("country")
                if name and country:
                    return f"{name}, {country}"
                elif name:
                    return name
    except Exception as e:
        print(f"[Reverse Geocode Warning] Nominatim query failed: {e}")
    return None

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

def map_wmo_code(code: int):
    # Maps WMO weather code to OpenWeatherMap icon and description
    if code == 0: return "Clear Sky", "01d"
    elif code in [1, 2, 3]: return "Partly Cloudy", "03d"
    elif code in [45, 48]: return "Foggy", "50d"
    elif code in [51, 53, 55, 56, 57]: return "Drizzle", "09d"
    elif code in [61, 63, 65, 66, 67]: return "Rainy", "10d"
    elif code in [71, 73, 75, 77]: return "Snowy", "13d"
    elif code in [80, 81, 82]: return "Rain Showers", "09d"
    elif code in [85, 86]: return "Snow Showers", "13d"
    elif code in [95, 96, 99]: return "Thunderstorm", "11d"
    return "Cloudy", "03d"

async def fetch_weather_fallback_async(lat: float, lon: float) -> dict:
    """
    Asynchronously queries keyless Open-Meteo Forecast API for weather fallback metrics.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,visibility,weather_code",
        "timezone": "auto"
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=3.0)
            if response.status_code == 200:
                data = response.json().get("current", {})
                w_code = data.get("weather_code", 0)
                desc, icon = map_wmo_code(w_code)
                return {
                    "temp": data.get("temperature_2m", 0.0),
                    "humidity": data.get("relative_humidity_2m", 0),
                    "wind_speed": data.get("wind_speed_10m", 0.0) / 3.6, # Convert km/h to m/s to match OpenWeatherMap
                    "description": desc,
                    "icon": icon,
                    "pressure": data.get("surface_pressure", 1013),
                    "visibility": data.get("visibility", 10000)
                }
    except Exception as e:
        print(f"[Weather Fallback Warning] Open-Meteo forecast failed: {e}")
    return None

async def fetch_weather_async(lat: float, lon: float) -> dict:
    """
    Asynchronously queries OpenWeatherMap for current weather metrics.
    Falls back to keyless Open-Meteo Forecast API if OpenWeatherMap key is invalid (401) or fails.
    """
    if OPENWEATHER_API_KEY:
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric"
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=3.0)
                if response.status_code == 200:
                    w_data = response.json()
                    return {
                        "temp": w_data.get("main", {}).get("temp", 0.0),
                        "humidity": w_data.get("main", {}).get("humidity", 0),
                        "wind_speed": w_data.get("wind", {}).get("speed", 0.0),
                        "description": w_data.get("weather", [{}])[0].get("description", "N/A"),
                        "icon": w_data.get("weather", [{}])[0].get("icon", "01d"),
                        "pressure": w_data.get("main", {}).get("pressure", 1013),
                        "visibility": w_data.get("visibility", 10000)
                    }
                else:
                    print(f"[Weather API Warning] OpenWeatherMap returned {response.status_code}. Using keyless Open-Meteo fallback.")
        except Exception as e:
            print(f"[Weather API Warning] OpenWeatherMap request failed: {e}. Using keyless Open-Meteo fallback.")
            
    # Fallback to keyless Open-Meteo
    return await fetch_weather_fallback_async(lat, lon)

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
    "carbon_monoxide": 4000.0, # µg/m³
    "nitrogen_dioxide": 25.0,  # µg/m³
    "sulphur_dioxide": 40.0,   # µg/m³
    "ozone": 100.0     # µg/m³
}

@app.get("/api/air-quality")
async def get_air_quality(lat: float, lon: float, nocache: bool = Query(False), db: Session = Depends(get_db)):
    # 1. Check cache first unless explicitly requested to bypass
    if not nocache:
        cached_data = api_cache.get(lat, lon)
        if cached_data is not None:
            # Return a copy with updated metrics to indicate cache retrieval
            response_copy = dict(cached_data)
            response_copy["data_source"] = "In-Memory API Cache"
            response_copy["model_execution_time_ms"] = 0
            return response_copy

    # Cache miss - run dynamic pipeline
    start_time = time.time()
    
    # 2. Async call reverse geocoding to resolve nearby town/suburb name
    resolved_addr = await reverse_geocode_async(lat, lon)
    
    # Fetch weather data asynchronously from OpenWeatherMap using user's key
    weather_data = await fetch_weather_async(lat, lon)
    
    # 3. Async call Open-Meteo Air Quality API
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
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=5.0)
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
    times = hourly.get("time", [])
    us_aqi_hourly = hourly.get("us_aqi", [])
    pm25_hourly = hourly.get("pm2_5", [])
    
    # Find current time index in hourly array
    current_time_str = current.get("time", "")
    try:
        current_idx = times.index(current_time_str)
    except ValueError:
        current_idx = 30 * 24
        
    # Historical data splits
    history_aqi = us_aqi_hourly[:current_idx + 1]
    history_pm25 = pm25_hourly[:current_idx + 1]
    
    # Standard Physical Forecast (next 24 hours)
    physical_forecast_aqi = us_aqi_hourly[current_idx + 1: current_idx + 25]
    forecast_times = times[current_idx + 1: current_idx + 25]
    
    # Calculate Pearson Correlation between AQI and PM2.5 (dynamic data statistics)
    aqi_arr = np.array(history_aqi, dtype=np.float32)
    pm25_arr = np.array(history_pm25, dtype=np.float32)
    if len(aqi_arr) > 1 and len(pm25_arr) == len(aqi_arr):
        corr_matrix = np.corrcoef(aqi_arr, pm25_arr)
        corr_val = corr_matrix[0, 1]
        correlation = float(corr_val) if not np.isnan(corr_val) else 0.0
    else:
        correlation = 0.0
        
    # Trigger dynamic multivariate PyTorch model training (AQI + PM2.5) on GPU
    device_type = "GPU/CUDA" if torch.cuda.is_available() else "CPU"
    source_name = f"Dynamic PyTorch LSTM ({device_type})"
    
    print(f"[API] Initializing custom multivariate PyTorch LSTM training on {device_type}...")
    ai_forecast_aqi = train_and_forecast_aqi(history_aqi, history_pm25, forecast_length=24, input_seq_length=72, epochs=80)
    
    # Format hourly trends (past 7 days)
    past_7_days_idx = max(0, current_idx - 7 * 24)
    history_trend = []
    for idx in range(past_7_days_idx, current_idx + 1):
        history_trend.append({
            "time": times[idx],
            "us_aqi": us_aqi_hourly[idx],
            "pm2_5": pm25_hourly[idx] if pm25_hourly else 0,
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
        
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Create final response payload
    payload = {
        "latitude": lat,
        "longitude": lon,
        "resolved_address": resolved_addr,
        "timezone": data.get("timezone", "UTC"),
        "elevation": data.get("elevation", 0),
        "data_source": source_name,
        "model_execution_time_ms": duration_ms,
        "correlation_coefficient": round(correlation, 4),
        "weather": weather_data,
        "current": {
            "time": current.get("time"),
            "aqi": current_aqi_details,
            "pollutants": pollutants_details
        },
        "forecast_comparison": comparison_forecast,
        "history_trend": history_trend
    }
    
    # Cache the payload
    api_cache.set(lat, lon, payload)

    # Persist query in database
    try:
        log_entry = SearchLog(
            city_name=resolved_address or f"{round(lat, 2)}°N, {round(lon, 2)}°E",
            latitude=lat,
            longitude=lon,
            aqi=current_us_aqi,
            weather_desc=weather_data.get("description") if weather_data else None,
            temp=weather_data.get("temp") if weather_data else None
        )
        db.add(log_entry)
        db.commit()
    except Exception as db_err:
        print(f"[DB Log Warning] Failed to log search into database: {db_err}")
    
    return payload

@app.get("/api/search-cities")
async def search_cities(query: str = Query(..., min_length=2)):
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": query,
        "count": 6,
        "language": "en",
        "format": "json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=4.0)
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
            "admin1": city.get("admin1"),
            "latitude": city.get("latitude"),
            "longitude": city.get("longitude")
        })
    return formatted_results

@app.get("/api/compare-cities")
async def compare_cities(coords: str = Query(..., description="Format: lat,lon,name|lat,lon,name")):
    cities_data = []
    locations = coords.split("|")
    
    async with httpx.AsyncClient() as client:
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
                response = await client.get(url, params=params, timeout=4.0)
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
                print(f"[API Compare Error] Failed to fetch data for {name}: {e}")
                continue
                
    return cities_data

# --- Database Endpoints (Favorites & Search History) ---

@app.get("/api/favorites")
def get_favorites(db: Session = Depends(get_db)):
    """Returns all bookmarked favorite cities from the database."""
    favorites = db.query(FavoriteCity).order_by(FavoriteCity.created_at.desc()).all()
    return [{"id": f.id, "name": f.name, "latitude": f.latitude, "longitude": f.longitude, "created_at": f.created_at.isoformat()} for f in favorites]

@app.post("/api/favorites")
def add_favorite(name: str = Query(...), lat: float = Query(...), lon: float = Query(...), db: Session = Depends(get_db)):
    """Saves a city to the database favorites table."""
    existing = db.query(FavoriteCity).filter(FavoriteCity.name == name).first()
    if existing:
        return {"status": "already_exists", "id": existing.id}
    fav = FavoriteCity(name=name, latitude=lat, longitude=lon)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return {"status": "created", "id": fav.id, "name": fav.name}

@app.delete("/api/favorites/{fav_id}")
def delete_favorite(fav_id: int, db: Session = Depends(get_db)):
    """Removes a city from database favorites."""
    fav = db.query(FavoriteCity).filter(FavoriteCity.id == fav_id).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
    db.delete(fav)
    db.commit()
    return {"status": "deleted", "id": fav_id}

@app.get("/api/search-history")
def get_search_history(limit: int = 10, db: Session = Depends(get_db)):
    """Retrieves recent search queries logged into the database."""
    history = db.query(SearchLog).order_by(SearchLog.created_at.desc()).limit(limit).all()
    return [{
        "id": h.id,
        "city_name": h.city_name,
        "latitude": h.latitude,
        "longitude": h.longitude,
        "aqi": h.aqi,
        "weather_desc": h.weather_desc,
        "temp": h.temp,
        "timestamp": h.created_at.isoformat()
    } for h in history]

