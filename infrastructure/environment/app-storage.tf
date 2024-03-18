locals {
  cdn_custom_hostname = "cdn-${local.environment}"
  cdn_custom_domain = "${local.cdn_custom_hostname}.${local.primary_domain}"
  storage_account_name = local.environment == "dev" ? "vvdotcr${local.environment}storage" : "vvdotcrstorage${local.environment}"
}

resource "azurerm_storage_account" "app_storage" {
    name                             = local.storage_account_name
    resource_group_name              = azurerm_resource_group.environment_rg.name
    location                         = azurerm_resource_group.environment_rg.location
    account_tier                     = "Standard"
    account_replication_type         = "RAGRS"
    cross_tenant_replication_enabled = false

    custom_domain {
        name = local.cdn_custom_domain
    }

    timeouts {}

    depends_on = [
      cloudflare_record.cdn_cname
    ]

    tags = {}
}

resource "cloudflare_record" "cdn_cname" {
  zone_id = data.terraform_remote_state.shared_rg.outputs.cloudflare_zone_id
  name    = local.cdn_custom_hostname
  value   = "${local.storage_account_name}.blob.core.windows.net"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "azurerm_storage_container" "sightings_private" {
  name                  = "vvdotcr-sightings-private-${local.environment}"
  storage_account_name  = azurerm_storage_account.app_storage.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "sightings_public" {
  name                  = "vvdotcr-sightings-public-${local.environment}"
  storage_account_name  = azurerm_storage_account.app_storage.name
  container_access_type = "blob"
}