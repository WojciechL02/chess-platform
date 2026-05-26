resource "google_compute_address" "lb_ip" {
  name         = "chess-lb-ip"
  region       = var.region
  network_tier = "STANDARD"
}

# Serverless NEGs for each Cloud Run service
resource "google_compute_region_network_endpoint_group" "users_neg" {
  name                  = "users-service-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = "users-service"
  }
}

resource "google_compute_region_network_endpoint_group" "matchmaker_neg" {
  name                  = "matchmaker-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = "matchmaker"
  }
}

resource "google_compute_region_network_endpoint_group" "game_neg" {
  name                  = "game-service-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = "game-service"
  }
}

resource "google_compute_region_network_endpoint_group" "frontend_neg" {
  name                  = "frontend-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = "frontend"
  }
}

# Services
resource "google_compute_region_backend_service" "users_backend" {
  name                  = "users-backend"
  region                = var.region
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group           = google_compute_region_network_endpoint_group.users_neg.id
    capacity_scaler = 1.0
    balancing_mode  = "UTILIZATION"
  }
}

resource "google_compute_region_backend_service" "matchmaker_backend" {
  name                  = "matchmaker-backend"
  region                = var.region
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group           = google_compute_region_network_endpoint_group.matchmaker_neg.id
    capacity_scaler = 1.0
    balancing_mode  = "UTILIZATION"
  }
}

resource "google_compute_region_backend_service" "game_backend" {
  name                  = "game-backend"
  region                = var.region
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group           = google_compute_region_network_endpoint_group.game_neg.id
    capacity_scaler = 1.0
    balancing_mode  = "UTILIZATION"
  }
}

resource "google_compute_region_backend_service" "frontend_backend" {
  name                  = "frontend-backend"
  region                = var.region
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group           = google_compute_region_network_endpoint_group.frontend_neg.id
    capacity_scaler = 1.0
    balancing_mode  = "UTILIZATION"
  }
}

# URL Map
resource "google_compute_region_url_map" "lb_url_map" {
  name            = "chess-lb-url-map"
  region          = var.region
  default_service = google_compute_region_backend_service.frontend_backend.id

  host_rule {
    hosts        = ["*"]
    path_matcher = "all-paths"
  }

  path_matcher {
    name            = "all-paths"
    default_service = google_compute_region_backend_service.frontend_backend.id

    path_rule {
      paths   = ["/auth/*", "/users/*", "/players/*"]
      service = google_compute_region_backend_service.users_backend.id
    }

    path_rule {
      paths   = ["/match/*"]
      service = google_compute_region_backend_service.matchmaker_backend.id
    }

    path_rule {
      paths   = ["/game/*"]
      service = google_compute_region_backend_service.game_backend.id
    }
  }
}

# SSL Certificate
resource "google_compute_region_ssl_certificate" "chess_cert" {
  name        = "chess-cert"
  region      = var.region
  private_key = file("${path.module}/../server.key")
  certificate = file("${path.module}/../server.crt")
}

# Target HTTPS Proxy
resource "google_compute_region_target_https_proxy" "lb_https_proxy" {
  name             = "chess-lb-https-proxy"
  region           = var.region
  url_map          = google_compute_region_url_map.lb_url_map.id
  ssl_certificates = [google_compute_region_ssl_certificate.chess_cert.id]
}

# Forwarding Rule — HTTPS
resource "google_compute_forwarding_rule" "lb_https_forwarding_rule" {
  name                  = "chess-lb-https-forwarding-rule"
  region                = var.region
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  port_range            = "443"
  target                = google_compute_region_target_https_proxy.lb_https_proxy.id
  ip_address            = google_compute_address.lb_ip.id
  network_tier          = "STANDARD"

  depends_on = [google_compute_subnetwork.proxy_subnet]
}

# Target HTTP Proxy
resource "google_compute_region_target_http_proxy" "lb_proxy" {
  name    = "chess-lb-proxy"
  region  = var.region
  url_map = google_compute_region_url_map.lb_url_map.id
}

# Forwarding Rule — HTTP
resource "google_compute_forwarding_rule" "lb_forwarding_rule" {
  name                  = "chess-lb-forwarding-rule"
  region                = var.region
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  port_range            = "80"
  target                = google_compute_region_target_http_proxy.lb_proxy.id
  ip_address            = google_compute_address.lb_ip.id
  network_tier          = "STANDARD"

  depends_on = [google_compute_subnetwork.proxy_subnet]
}

# Proxy Subnet (Required for Regional LB)
resource "google_compute_subnetwork" "proxy_subnet" {
  name          = "chess-lb-proxy-subnet"
  region        = var.region
  network       = "default"
  ip_cidr_range = "10.100.0.0/24"
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}

output "lb_ip_address" {
  value = google_compute_address.lb_ip.address
}