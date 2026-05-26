# _Chess.com_-like platform

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (for local Docker runs and image builds)
- [uv](https://docs.astral.sh/uv/) (Python backend)
- [Node.js](https://nodejs.org/) (frontend)
- [Terraform](https://developer.hashicorp.com/terraform/install) (GCP deployment)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install), authenticated against your GCP project (`gcloud auth login` and `gcloud auth application-default login`)
- [Stockfish](https://stockfishchess.org/) chess engine (only needed when running `analysis-service` outside Docker):
  ```bash
  brew install stockfish     # macOS
  # or: apt install stockfish # Debian/Ubuntu
  ```
  Set `STOCKFISH_PATH` in `./backend/.env` if it isn't on `$PATH`.

## Environment files
For each `.env_example` file in the repo, copy it to `.env` in the same directory and fill in the values:
```bash
cp backend/.env_example backend/.env
cp frontend/.env_example frontend/.env
cp terraform/.env_example terraform/.env
```

## Local development

### Install dependencies
```bash
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
```

### Run services (one per terminal)
```bash
cd backend
uv run -- fastapi dev services/api-gateway/app/main.py --port 8000
uv run -- fastapi dev services/users-service/app/main.py --port 8001
uv run -- fastapi dev services/matchmaker/app/main.py --port 8002
uv run -- fastapi dev services/game-service/app/main.py --port 8003
uv run -- fastapi dev services/analysis-service/app/main.py --port 8004
```

### Run frontend
```bash
cd frontend
npm run dev
```

### Or run everything via Docker
```bash
docker compose up --build
```

## Deploy to GCP

### One-time setup
```bash
source terraform/.env  # exports GCP_PROJECT_ID, GCP_REGION, and TF_VAR_*

gcloud services enable \
  run.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  --project="$GCP_PROJECT_ID"

gcloud artifacts repositories create chess-platform-repo \
  --repository-format=docker \
  --location="$GCP_REGION" \
  --description="Docker repository for Chess Platform" \
  --project="$GCP_PROJECT_ID"

gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev"
```

The HTTPS load balancer in `terraform/lb.tf` expects `server.key` and `server.crt` at the repo root. Generate a self-signed pair for testing, or supply your own:
```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 365 -subj "/CN=chess-platform"
```

### Deploy
```bash
source terraform/.env   # exports GCP_PROJECT_ID, GCP_REGION, TF_VAR_*

# 1. Build linux/amd64 images and push to Artifact Registry
./docker-push.sh

# 2. Provision Cloud Run services + load balancer
cd terraform
terraform init
terraform apply
```

After `terraform apply` finishes, the load balancer's public IP is printed as the `lb_ip_address` output.

### Redeploying after code changes
```bash
./docker-push.sh
# Cloud Run pulls :latest on next request; force a new revision with:
gcloud run services update users-service --region="$GCP_REGION" --project="$GCP_PROJECT_ID"
# (repeat for matchmaker, game-service, analysis-service, frontend)
```

### Tear down (stop billing)
The load balancer's forwarding rules and reserved static IP bill 24/7 even when there's no traffic. To stop the meter, destroy everything Terraform created:
```bash
cd terraform
source .env
terraform destroy
```

Cloud Run itself only bills per request (idle = free), and the Artifact Registry repo costs pennies in storage — neither requires action.
