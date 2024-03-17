variable "ntfy_endpoint" {
  description = "A ntfy.sh URL for sending push notifications, e.g. https://ntfy.sh/mytopic.  This will be stored as an environment variable for the backend functions app."
  type        = string
}

variable "email_notification_address" {
  description = "An email address to send app notifications.  This will be stored as an environment variable for the backend functions app."
  type        = string
}

variable "turnstile_secret_key" {
  description = "A Cloudflare Turnstile Secret Key for verifying static web app submissions are not automated.  This will be stored as an environment variable for the static web app."
  type        = string
  sensitive   = true
}

variable "turnstile_site_key" {
  description = "A Cloudflare Turnstile Site Key for verifying static web app submissions are not automated.  This will be stored as an environment variable for the static web app."
  type        = string
}

variable "cloudflare_api_token" {
  description = "A Cloudflare API token."
  type        = string
  sensitive   = true
}
