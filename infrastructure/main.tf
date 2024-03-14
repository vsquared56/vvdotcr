terraform {
  backend "azurerm" {
    resource_group_name  = "vvdotcr"
    storage_account_name = "vvdotcrcommon"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}
