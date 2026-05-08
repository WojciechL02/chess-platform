## Usage

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: set project_id
gcloud auth login
terraform init
terraform plan
terraform apply
```

## Files

- `main.tf` — provider config and 4 `e2-micro` VMs (one per backend service) on the default VPC, each serving "hello world from <service>" on port 80, plus a firewall rule for tcp:80.
- `variables.tf` — `project_id`, `region`, `zone`, `services`.
- `versions.tf` — Terraform/provider version pins.
- `outputs.tf` — `vm_urls` map (service name → public URL).
- `terraform.tfvars.example` — copy to `terraform.tfvars` and fill in.
