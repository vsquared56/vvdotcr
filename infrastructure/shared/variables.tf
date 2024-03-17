variable "cloudflare_api_token" {
  description = "A Cloudflare API token."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "A Cloudflare Account ID."
  type        = string
}