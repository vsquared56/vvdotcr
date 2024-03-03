import { Eta } from "eta";
import * as url from 'url';
import * as crypto from "crypto";
import { app } from '@azure/functions';
import { ServiceBusClient } from "@azure/service-bus";
import fetch from 'node-fetch';

import * as utils from "@vvdotcr/common";

const serviceBusConnectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
const ntfyEndpoint = process.env.NTFY_ENDPOINT;

app.serviceBusQueue('notification-immediate', {
  connection: 'SERVICE_BUS_CONNECTION_STRING',
  queueName: 'immediate-notifications',
  handler: async (message, context) => {
    const eta = new Eta(
      {
        views: url.fileURLToPath(new URL('../../views', import.meta.url))
      });
    const db = new utils.Database;

    const rateLimits = await db.getSetting("notification-rate-limits");
    var isRateLimited = false;
    for (var limit of rateLimits) {
      const recentNotifications = await db.countRecentNotifications((Date.now() - limit.seconds * 1000));
      if (recentNotifications >= limit.limit) {
        isRateLimited = true;
      }
    }

    if (isRateLimited) {
      const sbClient = new ServiceBusClient(serviceBusConnectionString);
      const sbSender = sbClient.createSender("batch-notifications");
      try {
        await sbSender.sendMessages({ body: message});
      } finally {
        await sbClient.close();
      }
    } else {
      var item, notificationTitle, notificationTags, notificationBody;
      var notificationActions = "";
      if (message.notificationType === "message") { //New message form submissions
        item = await db.getMessage(message.id);
        notificationTitle = "New vv.cr message";
        notificationTags = "mailbox";
        notificationBody = eta.render(
          "./ntfy_message_notification",
          {
            message: item,
            messageDate: (new Date(item.createDate)).toLocaleString()
          }
        );
        if (item.messageLocation) {
          notificationActions += `view, See Location, 'geo:0,0?q=${item.messageLocation.latitude},${item.messageLocation.longitude}';`;
          console.log(notificationActions);
        }
      } else if (message.notificationType === "sighting") {
        item = await db.getSighting(message.id);
      }

      // Send a push notification via ntfy.sh
      const ntfyResponse = await fetch(`${ntfyEndpoint}`, {
        headers: {
          "Title": notificationTitle,
          "Tags": notificationTags,
          "Actions": notificationActions
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
      item.notificationId = notificationItem.id;
      await db.saveMessage(item);
    }
  }
});