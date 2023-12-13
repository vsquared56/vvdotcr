import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import crypto from 'node:crypto';
import fetch from 'node-fetch';

app.timer('xff-ip-refresh', {
    schedule: '0 */1 * * * *',
    handler: async (myTimer, context) => {
        const response = await fetch('https://api.cloudflare.com/client/v4/ips');
        const data = await response.json();

        if (data.success == true) {

            const item = {
                id: "cloudflare_ip_blocks",
                modifyDate: Date.now(),
                cloudflareIPBlocks: data.result
            }

            const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
            const { database } = await cosmosClient.databases.createIfNotExists({ id: process.env.COSMOS_DB_DATABASE_NAME });
            const { container } = await database.containers.createIfNotExists({
                id: "vvdotcr-settings-dev",
                partitionKey: {
                    paths: "/id"
                }
            });
            const { resource } = await container.items.upsert(item);
        }
    }
});
