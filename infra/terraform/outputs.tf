output "vm_urls" {
  value = {
    for name, vm in google_compute_instance.service :
    name => "http://${vm.network_interface[0].access_config[0].nat_ip}"
  }
}
