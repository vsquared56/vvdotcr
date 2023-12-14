import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import fetch from 'node-fetch';

app.timer('xff-ip-refresh', {
    schedule: '0 */1 * * * *',
    handler: async (myTimer, context) => {
        const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
        const { database } = await cosmosClient.databases.createIfNotExists({ id: process.env.COSMOS_DB_DATABASE_NAME });
        const { container } = await database.containers.createIfNotExists({
            id: "vvdotcr-settings-dev",
            partitionKey: {
                paths: "/id"
            }
        });

        var cloudflareIPBlocks = [];
        var azureIPBlocks = [];
        
        const cfResponse = await fetch('https://api.cloudflare.com/client/v4/ips');
        const cfData = await cfResponse.json();
        if (cfData.success == true && cfData.result.ipv4_cidrs.length > 0) {
            cloudflareIPBlocks = cfData.result.ipv4_cidrs.concat(cfData.result.ipv6_cidrs);
            const item = {
                id: "cloudflare_ip_blocks",
                modifyDate: Date.now(),
                cloudflareIPBlocks: cloudflareIPBlocks
            }
    
            const { resource } = await container.items.upsert(item);
        }

        const azResponse = await fetch('https://download.microsoft.com/download/7/1/D/71D86715-5596-4529-9B13-DA13A5DE5B63/ServiceTags_Public_20231211.json');
        const azData = await azResponse.json();
        if (azData.values.length > 0) {
            const azureASM = azData.values.filter(x => x.name === 'AppServiceManagement');
    
            if (azureASM.length == 1 && azureASM[0].properties.addressPrefixes.length > 0) {
                azureIPBlocks = azureASM[0].properties.addressPrefixes;
    
                const item = {
                    id: "azure_ip_blocks",
                    modifyDate: Date.now(),
                    azureIPBlocks: azureIPBlocks
                }
    
                const { resource } = await container.items.upsert(item);
            }
        }

        if (cloudflareIPBlocks.length > 0 && azureIPBlocks.length > 0) {
            const item = {
                id: "trusted_xff_ip_blocks",
                modifyDate: Date.now(),
                blocks: cloudflareIPBlocks.concat(azureIPBlocks)
            }

            const { resource } = await container.items.upsert(item);
        }
    }
});