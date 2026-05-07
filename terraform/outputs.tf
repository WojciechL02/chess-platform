output "load_balancer_ip" {
  value       = google_compute_global_address.lb.address
  description = "Public IP of the load balancer. Point your domain's A record here."
}

output "service_migs" {
  value = {
    for k, v in google_compute_region_instance_group_manager.service : k => v.instance_group
  }
  description = "MIG self-links per service (for debugging)."
}

output "frontend_bucket" {
  value       = google_storage_bucket.frontend.name
  description = "Upload the built React app here: gsutil -m rsync -d -r frontend/dist/ gs://<this>/"
}

output "postgres_private_ip" {
  value       = google_sql_database_instance.postgres.private_ip_address
  description = "Internal IP of Cloud SQL Postgres. Use in DATABASE_URL."
}

output "redis_host" {
  value       = google_redis_instance.main.host
  description = "Internal IP of Memorystore Redis. Use in REDIS_URL."
  sensitive   = false
}

output "redis_port" {
  value = google_redis_instance.main.port
}
