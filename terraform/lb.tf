# External HTTPS Load Balancer
# Components, from the outside in:
#   forwarding-rule -> target-https-proxy -> url-map -> backend-service -> MIG

# 1. Public anycast IP for the LB.
resource "google_compute_global_address" "lb" {
  name = "chess-lb-ip"
}

# 2. One backend-service per microservice. The LB routes to these.
resource "google_compute_backend_service" "service" {
  for_each              = var.services
  name                  = "chess-${each.key}-backend"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  timeout_sec           = 3600 # IMPORTANT: long timeout for WebSockets
  health_checks         = [google_compute_health_check.service[each.key].id]

  backend {
    group           = google_compute_region_instance_group_manager.service[each.key].instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }
}

# 3. URL map: path-based routing.
#    Default = static frontend (React app from Cloud Storage).
#    API/WebSocket paths go to api-gateway.
#    Only api-gateway is exposed publicly; users/matchmaker/game-service sit behind it.
resource "google_compute_url_map" "main" {
  name            = "chess-url-map"
  default_service = google_compute_backend_bucket.frontend.id

  host_rule {
    hosts        = ["*"]
    path_matcher = "main"
  }

  path_matcher {
    name            = "main"
    default_service = google_compute_backend_bucket.frontend.id

    # API + WebSocket paths -> api-gateway
    path_rule {
      paths   = ["/auth/*", "/match/*", "/game/*", "/users/*", "/players/*", "/health"]
      service = google_compute_backend_service.service["api-gateway"].id
    }
  }
}

# 4. Managed SSL certificate (auto-renewed by Google).
#    Only works once `var.domain` points its A record at google_compute_global_address.lb.
resource "google_compute_managed_ssl_certificate" "main" {
  count = var.domain != "" ? 1 : 0
  name  = "chess-cert"
  managed {
    domains = [var.domain]
  }
}

# 5. HTTPS proxy + forwarding rule.
resource "google_compute_target_https_proxy" "main" {
  count            = var.domain != "" ? 1 : 0
  name             = "chess-https-proxy"
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main[0].id]
}

resource "google_compute_global_forwarding_rule" "https" {
  count                 = var.domain != "" ? 1 : 0
  name                  = "chess-https-fr"
  target                = google_compute_target_https_proxy.main[0].id
  port_range            = "443"
  ip_address            = google_compute_global_address.lb.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# Plain HTTP (for testing without a domain, and to redirect -> HTTPS in prod).
resource "google_compute_target_http_proxy" "main" {
  name    = "chess-http-proxy"
  url_map = google_compute_url_map.main.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "chess-http-fr"
  target                = google_compute_target_http_proxy.main.id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
