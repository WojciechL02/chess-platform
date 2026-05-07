# Terraform infrastructure (GCP)

Deploys the chess platform on GCP:
- External HTTPS Load Balancer (single public IP, also serves the React app)
- Auto-scaling Managed Instance Groups per microservice
- Internal passthrough TCP load balancers for service-to-service traffic
- Cloud SQL (Postgres) — private IP only
- Memorystore (Redis) — private IP only
- Cloud Storage + Cloud CDN for the React frontend
- Cloud NAT (so private VMs can reach MongoDB Atlas, GCR, etc.)
- Secret Manager for DB password and JWT secret
- Dedicated service account for VMs (least privilege)

## Prerequisites
- `gcloud` CLI authenticated (`gcloud auth application-default login`)
- A GCP project with billing enabled
- A MongoDB Atlas cluster (free tier is fine) with `0.0.0.0/0` allowed in
  Network Access (or add the Cloud NAT IP after deploy)
- These APIs enabled in your project:
  ```
  gcloud services enable \
    compute.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    secretmanager.googleapis.com \
    servicenetworking.googleapis.com \
    storage.googleapis.com \
    artifactregistry.googleapis.com \
    cloudresourcemanager.googleapis.com
  ```
- Terraform >= 1.5

## Deployment runbook

### 1. Build and push container images
```bash
cd backend
PROJECT=your-gcp-project-id
gcloud auth configure-docker gcr.io

for svc in api-gateway users-service matchmaker game-service; do
  docker build -f services/$svc/Dockerfile -t gcr.io/$PROJECT/$svc:latest .
  docker push gcr.io/$PROJECT/$svc:latest
done
```

### 2. Apply Terraform
```bash
cd ../terraform
terraform init
terraform apply \
  -var="project_id=$PROJECT" \
  -var="mongo_url=mongodb+srv://USER:PASS@cluster.mongodb.net/chess_db?retryWrites=true&w=majority"
```

This will take ~15-20 min the first time (Cloud SQL is slow to provision).

### 3. Run database migrations
The Cloud SQL instance is empty. Use the Cloud SQL Auth Proxy from your laptop:

```bash
# Install: https://cloud.google.com/sql/docs/postgres/sql-proxy
CONN_NAME=$(terraform output -raw postgres_connection_name)
DB_PASS=$(terraform output -raw db_app_password)

# In one terminal: open a tunnel
cloud-sql-proxy $CONN_NAME --port 5432

# In another terminal: run alembic
cd ../backend
DATABASE_URL="postgresql+asyncpg://chess_app:${DB_PASS}@127.0.0.1:5432/chess" \
  uv run alembic -c services/users-service/alembic.ini upgrade head
DATABASE_URL="postgresql+asyncpg://chess_app:${DB_PASS}@127.0.0.1:5432/chess" \
  uv run alembic -c services/game-service/alembic.ini upgrade head
```

### 4. Build and upload the frontend
```bash
cd ../frontend
LB_IP=$(terraform -chdir=../terraform output -raw load_balancer_ip)
echo "VITE_API_URL=http://${LB_IP}" > .env.production
npm run build

BUCKET=$(terraform -chdir=../terraform output -raw frontend_bucket)
gsutil -m rsync -d -r dist/ gs://${BUCKET}/
```

### 5. Open the app
```bash
echo "http://$(terraform -chdir=../terraform output -raw load_balancer_ip)"
```

## Operational tips

- **Logs:** `gcloud logging read "resource.type=gce_instance" --limit 50` or use the Cloud Console "Logs Explorer".
- **Restart a service after image rebuild:**
  ```bash
  gcloud compute instance-groups managed rolling-action replace \
    chess-game-service-mig --region=$REGION
  ```
- **Cost control:** stop the resources when not demoing.
  ```bash
  terraform destroy -var="project_id=$PROJECT" -var="mongo_url=..."
  ```
  Total monthly burn while running: roughly $50-80 with default sizes.

## Known limitations / next steps
- Env vars in container metadata are visible to anyone with `compute.instances.get`.
  Production: fetch from Secret Manager at runtime in app code.
- HTTPS requires a real domain (set `var.domain`). With just an IP, only HTTP
  works (browser may warn about insecure WebSocket on `ws://`).
- No CI/CD; image builds are manual. Wire up Cloud Build or GitHub Actions next.
- `0.0.0.0/0` in MongoDB Atlas is convenient but insecure. Once deployed, copy
  the Cloud NAT public IP from the Console and lock it down to that.
