output "communication_services_connection_string" {
  value     = azurerm_communication_service.communication.primary_connection_string
  sensitive = true
}

output "cloudflare_account_id" {
  value     = var.cloudflare_account_id
}

output "cloudflare_zone_id" {
  value     = cloudflare_zone.main.id
}