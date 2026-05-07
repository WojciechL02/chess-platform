# Static frontend hosting via Cloud Storage + Cloud CDN.
# After `terraform apply`, build the React app and upload it:
#
#   cd frontend && npm run build
#   gsutil -m rsync -d -r dist/ gs://${var.project_id}-chess-frontend/
#
# (Or wire this up in CI.)

resource "google_storage_bucket" "frontend" {
  name                        = "${var.project_id}-chess-frontend"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"  # SPA: any unknown path -> index.html, React Router takes over
  }
}

# Make objects publicly readable (the LB needs to be able to fetch them too).
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Backend bucket = "this GCS bucket is a backend the LB can route to".
# enable_cdn caches static assets at Google's edge POPs (fast worldwide).
resource "google_compute_backend_bucket" "frontend" {
  name        = "chess-frontend-backend"
  bucket_name = google_storage_bucket.frontend.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = 3600
    client_ttl        = 3600
    max_ttl           = 86400
    negative_caching  = true
  }
}
