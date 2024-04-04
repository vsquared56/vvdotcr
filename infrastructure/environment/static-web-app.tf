locals {
    swa_hostname = local.environment == "prod" ? "" : local.environment
    swa_domain_name = local.swa_hostname == "" ? local.primary_domain : "${local.swa_hostname}.${local.primary_domain}"
}

resource "azurerm_static_web_app" "swa" {
    name                = "vvdotcr-app-${local.environment}"
    resource_group_name = azurerm_resource_group.environment_rg.name
    location            = azurerm_resource_group.environment_rg.location
    sku_size            = "Free"
    sku_tier            = "Free"

    app_settings = {
        "APPLICATIONINSIGHTS_CONNECTION_STRING"    = azurerm_application_insights.app_insights.connection_string
        "COSMOS_DB_CONNECTION_STRING"              = azurerm_cosmosdb_account.db.primary_sql_connection_string
        "COSMOS_DB_DATABASE_NAME"                  = azurerm_cosmosdb_sql_database.db.name
        "ENVIRONMENT_NAME"                         = local.environment 
        "SERVICE_BUS_CONNECTION_STRING"            = azurerm_servicebus_namespace.sb.default_primary_connection_string
        "STORAGE_ACCOUNT"                          = azurerm_storage_account.app_storage.name
        "STORAGE_KEY"                              = azurerm_storage_account.app_storage.primary_access_key
        "TIME_ZONE"                                = "America/Chicago"
        "TURNSTILE_SECRET_KEY"                     = cloudflare_turnstile_widget.turnstile.secret
        "TURNSTILE_SITE_KEY"                       = cloudflare_turnstile_widget.turnstile.id
    }

    tags = {

    }

    lifecycle {
        ignore_changes = [
            tags["hidden-link: /app-insights-conn-string"],
            tags["hidden-link: /app-insights-instrumentation-key"],
            tags["hidden-link: /app-insights-resource-id"]
        ]
    }
}

resource "cloudflare_turnstile_widget" "turnstile" {
    account_id     = data.terraform_remote_state.shared_rg.outputs.cloudflare_account_id
    name           = local.swa_domain_name
    domains        = local.environment == "dev" ? ["localhost", local.swa_domain_name] : [local.swa_domain_name]
    mode           = "managed"
    bot_fight_mode = false
}

resource "cloudflare_record" "swa_cname" {
  zone_id = data.terraform_remote_state.shared_rg.outputs.cloudflare_zone_id
  name    = local.swa_hostname == "" ? "@" : local.swa_hostname
  value   = azurerm_static_web_app.swa.default_host_name
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "azurerm_static_web_app_custom_domain" "swa" {
  static_web_app_id = azurerm_static_web_app.swa.id
  domain_name       = local.swa_domain_name
  validation_type   = "dns-txt-token"
}

resource "cloudflare_record" "swa_validation" {
  zone_id = data.terraform_remote_state.shared_rg.outputs.cloudflare_zone_id
  name    = local.swa_hostname == "" ? "@" : local.swa_hostname
  comment = "Azure Static Web App domain validation"
  value   = azurerm_static_web_app_custom_domain.swa.validation_token
  type    = "TXT"
  ttl     = 3600
}