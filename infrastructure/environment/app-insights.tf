resource "azurerm_log_analytics_workspace" "log_analytics" {
  name                = "vvdotcr-log-analytics-${local.environment}"
  location            = azurerm_resource_group.environment_rg.location
  resource_group_name = azurerm_resource_group.environment_rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_application_insights" "app_insights" {
    application_type                      = "web"
    daily_data_cap_in_gb                  = 100
    location                              = azurerm_resource_group.environment_rg.location
    name                                  = "vvdotcr-appinsights-${local.environment}"
    resource_group_name                   = azurerm_resource_group.environment_rg.name
    retention_in_days                     = 90
    sampling_percentage                   = 0
    workspace_id                          = azurerm_log_analytics_workspace.log_analytics.id

    tags                                  = {}

    timeouts {}
}

resource "azurerm_monitor_action_group" "smart_detection" {
    enabled             = true
    name                = "application insights smart detection"
    resource_group_name = azurerm_resource_group.environment_rg.name
    short_name          = "SmartDetect"
    tags                = {}

    arm_role_receiver {
        name                    = "Monitoring Contributor"
        role_id                 = "749f88d5-cbae-40b8-bcfc-e573ddc772fa"
        use_common_alert_schema = true
    }
    arm_role_receiver {
        name                    = "Monitoring Reader"
        role_id                 = "43d0d8ad-25c7-4714-9337-8ba259a9fe05"
        use_common_alert_schema = true
    }

    timeouts {}
}

resource "azurerm_monitor_smart_detector_alert_rule" "failure_anomalies" {
    description         = "Failure Anomalies notifies you of an unusual rise in the rate of failed HTTP requests or dependency calls."
    detector_type       = "FailureAnomaliesDetector"
    enabled             = true
    frequency           = "PT1M"
    name                = "Failure Anomalies - ${azurerm_application_insights.app_insights.name}"
    resource_group_name = azurerm_resource_group.environment_rg.name
    scope_resource_ids  = [azurerm_application_insights.app_insights.id]
    severity            = "Sev3"
    tags                = {}

    action_group {
        ids = [
            "/subscriptions/de78e191-6db1-45c5-ae31-09587f52a2d0/resourceGroups/vvdotcr-dev/providers/microsoft.insights/actionGroups/application insights smart detection",
        ]
    }

    timeouts {}
}