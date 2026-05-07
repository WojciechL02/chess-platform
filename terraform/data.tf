# Managed databases. Both use private IPs (no public exposure).
# This requires VPC peering between your VPC and Google's "service producer" VPC,
# done via google_service_networking_connection below.

# ---------------------------------------------------------------------------
# Private services access (one-time VPC peering setup)
# ---------------------------------------------------------------------------
resource "google_compute_global_address" "private_service_range" {
  name          = "chess-private-services"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

# ---------------------------------------------------------------------------
# Cloud SQL — PostgreSQL
# Replaces the local Postgres for users + games metadata.
# ---------------------------------------------------------------------------
resource "google_sql_database_instance" "postgres" {
  name             = "chess-postgres"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc]

  settings {
    tier              = "db-f1-micro"  # smallest. Bump to db-custom-2-4096 for real traffic.
    availability_type = "ZONAL"        # use "REGIONAL" for HA (failover replica). Costs ~2x.
    disk_size         = 10
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }
  }

  deletion_protection = false  # set to true once you have data you care about
}

resource "google_sql_database" "app" {
  name     = "chess"
  instance = google_sql_database_instance.postgres.name
}

# Application user. Password generated once and stored in Secret Manager.
resource "random_password" "db_password" {
  length  = 24
  special = true
}

resource "google_sql_user" "app" {
  name     = "chess_app"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

# ---------------------------------------------------------------------------
# Memorystore — Redis
# Replaces local Redis for matchmaking queue + live game state + rate limiting.
# ---------------------------------------------------------------------------
resource "google_redis_instance" "main" {
  name           = "chess-redis"
  tier           = "BASIC"   # "STANDARD_HA" for HA (~2x cost, has replica + failover)
  memory_size_gb = 1
  region         = var.region

  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version = "REDIS_7_2"

  depends_on = [google_service_networking_connection.private_vpc]
}

# ---------------------------------------------------------------------------
# Secret Manager — store DB password and JWT secret.
# Read in compute.tf and injected into containers as env vars.
# ---------------------------------------------------------------------------
resource "google_secret_manager_secret" "db_password" {
  secret_id = "chess-db-password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "chess-jwt-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

# Note: MONGO_URL (MongoDB Atlas) is external — store the URL itself in a secret
# and create the cluster in the Atlas UI / atlas-terraform-provider.
