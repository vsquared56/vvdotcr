resource "cloudflare_zone" "main" {
  account_id = var.cloudflare_account_id
  zone       = "vv.cr"
}