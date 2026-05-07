# VPC: a private network. Internal services talk over private IPs.
resource "google_compute_network" "main" {
  name                    = "chess-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "chess-subnet"
  ip_cidr_range = "10.10.0.0/16"
  region        = var.region
  network       = google_compute_network.main.id
}

# Allow the GCP load balancer's health-checker IPs to reach our VMs.
# These ranges are documented by Google and are stable.
resource "google_compute_firewall" "allow_health_checks" {
  name    = "chess-allow-hc"
  network = google_compute_network.main.id

  allow {
    protocol = "tcp"
    ports    = [for s in var.services : tostring(s.port)]
  }

  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]
  target_tags   = ["chess-backend"]
}

# Allow services within the VPC to reach each other on their service ports.
resource "google_compute_firewall" "allow_internal" {
  name    = "chess-allow-internal"
  network = google_compute_network.main.id

  allow {
    protocol = "tcp"
    ports    = [for s in var.services : tostring(s.port)]
  }

  source_ranges = [google_compute_subnetwork.main.ip_cidr_range]
  target_tags   = ["chess-backend"]
}
