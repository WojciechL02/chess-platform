variable "region" {
  type    = string
  default = "europe-north2"
}

variable "project_id" {
  type    = string
  default = "chess-platform-496620"
}

variable "postgres_url" {
  type    = string
  default = "<POSTGRES_URL>"
}

variable "redis_url" {
  type    = string
  default = "<REDIS_URL>"
}

variable "mongo_url" {
  type    = string
  default = "<MONGO_URL>"
}

variable "jwt_secret" {
  type    = string
  defult = "7fe0511af21c346fb5f7fadf4469372a"
}

# Users Service
resource "google_cloud_run_v2_service" "users_service" {
  name     = "users-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "europe-north2-docker.pkg.dev/${var.project_id}/chess-platform-repo/users-service:latest"
      ports {
        container_port = 8000
      }
      env {
        name  = "DATABASE_URL"
        value = var.postgres_url
      }
      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
      }
    }
  }
}
# Matchmaker
resource "google_cloud_run_v2_service" "matchmaker" {
  name     = "matchmaker"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "europe-north2-docker.pkg.dev/${var.project_id}/chess-platform-repo/matchmaker:latest"
      ports {
        container_port = 8000
      }
      env {
        name  = "REDIS_URL"
        value = var.redis_url
      }
      env {
        name  = "DATABASE_URL"
        value = var.postgres_url
      }
      env {
        name  = "USERS_SERVICE_URL"
        value = google_cloud_run_v2_service.users_service.uri
      }
      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
      }
    }
  }
}

# Game Service
resource "google_cloud_run_v2_service" "game_service" {
  name     = "game-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "europe-north2-docker.pkg.dev/${var.project_id}/chess-platform-repo/game-service:latest"
      ports {
        container_port = 8000
      }
      env {
        name  = "REDIS_URL"
        value = var.redis_url
      }
      env {
        name  = "DATABASE_URL"
        value = var.postgres_url
      }
      env {
        name  = "MONGO_URL"
        value = var.mongo_url
      }
      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
      }
    }
  }
}

# IAM: Allow Unauthenticated Access
resource "google_cloud_run_service_iam_member" "users_public" {
  location = google_cloud_run_v2_service.users_service.location
  service  = google_cloud_run_v2_service.users_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "matchmaker_public" {
  location = google_cloud_run_v2_service.matchmaker.location
  service  = google_cloud_run_v2_service.matchmaker.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "game_public" {
  location = google_cloud_run_v2_service.game_service.location
  service  = google_cloud_run_v2_service.game_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "users_service_uri" {
  value = google_cloud_run_v2_service.users_service.uri
}

output "matchmaker_uri" {
  value = google_cloud_run_v2_service.matchmaker.uri
}

output "game_service_uri" {
  value = google_cloud_run_v2_service.game_service.uri
}

# Frontend
resource "google_cloud_run_v2_service" "frontend" {
  name     = "frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "europe-north2-docker.pkg.dev/${var.project_id}/chess-platform-repo/frontend:latest"
      ports {
        container_port = 80
      }
    }
  }
}

resource "google_cloud_run_service_iam_member" "frontend_public" {
  location = google_cloud_run_v2_service.frontend.location
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
