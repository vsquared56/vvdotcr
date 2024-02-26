import { Eta } from "eta";
import * as crypto from "crypto";
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
  const storage = new utils.Storage;

  var response;
  var notificationStatus, notificationStatusReason;

  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await utils.parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

  const form = req.parseFormBody();
  const messageLocation = utils.parseLocationForm(form);

  const minLocationAccuracy = await db.getSetting("min_location_accuracy_meters");
  if (messageLocation.latitude === null || messageLocation.longitude === null) {
    notificationStatus = 'neverNotify';
    notificationStatusReason = 'missingLocation';
  } else if (messageLocation.latitude.accuracy > minLocationAccuracy) {
    notificationStatus = 'neverNotify';
    notificationStatusReason = 'inaccurateBrowserLocation';
  } else {
    const validLocations = await db.getSetting("valid_locations");
    const locationValid = utils.isLocationInFeatureCollection(messageLocation, validLocations);

    if (!locationValid) {
      notificationStatus = 'neverNotify';
      notificationStatusReason = 'invalidLocation';
    } else {
      notificationStatus = 'queued';
      notificationStatusReason = null;
    }
}

  const messageId = crypto.randomUUID();

  // Set DB item
  const createDate = Date.now();
  const submissionStatus = "saved";
  const item = {
    id: messageId,
    submissionStatus: submissionStatus,
    originalUserAgent: req.headers['user-agent'],
    originalXFF: req.headers['x-forwarded-for'],
    originalIP: clientIp,
    createDate: createDate,
    modifyDate: createDate,
    messageLocation: messageLocation,
    notificationStatus: notificationStatus,
    notificationStatusReason: notificationStatusReason
  }

  // Save image data to CosmosDB
  //await db.saveMessage(item);

  /*
  // Send a Service Bus Message
  const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
  const sbSender = sbClient.createSender('new-message-submissions');
  try {
    await sbSender.sendMessages({ body: messageId });
  } finally {
    await sbClient.close();
  }
  */

  response = eta.render(
    "./message_submit/submitted",
    {
      message: JSON.stringify(item)
    }
  );

  context.res = {
    status: 200,
    body: response
  };
};