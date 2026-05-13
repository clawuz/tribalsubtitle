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
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 10 \
  --min-instances 0 \
  --max-instances 2 \
  --port 3020 \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT_KEY=FIREBASE_SERVICE_ACCOUNT_KEY:latest,FIREBASE_STORAGE_BUCKET=FIREBASE_STORAGE_BUCKET:latest" \
  --project "${PROJECT_ID}"

echo "=== Deploying Firebase Hosting ==="
firebase deploy --only hosting:tribalsubtitle --project "${PROJECT_ID}"

echo "=== Done! Live at: https://tribalsubtitle.web.app ==="
