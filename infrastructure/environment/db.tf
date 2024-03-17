resource "azurerm_cosmosdb_account" "db" {
    name                = "vvdotcr-cosmosdb-${local.environment}"
    location            = azurerm_resource_group.environment_rg.location
    resource_group_name = azurerm_resource_group.environment_rg.name
    offer_type          = "Standard"
    kind                = "GlobalDocumentDB"
    enable_free_tier    = true

    backup {
        interval_in_minutes = 1440
        retention_in_hours  = 720
        storage_redundancy  = "Geo"
        type                = "Periodic"
    }

    capacity {
        total_throughput_limit = 1000
    }

    consistency_policy {
        consistency_level       = "Session"
        max_interval_in_seconds = 5
        max_staleness_prefix    = 100
    }

    geo_location {
        failover_priority = 0
        location          = azurerm_resource_group.environment_rg.location
        zone_redundant    = false
    }

    timeouts {}

    tags = {
        "defaultExperience"       = "Core (SQL)"
        "hidden-cosmos-mmspecial" = ""
    }
}

resource "azurerm_cosmosdb_sql_database" "db" {
    account_name        = azurerm_cosmosdb_account.db.name
    name                = "vvdotcr-${local.environment}"
    resource_group_name = azurerm_resource_group.environment_rg.name

    autoscale_settings {
        max_throughput = 1000
    }

    timeouts {}
}

resource "azurerm_cosmosdb_sql_container" "actions" {
    account_name          = azurerm_cosmosdb_account.db.name
    database_name         = azurerm_cosmosdb_sql_database.db.name
    default_ttl           = 2592000
    name                  = "vvdotcr-actions-${local.environment}"
    partition_key_path    = "/id"
    partition_key_version = 2
    resource_group_name   = azurerm_resource_group.environment_rg.name

    timeouts {}
}

resource "azurerm_cosmosdb_sql_container" "messages" {
    account_name          = azurerm_cosmosdb_account.db.name
    database_name         = azurerm_cosmosdb_sql_database.db.name
    name                  = "vvdotcr-messages-${local.environment}"
    partition_key_path    = "/id"
    partition_key_version = 2
    resource_group_name   = azurerm_resource_group.environment_rg.name

    timeouts {}
}

resource "azurerm_cosmosdb_sql_container" "notifications" {
    account_name          = azurerm_cosmosdb_account.db.name
    database_name         = azurerm_cosmosdb_sql_database.db.name
    name                  = "vvdotcr-notifications-${local.environment}"
    partition_key_path    = "/id"
    partition_key_version = 2
    resource_group_name   = azurerm_resource_group.environment_rg.name

    timeouts {}
}

resource "azurerm_cosmosdb_sql_container" "sessions" {
    account_name          = azurerm_cosmosdb_account.db.name
    database_name         = azurerm_cosmosdb_sql_database.db.name
    name                  = "vvdotcr-sessions-${local.environment}"
    partition_key_path    = "/id"
    partition_key_version = 2
    resource_group_name   = azurerm_resource_group.environment_rg.name

    timeouts {}
}

resource "azurerm_cosmosdb_sql_container" "settings" {
    account_name          = azurerm_cosmosdb_account.db.name
    database_name         = azurerm_cosmosdb_sql_database.db.name
    name                  = "vvdotcr-settings-${local.environment}"
    partition_key_path    = "/id"
    partition_key_version = 2
    resource_group_name   = azurerm_resource_group.environment_rg.name

    timeouts {}
}

resource "azurerm_cosmosdb_sql_container" "sightings" {
    account_name          = azurerm_cosmosdb_account.db.name
    database_name         = azurerm_cosmosdb_sql_database.db.name
    name                  = "vvdotcr-sightings-${local.environment}"
    partition_key_path    = "/id"
    partition_key_version = 2
    resource_group_name   = azurerm_resource_group.environment_rg.name

    timeouts {}
}