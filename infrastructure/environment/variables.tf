variable "ntfy_endpoint" {
  description = "A map of ntfy.sh URLs for sending push notifications, e.g. https://ntfy.sh/mytopic.  Use environment names for the map keys.  The environment-specific URL will be stored as an environment variable for the backend functions app."
  type        = map
}

variable "email_notification_address" {
  description = "An email address to send app notifications.  This will be stored as an environment variable for the backend functions app."
  type        = string
}

variable "cloudflare_api_token" {
  description = "A Cloudflare API token."
  type        = string
  sensitive   = true
}
