terraform {
  backend "azurerm" {
    resource_group_name  = "vvdotcr"
    storage_account_name = "vvdotcrcommon"
    container_name       = "tfstate"
    key                  = "terraform-shared.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">=3.54.0"
    }

    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "azurerm_resource_group" "shared_rg" {
  location = "centralus"
  name     = "vvdotcr"
}