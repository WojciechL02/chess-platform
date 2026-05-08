variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "GCP region."
  type        = string
  default     = "europe-west4"
}

variable "zone" {
  description = "GCP zone."
  type        = string
  default     = "europe-west4-a"
}

variable "services" {
  description = "Microservices that each get one VM."
  type        = list(string)
  default = [
    "api-gateway",
    "users-service",
    "matchmaker",
    "game-service",
  ]
}
