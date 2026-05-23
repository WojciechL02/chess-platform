# _Chess.com_-like platform

## Installation:
Fill-in the `./backend/.env` and `./frontend/.env` files.

### Backend:
```bash
cd backend
uv sync
```
### Frontend:
```bash
   7 cd frontend
   8 npm install
```

### Deploy:
To test locally:
```bash
docker compose down
docker compose up --build
./docker-push.sh
```

to setup docker on GCP:
```bash
gcloud services enable run.googleapis.com compute.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create chess-platform-repo --repository-format=docker --location=europe-north2 --description="Docker repository for Chess Platform" --project=chess-platform-496620
gcloud auth configure-docker europe-north2-docker.pkg.dev
./docker-push.sh
```

## How to run:
### Backend:
Each of these in new terminal:
```bash
cd backend
uv run -- fastapi dev services/api-gateway/app/main.py --port 8000
uv run -- fastapi dev services/users-service/app/main.py --port 8001
uv run -- fastapi dev services/matchmaker/app/main.py --port 8002
uv run -- fastapi dev services/game-service/app/main.py --port 8003
```

### Client-side:
```bash
cd frontend
npm run dev
```
