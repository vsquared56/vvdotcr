import { CosmosClient } from "@azure/cosmos";
import ipRangeCheck from "ip-range-check"

const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;

export default async function parseXff(xff) {
    var trustedIpBlocks;
    const cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
    const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_DATABASE_NAME });
    const { container } = await database.containers.createIfNotExists({
        id: "vvdotcr-settings-dev",
        partitionKey: {
            paths: "/id"
        }
    });
    const { resource } = await container.item("trusted_xff_ip_blocks", "trusted_xff_ip_blocks").read();
    if (resource === undefined || !resource.hasOwnProperty('blocks') || resource.length == 0) {
        throw new Error('Error reading trusted IP blocks from CosmosDB');
    }
    else {
        trustedIpBlocks = resource.blocks;
    }

    const regex = /^(.*?(?:[^:]|::))(?:(:)([0-9]*))?$/;
    const xffArr = xff.replace(/\s/g, "").split(",")

    var clientIp = null;
    var i = xffArr.length - 1;
    do {
        const matches = xffArr[i].match(regex);
        if (matches && matches.length == 4) {
            const ip = matches[1].replace(/\[|\]/g, "")
            if (ipRangeCheck(ip, trustedIpBlocks)) {
                i--;
            }
            else {
                clientIp = ip;
            }
        }
        else {
            throw new Error('Error parsing IP from X-Forwarded-For: ' + xffArr[i]);
        }
    }
    while (i >= 0 && clientIp == null);
    return clientIp;
}