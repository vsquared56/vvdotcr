resource "azurerm_cognitive_account" "vision" {
    custom_subdomain_name              = "vvdotcr-vision-dev"
    fqdns                              = []
    kind                               = "ComputerVision"
    location                           = azurerm_resource_group.environment_rg.location
    name                               = "vvdotcr-vision-${local.environment}"
    resource_group_name                = azurerm_resource_group.environment_rg.name
    sku_name                           = "F0"
    tags                               = {}

    identity {
        type         = "SystemAssigned"
    }

    network_acls {
        default_action = "Allow"
    }

    timeouts {}
}