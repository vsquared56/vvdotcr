import { Eta } from "eta";
import * as path from "path";

import { ServiceBusClient } from "@azure/service-bus";

import * as utils from "@vvdotcr/common";

const SERVICE_BUS_CONNECTION_STRING = process.env.SERVICE_BUS_CONNECTION_STRING;

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  const db = new utils.Database;

  var response;

  const sightingId = req.params.sightingId;
  var submissionStatus;
  var sighting = await db.getSighting(sightingId);

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
  submissionStatus = 'pendingAutomaticApproval';

  sighting.imageLocation = imageLocation;
  sighting.submissionStatus = submissionStatus;

  await db.saveSighting(sighting);
  response = eta.render(
    "./sighting_submit/status_recheck",
    {
      sighting: sighting,
      pendingResizing: false,
      pendingAutomaticApproval: true,
      recheckCount: 0,
      recheckInterval: 1
    }
  );

  // Send a Service Bus Message
  const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
  const sbSender = sbClient.createSender('new-sightings-to-validate');
  try {
    await sbSender.sendMessages({ body: sighting.id });
  } finally {
    await sbClient.close();
  }

  context.res = {
    status: 200,
    body: response
  };
};
