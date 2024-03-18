resource "azurerm_storage_account" "app_storage" {
    name                             = "vvdotcr${local.environment}storage"
    resource_group_name              = azurerm_resource_group.environment_rg.name
    location                         = azurerm_resource_group.environment_rg.location
    account_tier                     = "Standard"
    account_replication_type         = "RAGRS"
    cross_tenant_replication_enabled = false

    custom_domain {
        name = "cdn-dev.vv.cr"
    }

    timeouts {}

    tags = {}
}

resource "cloudflare_record" "cdn_cname" {
  zone_id = data.terraform_remote_state.shared_rg.outputs.cloudflare_zone_id
  name    = "cdn-dev"
  value   = azurerm_storage_account.app_storage.primary_blob_host
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