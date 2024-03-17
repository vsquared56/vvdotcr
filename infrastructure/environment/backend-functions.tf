resource "azurerm_service_plan" "backend_functions" {
    location                     = azurerm_resource_group.environment_rg.location
    name                         = "ASP-vvdotcrdev-96c2"
    os_type                      = "Linux"
    resource_group_name          = azurerm_resource_group.environment_rg.name
    sku_name                     = "Y1"

    tags                         = {}
}

resource "azurerm_linux_function_app" "backend_functions" {
    name                = "vvdotcr-backend-functions-${local.environment}"
    resource_group_name = azurerm_resource_group.environment_rg.name
    location            = azurerm_resource_group.environment_rg.location

    storage_account_name       = azurerm_storage_account.app_storage.name
    storage_account_access_key = azurerm_storage_account.app_storage.primary_access_key
    service_plan_id            = azurerm_service_plan.backend_functions.id

    builtin_logging_enabled       = false
    client_certificate_mode       = "Required"
    https_only                    = true
    public_network_access_enabled = false

    app_settings                                   = {
        "CDN_HOST"                                 = "cdn-dev.vv.cr"
        "COMMUNICATION_SERVICES_CONNECTION_STRING" = data.terraform_remote_state.shared_rg.outputs.communication_services_connection_string
        "COSMOS_DB_CONNECTION_STRING"              = azurerm_cosmosdb_account.db.primary_sql_connection_string
        "COSMOS_DB_DATABASE_NAME"                  = azurerm_cosmosdb_sql_database.db.name
        "EMAIL_FROM_ADDRESS"                       = "noreply-dev@vv.cr"
        "EMAIL_NOTIFICATION_ADDRESS"               = var.email_notification_address
        "ENVIRONMENT_NAME"                         = local.environment
        "NTFY_ENDPOINT"                            = var.ntfy_endpoint        
        "PING_URL"                                 = "https://dev.vv.cr/api/ping"
        "SERVICE_BUS_CONNECTION_STRING"            = azurerm_servicebus_namespace.sb.default_primary_connection_string
        "STORAGE_ACCOUNT"                          = azurerm_storage_account.app_storage.name
        "STORAGE_KEY"                              = azurerm_storage_account.app_storage.primary_access_key
        "TIME_ZONE"                                = "America/Chicago"
        "VISION_API_ENDPOINT"                      = azurerm_cognitive_account.vision.endpoint    
        "VISION_API_KEY"                           = azurerm_cognitive_account.vision.primary_access_key
        "WEBSITE_ENABLE_SYNC_UPDATE_SITE"          = "false"
    }

    site_config {
        application_insights_connection_string = azurerm_application_insights.app_insights.connection_string
        ftps_state                             = "FtpsOnly"

        application_stack {
            node_version = "18"
        }

        cors {
            allowed_origins     = ["https://portal.azure.com"]
            support_credentials = false
        }
    }

    lifecycle {
        ignore_changes = [
            tags["hidden-link: /app-insights-conn-string"],
            tags["hidden-link: /app-insights-instrumentation-key"],
            tags["hidden-link: /app-insights-resource-id"]
        ]
  }
}