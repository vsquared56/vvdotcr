import { app } from "@azure/functions";
import fetch from "node-fetch";

import * as utils from "@vvdotcr/common";

app.timer("xff-ip-refresh", {
  schedule: "0 0 * * 0",
  handler: async (myTimer, context) => {
    const db = new utils.Database;
    var cloudflareIPBlocks = [];
    var azureIPBlocks = [];

    const cfResponse = await fetch("https://api.cloudflare.com/client/v4/ips");
    const cfData = await cfResponse.json();
    if (cfData.success == true && cfData.result.ipv4_cidrs.length > 0) {
      cloudflareIPBlocks = cfData.result.ipv4_cidrs.concat(cfData.result.ipv6_cidrs);
      await db.saveSetting("cloudflare_ip_blocks", cloudflareIPBlocks);
    }

    const azDownloadPageResponse = await fetch("https://www.microsoft.com/en-us/download/details.aspx?id=56519");
    const regex = /https:\/\/download\.microsoft\.com\/download\/7\/1\/D\/71D86715-5596-4529-9B13-DA13A5DE5B63\/ServiceTags_Public_20\d{6}\.json/g;
    const azDownloadPage = await azDownloadPageResponse.text();
    const azDownloadUrl = azDownloadPage.match(regex)[0];
    const azResponse = await fetch(azDownloadUrl);
    const azData = await azResponse.json();
    if (azData.values.length > 0) {
      const azureASM = azData.values.filter(x => x.name === "AppServiceManagement");

      if (azureASM.length == 1 && azureASM[0].properties.addressPrefixes.length > 0) {
        azureIPBlocks = azureASM[0].properties.addressPrefixes;
        await db.saveSetting("azure_ip_blocks", azureIPBlocks);
      }
    }

    if (cloudflareIPBlocks.length > 0 && azureIPBlocks.length > 0) {
      await db.saveSetting("trusted_xff_ip_blocks", cloudflareIPBlocks.concat(azureIPBlocks));
    }
  }
});