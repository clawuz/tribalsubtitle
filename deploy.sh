#!/bin/bash
set -e

PROJECT_ID="tribalsubtitle"
SERVICE="tribalsubtitle"
REGION="us-central1"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE}"

echo "=== Building Docker image via Cloud Build ==="
gcloud builds submit . \
  --tag "${IMAGE}" \
  --project "${PROJECT_ID}"

echo "=== Deploying to Cloud Run ==="
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --memory 8Gi \
  --cpu 2 \
  --timeout 3600 \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 2 \
  --port 3020 \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT_KEY=FIREBASE_SERVICE_ACCOUNT_KEY:latest,FIREBASE_STORAGE_BUCKET=FIREBASE_STORAGE_BUCKET:latest,GROQ_API_KEY=GROQ_API_KEY:latest" \
  --project "${PROJECT_ID}"

echo "=== Deploying Firebase Hosting + Storage Rules ==="
firebase deploy --only hosting:tribalsubtitle,storage --project "${PROJECT_ID}"

echo "=== Done! Live at: https://tribalsubtitle.web.app ==="
