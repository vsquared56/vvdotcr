import * as crypto from "crypto";
import { app } from '@azure/functions';
import { ServiceBusClient } from "@azure/service-bus";
import fetch from 'node-fetch';

import * as utils from "@vvdotcr/common";

const serviceBusConnectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
const ntfyEndpoint = process.env.NTFY_ENDPOINT;

app.serviceBusQueue('immediate-notification', {
  connection: 'SERVICE_BUS_CONNECTION_STRING',
  queueName: 'immediate-notifications',
  handler: async (message, context) => {
    const db = new utils.Database;

    var item, notificationTitle, notificationTags, notificationBody, notificationBody;
    if (message.notificationType === "message") { //New message form submissions
      item = await db.getMessage(message.id);
      notificationTitle = "New vv.cr message";
      notificationTags = "mailbox";
      notificationBody = `${item.id}`;
    } else if (message.notificationType === "sighting") {
      item = await db.getSighting(message.id);
    }

    // Send a push notification via ntfy.sh
    const ntfyResponse = await fetch(`${ntfyEndpoint}`, {
      headers: {
        "Title": notificationTitle,
        "Tags": notificationTags
      },
      method: "POST",
      body: notificationBody
    });

    const createDate = Date.now();
    const notificationItem = {
      id: crypto.randomUUID(),
      type: message.notificationType,
      service: "ntfy",
      serviceUrl: ntfyEndpoint,
      serviceResponse: ntfyResponse.status,
      createDate: createDate,
      modifyDate: createDate,
      notificationTitle: notificationTitle,
      notificationTags: notificationTags,
      notificationBody: notificationBody
    };

    await db.saveNotification(notificationItem);

    item.notificationStatus = "sentViaNtfy";
    await db.saveMessage(item);
  }
});