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

  const sessionData = await utils.getSession(req.headers.cookie);
  if (sessionData.err || sessionData.sessionId !== sighting.sessionId) {
    console.log(sessionData.err);
    context.res = {
      status: 401,
      body: "Sighting location updates requires a valid session token."
    };
    return;
  } else if (sighting.submissionStatus !== "locationRequest") {
    console.log(`Invalid attempt to update locations for sighting ${sighting.id}`);
    context.res = {
      status: 400,
      body: "Sighting location not required."
    };
    return;
  }

  const form = req.parseFormBody();
  const imageLocation = utils.parseLocationForm(form);
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
