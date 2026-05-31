#!/bin/bash
set -e

PROJECT_ID=${GCP_PROJECT_ID:?GCP_PROJECT_ID not set}
REGION=${GCP_REGION:?GCP_REGION not set}
REPO="chess-platform-repo"
BASE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

docker buildx build --platform linux/amd64 --push \
  -t "$BASE_URL/users-service:latest" \
  -f backend/services/users-service/Dockerfile \
  ./backend

docker buildx build --platform linux/amd64 --push \
  -t "$BASE_URL/game-service:latest" \
  -f backend/services/game-service/Dockerfile \
  ./backend

docker buildx build --platform linux/amd64 --push \
  -t "$BASE_URL/matchmaker:latest" \
  -f backend/services/matchmaker/Dockerfile \
  ./backend

docker buildx build --platform linux/amd64 --push \
  -t "$BASE_URL/analysis-service:latest" \
  -f backend/services/analysis-service/Dockerfile \
  ./backend

docker buildx build --platform linux/amd64 --push \
  -t "$BASE_URL/frontend:latest" \
  ./frontend
