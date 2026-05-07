# For each microservice we create:
#   1. an Instance Template (the "blueprint" for a VM)
#   2. a Managed Instance Group (MIG) (the running fleet)
#   3. an Autoscaler (scales the MIG up/down)
#
# In real deployments you'd build a container image (via Cloud Build) and pull
# it from Artifact Registry. Here we use the COS (container-optimized) image
# and assume you push images named gcr.io/<project>/<service>:latest.

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
    # No access_config{} block = no public IP. Egress via Cloud NAT (add separately).
  }

  metadata = {
    # COS reads this to launch the container at boot.
    "gce-container-declaration" = yamlencode({
      spec = {
        containers = [{
          image = "gcr.io/${var.project_id}/${each.key}:latest"
          ports = [{ containerPort = each.value.port }]
          # env vars (DB URLs, secrets) would normally come from Secret Manager
        }]
        restartPolicy = "Always"
      }
    })
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

  check_interval_sec = 10
  timeout_sec        = 5
  healthy_threshold  = 2
  unhealthy_threshold = 3
}
