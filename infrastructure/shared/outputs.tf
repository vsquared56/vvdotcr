output "communication_services_connection_string" {
  value     = azurerm_communication_service.communication.primary_connection_string
  sensitive = true
}