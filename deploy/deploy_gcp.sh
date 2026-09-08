#!/bin/bash
set -e

echo "============================================================"
echo "  Purple AQI Forecast — Google Cloud Run Deployment"
echo "============================================================"

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "[Error] Google Cloud SDK ('gcloud') is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo "[Error] No active Google Cloud project selected."
    echo "Run: gcloud auth login && gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "Deploying to Google Cloud Project: $PROJECT_ID"

# Enable necessary Google Cloud APIs
echo "[1/3] Enabling Cloud Run and Cloud Build APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# Deploy container directly from source to Cloud Run
echo "[2/3] Building and deploying container to Cloud Run..."
gcloud run deploy purple-aqi-app \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 1 \
    --set-env-vars DATABASE_URL="sqlite:///./aqi_database.db"

echo "[3/3] Deployment Successful!"
SERVICE_URL=$(gcloud run services describe purple-aqi-app --platform managed --region us-central1 --format 'value(status.url)')
echo "Your live Google Cloud URL: $SERVICE_URL"
echo ""
echo "To map your custom domain in Google Cloud:"
echo "gcloud beta run domain-mappings create --service purple-aqi-app --domain yourcustomdomain.com --region us-central1"
echo "============================================================"
