import * as fs from "fs";
import * as path from "path";
import handlebars from "handlebars";

import { CosmosClient } from "@azure/cosmos";

const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;

export default async (context, req) => {
  const submissionId = req.query.submissionId;

  var item;
  var submissionStatus;
  const cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
  const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_DATABASE_NAME });
  const { container } = await database.containers.createIfNotExists({
    id: "vvdotcr-fileupload-dev",
    partitionKey: {
      paths: "/id"
    }
  });
  const { resource } = await container.item(submissionId, submissionId).read();
  if (resource === undefined) {
    throw new Error(`Error reading file upload document ${message} from CosmosDB`);
  }
  else {
    item = resource;
    const form = req.parseFormBody();
    const latitude = parseFloat(form.get('latitude').value.toString());
    const longitude = parseFloat(form.get('longitude').value.toString());
    const accuracy = parseFloat(form.get('accuracy').value.toString());
    const timestamp = parseInt(form.get('timestamp').value.toString());

    const imageLocation = {
      latitude: isNaN(latitude) ? null : latitude,
      longitude: isNaN(longitude) ? null : longitude,
      accuracy: isNaN(accuracy) ? null : accuracy,
      timestamp: isNaN(timestamp) ? null : timestamp,
      source: 'browser'
    };
    submissionStatus = 'accepted';

    item.imageLocation = imageLocation;
    item.submissionStatus = submissionStatus;
    item.modifyDate = Date.now();

    const { upsert } = await container.items.upsert(item);
  }

  var templateFile = 'sighting_submit_status_accepted.hbs';

  var templatePath, templateContent, template, response;
  templatePath = path.join(context.executionContext.functionDirectory, '..', 'views', templateFile);
  templateContent = fs.readFileSync(templatePath).toString();
  template = handlebars.compile(templateContent);
  response = template({ submissionId: submissionId, submissionStatus: submissionStatus, imageData: JSON.stringify(item) });

  context.res = {
    status: 200,
    body: response
  };
};
