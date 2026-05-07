variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  default     = "europe-central2"
  description = "GCP region (Warsaw is europe-central2; change to your closest region)"
}

variable "zone" {
  type        = string
  default     = "europe-central2-a"
}

variable "domain" {
  type        = string
  default     = ""
  description = "Optional domain name for the LB (e.g., chess.example.com). Leave empty to use a managed cert with the LB IP only."
}

variable "mongo_url" {
  type        = string
  sensitive   = true
  description = "MongoDB Atlas connection string (mongodb+srv://...). Create the cluster in Atlas, then pass via -var or .tfvars."
}

# Per-service scaling configuration
variable "services" {
  type = map(object({
    machine_type = string
    min_replicas = number
    max_replicas = number
    target_cpu   = number
    port         = number
  }))
  default = {
    "api-gateway" = {
      machine_type = "e2-small"
      min_replicas = 1
      max_replicas = 5
      target_cpu   = 0.6
      port         = 8000
    }
    "users-service" = {
      machine_type = "e2-small"
      min_replicas = 1
      max_replicas = 3
      target_cpu   = 0.6
      port         = 8001
    }
    "matchmaker" = {
      # Pinned to 1 replica: the matchmaking worker reads/writes a shared Redis
      # queue and would race with itself if scaled. Connections fan-out is
      # already correct via Redis pub/sub (see app/main.py:listen_for_matches),
      # but the worker is not idempotent. Single replica is the simple fix.
      machine_type = "e2-small"
      min_replicas = 1
      max_replicas = 1
      target_cpu   = 0.6
      port         = 8002
    }
    "game-service" = {
      machine_type = "e2-medium"
      min_replicas = 2
      max_replicas = 10
      target_cpu   = 0.6
      port         = 8003
    }
  }
}
