variable "ntfy_endpoint" {
  description = "A ntfy.sh URL for sending push notifications, e.g. https://ntfy.sh/mytopic.  This will be stored as an environment variable for the backend functions app."
  type        = string
}

variable "email_notification_address" {
  description = "An email address to send app notifications.  This will be stored as an environment variable for the backend functions app."
  type        = string
}