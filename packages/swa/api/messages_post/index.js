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

  var response;
  var notificationStatusReason;

  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await utils.parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

  const formDefinition = [
    {
      name: "driving",
      type: "formToggle",
      subItems: [
        { name: "speed", type: "select", validValues: ["faster", "slower", "ok"] }
      ]
    },
    {
      name: "parking",
      type: "formToggle",
      subItems: [
        { name: "parkingQuality", type: "select", validValues: ["bad", "too-close", "too-far", "ok"] }
      ]
    },
    {
      name: "rating",
      type: "formToggle",
      subItems: [
        { name: "ratingValue", type: "int", min: 1, max: 5 },
        { name: "ratingType", type: "toggle", offValue: "starRating", onValue: "gtaRating" }
      ]
    },
    {
      name: "locationEnable",
      type: "toggle",
      offValue: "locationNotShared",
      onValue: "locationShared"
    }
  ];

  const form = req.parseFormBody();
  try {
    var badRequest = false;
    var formResults = utils.processFormItems(form, formDefinition);
  }
  catch (e) {
    console.log(e);
    badRequest = true;
  }

  if (badRequest) {
    context.res = {
      status: 400,
      body: ""
    };
  } else {
    const messageLocation = utils.parseLocationForm(form);

    const minLocationAccuracy = await db.getSetting("min_location_accuracy_meters");

    if (!messageLocation) {
      notificationStatusReason = 'missingLocation';
    } else if (messageLocation.latitude.accuracy > minLocationAccuracy) {
      notificationStatusReason = 'inaccurateBrowserLocation';
    } else {
      const validLocations = await db.getSetting("valid_locations");
      const locationValid = utils.isLocationInFeatureCollection(messageLocation, validLocations);

      if (!locationValid) {
        notificationStatusReason = 'invalidLocation';
      } else {
        notificationStatusReason = 'validLocation';
      }
    }

    const notificationSettings = await db.getSetting("message_push_notifications");
    const pushNotification = notificationSettings[notificationStatusReason];

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
      notificationStatus: pushNotification ? ["queuedPushNotification"] : ["queuedBatchNotification"],
      notificationStatusReason: notificationStatusReason,
      notificationId: null,
      messageData: formResults
    }

    // Send Service Bus Messages for notifications
    const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
    const sbQueue = pushNotification ? "immediate-notifications" : "batch-notifications";
    const sbSender = sbClient.createSender(sbQueue);
    try {
      await sbSender.sendMessages({ body: { notificationType: "message", id: messageId }});
    } finally {
      await sbClient.close();
    }

    //Save message to CosmosDB
    await db.saveMessage(item);

    response = eta.render(
      "./message_submit/submitted",
      {
        message: item
      }
    );

    context.res = {
      status: 200,
      body: response
    };
  }
};