# Internal passthrough TCP load balancers for backend services.
# api-gateway calls users-service / matchmaker / game-service via HTTP.
# These give each backend a stable internal IP that load-balances across
# all instances in the MIG.
#
# Architecture:
#   api-gateway ──http──► <internal LB IP>:port ──► one of N backend MIG VMs
#
# We exclude api-gateway itself (it's only reachable via the external LB).

locals {
  internal_services = { for k, v in var.services : k => v if k != "api-gateway" }
}

# Regional health check (the global one we already have can't be used by
# INTERNAL passthrough backend services — they need regional).
resource "google_compute_region_health_check" "internal" {
  for_each = local.internal_services
  name     = "chess-${each.key}-rhc"
  region   = var.region

  http_health_check {
    port         = each.value.port
    request_path = "/health"
  }

  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3
}

resource "google_compute_region_backend_service" "internal" {
  for_each              = local.internal_services
  name                  = "chess-${each.key}-internal-bs"
  region                = var.region
  protocol              = "TCP"
  load_balancing_scheme = "INTERNAL"
  health_checks         = [google_compute_region_health_check.internal[each.key].id]

  backend {
    group = google_compute_region_instance_group_manager.service[each.key].instance_group
  }
}

# Reserved internal IPs so the addresses don't change between applies.
resource "google_compute_address" "internal_lb" {
  for_each     = local.internal_services
  name         = "chess-${each.key}-internal-ip"
  region       = var.region
  subnetwork   = google_compute_subnetwork.main.id
  address_type = "INTERNAL"
}

resource "google_compute_forwarding_rule" "internal" {
  for_each              = local.internal_services
  name                  = "chess-${each.key}-internal-fr"
  region                = var.region
  load_balancing_scheme = "INTERNAL"
  backend_service       = google_compute_region_backend_service.internal[each.key].id
  ip_address            = google_compute_address.internal_lb[each.key].address
  ports                 = [each.value.port]
  network               = google_compute_network.main.id
  subnetwork            = google_compute_subnetwork.main.id
}
