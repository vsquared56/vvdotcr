import { app } from '@azure/functions';
import fetch from 'node-fetch';

import * as utils from "@vvdotcr/common";

app.timer('xff-ip-refresh', {
    schedule: '0 0 * * 0',
    handler: async (myTimer, context) => {
        var cloudflareIPBlocks = [];
        var azureIPBlocks = [];
        
        const cfResponse = await fetch('https://api.cloudflare.com/client/v4/ips');
        const cfData = await cfResponse.json();
        if (cfData.success == true && cfData.result.ipv4_cidrs.length > 0) {
            cloudflareIPBlocks = cfData.result.ipv4_cidrs.concat(cfData.result.ipv6_cidrs);  
            await utils.saveSetting("cloudflare_ip_blocks", cloudflareIPBlocks);
        }

        const azResponse = await fetch('https://download.microsoft.com/download/7/1/D/71D86715-5596-4529-9B13-DA13A5DE5B63/ServiceTags_Public_20240122.json');
        const azData = await azResponse.json();
        if (azData.values.length > 0) {
            const azureASM = azData.values.filter(x => x.name === 'AppServiceManagement');
    
            if (azureASM.length == 1 && azureASM[0].properties.addressPrefixes.length > 0) {
                azureIPBlocks = azureASM[0].properties.addressPrefixes;
                await utils.saveSetting("azure_ip_blocks", azureIPBlocks);
            }
        }

        if (cloudflareIPBlocks.length > 0 && azureIPBlocks.length > 0) {
            await utils.saveSetting("trusted_xff_ip_blocks", cloudflareIPBlocks.concat(azureIPBlocks));
        }
    }
});