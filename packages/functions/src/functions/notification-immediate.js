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
  handler: async (sbMessage, context) => {
    const eta = new Eta(
      {
        views: url.fileURLToPath(new URL('../../views', import.meta.url))
      });
    const db = new utils.Database;

    const sbClient = new ServiceBusClient(serviceBusConnectionString);
    const batchNotificationsSender = sbClient.createSender("batch-notifications");

    var targetItem;
    if (sbMessage.notificationType === "message") { //New message form submissions
      targetItem = await db.getMessage(sbMessage.id);
    } else if (sbMessage.notificationType === "sighting") {
      targetItem = await db.getSighting(sbMessage.id);
    }

    const rateLimits = await db.getSetting("notification-rate-limits");
    var isRateLimited = false;
    for (var limit of rateLimits) {
      const recentNotifications = await db.countRecentNotifications((Date.now() - limit.seconds * 1000));
      if (recentNotifications >= limit.limit) {
        isRateLimited = true;
      }
    }

    if (isRateLimited) {
      try {
        await batchNotificationsSender.sendMessages({ body: sbMessage});
      } finally {
        await sbClient.close();
      }

      targetItem.notificationStatus = targetItem.notificationStatus.map(function (status) {
        return (status === "queuedPushNotification" ? "rateLimitedPushNotification" : status);
      });
      targetItem.notificationStatus.push("queuedBatchNotification");
      targetItem.notificationId = notificationItem.id;

      if (sbMessage.notificationType === "message") {
        await db.saveMessage(targetItem);
      } else if (sbMessage.notificationType === "sighting") {
        await db.saveSighting(targetItem);
      }
    } else {
      var notificationTitle, notificationTags, notificationBody;
      var notificationActions = "";
      if (sbMessage.notificationType === "message") { //New message form submissions
        notificationTitle = "New vv.cr message";
        notificationTags = "mailbox";
        notificationBody = eta.render(
          "./ntfy_message_notification",
          {
            message: targetItem,
            messageDate: (new Date(targetItem.createDate)).toLocaleString()
          }
        );
        if (targetItem.messageLocation) {
          notificationActions += `view, See Location, 'geo:0,0?q=${targetItem.messageLocation.latitude},${targetItem.messageLocation.longitude}';`;
        }
      } else if (sbMessage.notificationType === "sighting") {
        targetItem = await db.getSighting(sbMessage.id);
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
        type: sbMessage.notificationType,
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

      try {
        await batchNotificationsSender.sendMessages({ body: sbMessage});
      } finally {
        await sbClient.close();
      }

      targetItem.notificationStatus = targetItem.notificationStatus.map(function (status) {
        return (status === "queuedPushNotification" ? "sentViaNtfy" : status);
      });
      targetItem.notificationStatus.push("queuedBatchNotification");
      targetItem.notificationId = notificationItem.id;
      if (sbMessage.notificationType === "message") {
        await db.saveMessage(targetItem);
      } else if (sbMessage.notificationType === "sighting") {
        await db.saveSighting(targetItem);
      }
      console.log(targetItem);
    }
  }
});