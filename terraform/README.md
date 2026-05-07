# Terraform infrastructure (GCP)

Deploys the chess platform on GCP:
- External HTTPS Load Balancer (single public IP)
- Auto-scaling Managed Instance Groups per microservice
- Cloud SQL (Postgres) — private IP only
- Memorystore (Redis) — private IP only
- Cloud Storage + Cloud CDN for the React frontend
- Secret Manager for DB password and JWT secret

## Prerequisites
- `gcloud` CLI authenticated (`gcloud auth application-default login`)
- A GCP project with billing enabled
- These APIs enabled in that project:
  - `compute.googleapis.com`
  - `sqladmin.googleapis.com`
  - `redis.googleapis.com`
  - `secretmanager.googleapis.com`
  - `servicenetworking.googleapis.com`
  - `storage.googleapis.com`
  - `artifactregistry.googleapis.com`
- Terraform >= 1.5

## Layout
| File | What's in it |
|------|--------------|
| `main.tf` | provider config |
| `variables.tf` | input vars (`project_id`, region, per-service scaling) |
| `network.tf` | VPC, subnets, firewall rules |
| `compute.tf` | instance template + MIG + autoscaler + health check per service |
| `lb.tf` | external HTTPS LB, URL map, SSL cert |
| `data.tf` | Cloud SQL, Memorystore, Secret Manager, VPC peering |
| `frontend.tf` | Cloud Storage bucket + CDN-enabled backend bucket |
| `outputs.tf` | LB IP, bucket name, DB/Redis private IPs |

## Deployment runbook

### 1. Build and push container images
The MIGs pull `gcr.io/<project>/<service>:latest` for each service. Build them
from the `backend/` directory (build context = backend/):

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
cd terraform
terraform init
terraform apply -var="project_id=$PROJECT"
```

This will take ~15–20 min the first time (Cloud SQL is slow to provision).

### 3. Build and upload the frontend
```bash
cd frontend
# Set VITE_API_URL to the LB IP (or your domain) before building
echo "VITE_API_URL=http://$(terraform -chdir=../terraform output -raw load_balancer_ip)" > .env.production
npm run build

gsutil -m rsync -d -r dist/ gs://$(terraform -chdir=../terraform output -raw frontend_bucket)/
```

### 4. (Optional) Add a domain
If you set `var.domain`, create an A record pointing to the LB IP. Google will
auto-provision a managed SSL cert (takes 15-60 min to become ACTIVE).

## What's still missing / next steps
1. **Database migrations** — run alembic against the Cloud SQL instance via a
   one-shot job or a bastion VM the first time.
2. **Internal load balancing** — currently api-gateway connects to other services
   via direct MIG IPs (won't work as-is). Add internal regional HTTPS LBs per
   downstream service, or use service discovery (Consul, etc.).
3. **Cloud NAT** — needed if private VMs must reach the internet (e.g., MongoDB
   Atlas). Add `google_compute_router` + `google_compute_router_nat`.
4. **CI/CD** — automate steps 1 + 3 via GitHub Actions / Cloud Build.
5. **Observability** — Cloud Logging works out of the box; add custom metrics
   for game-service (active games, queue depth) via Cloud Monitoring.
