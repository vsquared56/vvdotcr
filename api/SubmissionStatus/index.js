import * as fs from "fs";
import * as path from "path";
import handlebars from "handlebars";

import { CosmosClient } from "@azure/cosmos";

const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;

export default async (context, req) => {
  const submissionId = req.query.submissionId;
  const recheckCount = parseInt(req.query.recheckCount);
  var submissionStatus;
  var templateFile;

  const cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
  const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_DATABASE_NAME });
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

  var templatePath, templateContent, template, response;
  if (submissionStatus === "saved") {
    if (recheckCount >= 6) {
      templateFile = "sighting_submit_status_timeout.hbs";
    } else {
      templateFile = "sighting_submit_status_recheck.hbs";
    }
    templatePath = path.join(context.executionContext.functionDirectory, '..', 'views', templateFile);
    templateContent = fs.readFileSync(templatePath).toString();
    template = handlebars.compile(templateContent);
    //Exponential backoff for retry requests
    response = template({ submissionId: submissionId, submissionStatus: submissionStatus, recheckCount: (recheckCount + 1), recheckInterval: Math.pow(1.5, recheckCount) });
  }
  else if (submissionStatus === "resized") {
    templateFile = "sighting_submit_status_submitted.hbs";
    templatePath = path.join(context.executionContext.functionDirectory, '..', 'views', templateFile);
    templateContent = fs.readFileSync(templatePath).toString();
    template = handlebars.compile(templateContent);
    response = template({ submissionId: submissionId, submissionStatus: submissionStatus, visionData: resource.visionData });
  }

  context.res = {
    status: 200,
    body: response
  };
};
