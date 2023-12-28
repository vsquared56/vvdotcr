import * as fs from "fs";
import * as path from "path";
import handlebars from "handlebars";

import { CosmosClient } from "@azure/cosmos";

export default async (context, req) => {
  const submissionId = req.query.submissionId;
  var submissionStatus;

  const templatePath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sighting_submit_status_recheck.hbs');
  const templateContent = fs.readFileSync(templatePath).toString();
  var template = handlebars.compile(templateContent);

  const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
  const { database } = await cosmosClient.databases.createIfNotExists({ id: process.env.COSMOS_DB_DATABASE_NAME });
  const { container } = await database.containers.createIfNotExists({
    id: "vvdotcr-fileupload-dev",
    partitionKey: {
      paths: "/id"
    }
  });
  const { resource } = await container.item(submissionId, submissionId).read();
  if (resource === undefined || !resource.hasOwnProperty('submissionStatus')) {
    throw new Error('Error reading submission data from CosmosDB');
  }
  else {
    submissionStatus = resource.submissionStatus;
  }

  context.res = {
    status: 200,
    body: template({ submissionId: submissionId, submissionStatus: submissionStatus })
  };
};
