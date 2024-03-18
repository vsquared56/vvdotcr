resource "azurerm_communication_service" "communication" {
  name                = "vvdotcr-communications"
  resource_group_name = azurerm_resource_group.shared_rg.name
  data_location       = "United States"
}

resource "azurerm_email_communication_service" "email" {
  name                = "vvdotcr-email"
  resource_group_name = azurerm_resource_group.shared_rg.name
  data_location       = "United States"
}