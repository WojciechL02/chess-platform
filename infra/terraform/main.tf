provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

resource "google_compute_instance" "service" {
  for_each = toset(var.services)

  name         = "chess-${each.value}"
  machine_type = "e2-micro"
  zone         = var.zone
  tags         = ["chess-service", "http-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata_startup_script = <<-EOT
    #!/bin/bash
    mkdir -p /var/www
    echo "hello world from ${each.value}" > /var/www/index.html
    cd /var/www && nohup python3 -m http.server 80 >/var/log/hello.log 2>&1 &
  EOT
}

resource "google_compute_firewall" "allow_http" {
  name    = "chess-allow-http"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server"]
}
