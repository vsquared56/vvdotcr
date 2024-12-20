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

locals {
  environment    = "${terraform.workspace == "default" ? "prod" : terraform.workspace}"
  primary_domain = "vv.cr"
}

resource "azurerm_resource_group" "environment_rg" {
  location = "centralus"
  name     = "vvdotcr-${local.environment}"
}

//Remote state for resources shared between different environments
data "terraform_remote_state" "shared_rg" {
  backend = "azurerm"

  config = {
    resource_group_name  = "vvdotcr"
    storage_account_name = "vvdotcrcommon"
    container_name       = "tfstate"
    key                  = "terraform-shared.tfstate"
  }
}