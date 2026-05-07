# For each microservice we create:
#   1. an Instance Template (the "blueprint" for a VM)
#   2. a Managed Instance Group (MIG) (the running fleet)
#   3. an Autoscaler (scales the MIG up/down)
#
# Container images are pulled from gcr.io/<project>/<service>:latest. Build them
# with the Dockerfiles in backend/services/<name>/Dockerfile and push before
# applying.

# ---------------------------------------------------------------------------
# Service account that VMs run as. Has just enough permissions to pull images
# and (optionally) read secrets.
# ---------------------------------------------------------------------------
resource "google_service_account" "vm_sa" {
  account_id   = "chess-vm"
  display_name = "Chess platform VM service account"
}

resource "google_project_iam_member" "vm_sa_pull_images" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.vm_sa.email}"
}

resource "google_project_iam_member" "vm_sa_logs" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.vm_sa.email}"
}

resource "google_project_iam_member" "vm_sa_metrics" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.vm_sa.email}"
}

# ---------------------------------------------------------------------------
# Per-service env var construction.
# The internal LB IPs and DB/Redis hosts only exist after those resources are
# created — Terraform's reference graph handles the dependency ordering.
#
# NOTE: env vars in the COS container declaration are visible in instance
# metadata to anyone with compute.instances.get. For a course/demo this is
# fine. For prod, fetch from Secret Manager at runtime in the app code.
# ---------------------------------------------------------------------------
locals {
  database_url = "postgresql+asyncpg://${google_sql_user.app.name}:${random_password.db_password.result}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.app.name}"
  redis_url    = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}"

  service_env = {
    "api-gateway" = [
      { name = "REDIS_URL", value = local.redis_url },
      { name = "USERS_SERVICE_URL", value = "http://${google_compute_address.internal_lb["users-service"].address}:8001" },
      { name = "MATCHMAKING_SERVICE_URL", value = "http://${google_compute_address.internal_lb["matchmaker"].address}:8002" },
      { name = "GAME_SERVICE_URL", value = "http://${google_compute_address.internal_lb["game-service"].address}:8003" },
    ]
    "users-service" = [
      { name = "DATABASE_URL", value = local.database_url },
      { name = "JWT_SECRET", value = random_password.jwt_secret.result },
    ]
    "matchmaker" = [
      { name = "REDIS_URL", value = local.redis_url },
      { name = "DATABASE_URL", value = local.database_url },
    ]
    "game-service" = [
      { name = "REDIS_URL", value = local.redis_url },
      { name = "DATABASE_URL", value = local.database_url },
      { name = "MONGO_URL", value = var.mongo_url },
    ]
  }
}

resource "google_compute_instance_template" "service" {
  for_each     = var.services
  name_prefix  = "chess-${each.key}-"
  machine_type = each.value.machine_type
  tags         = ["chess-backend"]

  disk {
    source_image = "cos-cloud/cos-stable"
    auto_delete  = true
    boot         = true
  }

  network_interface {
    network    = google_compute_network.main.id
    subnetwork = google_compute_subnetwork.main.id
    # No access_config{} = no public IP. Egress goes through Cloud NAT.
  }

  service_account {
    email  = google_service_account.vm_sa.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    # COS reads this and launches the container at boot.
    "gce-container-declaration" = yamlencode({
      spec = {
        containers = [{
          name  = each.key
          image = "gcr.io/${var.project_id}/${each.key}:latest"
          ports = [{ containerPort = each.value.port }]
          env   = local.service_env[each.key]
        }]
        restartPolicy = "Always"
      }
    })

    # Send container stdout/stderr to Cloud Logging.
    google-logging-enabled = "true"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_region_instance_group_manager" "service" {
  for_each           = var.services
  name               = "chess-${each.key}-mig"
  base_instance_name = "chess-${each.key}"
  region             = var.region

  version {
    instance_template = google_compute_instance_template.service[each.key].id
  }

  named_port {
    name = "http"
    port = each.value.port
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.service[each.key].id
    initial_delay_sec = 60
  }
}

resource "google_compute_region_autoscaler" "service" {
  for_each = var.services
  name     = "chess-${each.key}-as"
  region   = var.region
  target   = google_compute_region_instance_group_manager.service[each.key].id

  autoscaling_policy {
    min_replicas    = each.value.min_replicas
    max_replicas    = each.value.max_replicas
    cooldown_period = 60

    cpu_utilization {
      target = each.value.target_cpu
    }
  }
}

resource "google_compute_health_check" "service" {
  for_each = var.services
  name     = "chess-${each.key}-hc"

  http_health_check {
    port         = each.value.port
    request_path = "/health"
  }

  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3
}
