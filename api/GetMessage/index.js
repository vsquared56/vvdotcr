import * as fs from "fs";
import * as path from "path";
import { CosmosClient } from "@azure/cosmos";
import ipRangeCheck from "ip-range-check"
import handlebars from "handlebars";

const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;

export default async (context, req) => {
  const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sample.hbs');

  const templateContent = fs.readFileSync(directoryPath).toString();
  var template = handlebars.compile(templateContent);

  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
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
    const xff = "67.173.22.116:42104, 13.89.171.4:3475";
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
  }

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: {
      text: template({ name: "Vlad" }),
      directoryPath: directoryPath,
      request: req,
      clientIp: clientIp
    },
  };
};
