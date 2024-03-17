terraform {
  backend "azurerm" {
    resource_group_name  = "vvdotcr"
    storage_account_name = "vvdotcrcommon"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">=3.54.0"
    }
  }
}

provider "azurerm" {
  features {}
}

locals {
  environment = "${terraform.workspace == "default" ? "prod" : terraform.workspace}"
}

resource "azurerm_resource_group" "environment_rg" {
  location = "centralus"
  name     = "vvdotcr-${local.environment}"
}