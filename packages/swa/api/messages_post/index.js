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

  const form = req.parseFormBody();

  //Validate Turnstile response
  const turnstileResult = await utils.validateTurnstileResponse(form);
  if (!turnstileResult.success) {
    console.log(turnstileResult.err);
    context.res = {
      status: 401,
      body: "Failed turnstile verification."
    };
    return;
  }

  //Verify the sesion token and that we're not rate-limited
  const sessionData = await utils.getSession(req.headers.cookie);
  if (sessionData.err) {
    console.log(sessionData.err);
    context.res = {
      status: 401,
      body: "Message submissions require a valid session token."
    };
    return;
  } else if (await utils.isActionRateLimited(clientIp, sessionData.sessionId, "newMessage")) {
    console.log("Rate limited POST request for new messages.");
    context.res = {
      status: 429,
      body: "Too many message submissions."
    };
    return;
  }

  const formDefinition = [
    {
      name: "driving",
      type: "formToggle",
      subItems: [
        { name: "drivingQuality", type: "select", validValues: ["faster", "slower", "turn-signals", "swearing", "ok"] }
      ]
    },
    {
      name: "parking",
      type: "formToggle",
      subItems: [
        { name: "parkingQuality", type: "select", validValues: ["bad", "too-close", "too-far", "swearing", "ok"] }
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
    var notificationStatus;
    if (pushNotification) {
      notificationStatus = { batch: { status: null, notificationId: null }, push: { status: "queued", notificationId: null } };
    } else {
      notificationStatus = { batch: { status: "queued", notificationId: null }, push: { status: null, notificationId: null } };
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
      sessionId: sessionData.sessionId,
      createDate: createDate,
      modifyDate: createDate,
      messageLocation: messageLocation,
      notificationStatus: notificationStatus,
      notificationStatusReason: notificationStatusReason,
      messageData: formResults
    }

    // Send Service Bus Messages for notifications
    const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
    const sbQueue = pushNotification ? "immediate-notifications" : "batch-notifications";
    const sbSender = sbClient.createSender(sbQueue);
    try {
      await sbSender.sendMessages({ body: { notificationType: "message", id: messageId } });
    } finally {
      await sbClient.close();
    }

    //Save message to CosmosDB
    await db.saveMessage(item);

    //Save this action for rate limiting
    await utils.saveAction(clientIp, sessionData.sessionId, "newMessage", messageId);

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