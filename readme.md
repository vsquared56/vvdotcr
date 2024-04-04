# vv.cr
## A site for cars with VV DOT CR plates

- Azure Static Web Apps
- Azure Functions
- CosmosDB
- Node.js
- HTMX
- Eta Templates
- Terraform

### Creating environments

- Install Terraform and Azure CLI (for Authentication).
- Ensure node.js is installed locally.
- Create `infrastructure/environment/terraform.tfvars` :
```
ntfy_endpoint = {
    dev = "https://ntfy.sh/some-ntfy-topic"
    prod = "https://ntfy.sh/another-ntfy-topic"
}
email_notification_address = "you@yourdomain.com"
cloudflare_api_token = "Cloudflare API Token
```
- The `default` workspace will deploy to the `prod` environment.  Any other workspace will deploy to an environment matching the workspace name.  Run `terraform workspace select <workspace name>` inside `infrastructure/environment`
- Set `use_subdomain = true` in `infrastructure/environment/app-storage.tf`.  See [this AzureRM provider issue](https://github.com/hashicorp/terraform-provider-azurerm/issues/12737) for more details.
- Run `terraform apply` to create resources.
- Set `use_subdomain = false` in `infrastructure/environment/app-storage.tf`.
- Add a `packages/utility-scripts/local_settings.json` if one does not already exist.  Use the following schema:
```
{
    "IsEncrypted": false,
    "Values": {
      "BOOTSTRAP_DB_CONNECTION_STRING": "Your new CosmosDB connection string",
      "BOOTSTRAP_DB_DATABASE_NAME": "Your new CosmosDB database name",
      "BOOTSTRAP_ENVIRONMENT_NAME": "Your new environment name",
      }
}
```
- Copy the CosmosDB primary connection string, database name, and environment name into `packages/utility-scripts/local_settings.json`
- Run `node packages/utility-scripts/bootstrap-db.js` to initialize settings
- Remove the connection string from `packages/utility-scripts/local_settings.json`.
- Create a new Azure Devops Library variable group
- Copy the new SWA deployment token into the `azure_deployment_token` variable of the new group.  The deployment token should be accessible from `Manage deployment token` in the SWA overview.  Set the `functions_app_name` variable in the new variable group.
- Add stages into `azure-pipelines.yml` as needed.
- Assign the `Website Contributor` role to the Devops Service Connection principal under the backend functions web app.  Note that the pipeline does not use a service connection to deploy the SWA, it uses the deployment token configured above.
- Run the pipeline to deploy.
- Invite administrators in the SWA Azure Portal under `Role management`.  Invite user(s) to the `administrator` role.  Test logins to the `/admin` panel.
- Temporarily enable public network access for the backend functions web app.  This will allow running Azure functions through the Azure portal or through special API calls.
- Manually run the `xff-ip-refresh` backend function from the Azure Portal.  This should be available under `Code and Test` in the `xff-ip-refresh` function within the web app.  Use the `master` key and an empty object (i.e. `{}`) for the body.  Confirm that the `cloudflare_ip_blocks`, `azure_ip_blocks`, and `trusted_xff_ip_blocks` settings populated properly.
- Disable public network access for the backend functions web app.
- Adjust other settings in the admin panel as necessary.