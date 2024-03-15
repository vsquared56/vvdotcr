resource "azurerm_servicebus_namespace" "sb" {
  name                = "vvdotcr-${local.environment}"
  location            = azurerm_resource_group.environment_rg.location
  resource_group_name = azurerm_resource_group.environment_rg.name
  sku                 = "Basic"

  tags = {
  }
}

resource "azurerm_servicebus_queue" "batch_notifications" {
  name                                 = "batch-notifications"
  namespace_id                         = azurerm_servicebus_namespace.sb.id
  dead_lettering_on_message_expiration = true

  timeouts {}
}

resource "azurerm_servicebus_queue" "immediate_notifications" {
  name                                 = "immediate-notifications"
  namespace_id                         = azurerm_servicebus_namespace.sb.id
  dead_lettering_on_message_expiration = true
  max_delivery_count                   = 2

  timeouts {}
}

resource "azurerm_servicebus_queue" "sightings_to_process" {
  name                                 = "new-file-uploads"
  namespace_id                         = azurerm_servicebus_namespace.sb.id
  dead_lettering_on_message_expiration = true
  max_delivery_count                   = 2

  timeouts {}
}

resource "azurerm_servicebus_queue" "sightings_to_validate" {
  name                                 = "new-sightings-to-validate"
  namespace_id                         = azurerm_servicebus_namespace.sb.id
  dead_lettering_on_message_expiration = true
  max_delivery_count                   = 2

  timeouts {}
}