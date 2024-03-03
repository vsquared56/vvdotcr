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

    var targetItemPatchOps;
    if (isRateLimited) {
      try {
        await batchNotificationsSender.sendMessages({ body: sbMessage});
      } finally {
        await sbClient.close();
      }

      targetItemPatchOps =
      [
        { op: "replace", path: "/notificationStatus/push/status", value: "rateLimited"},
        { op: "replace", path: "/notificationStatus/batch/status", value: "queued"},
      ];
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
        if (targetItem.submissionStatus === "needsManualApproval") {
          notificationTitle = "New vv.cr sighting needs approval";
          notificationTags = "camera,question"
        } else if (targetItem.submissionStatus === "approved") {
          notificationTitle = "New vv.cr sighting automatically approved";
          notificationTags = "camera,white_check_mark	"
        } else {
          notificationTitle = "New vv.cr sighting with unknown status";
          notificationTags = "camera,error"
        }
        
        notificationBody = eta.render(
          "./ntfy_sighting_notification",
          {
            sighting: targetItem,
            sightingDate: (new Date(targetItem.createDate)).toLocaleString()
          }
        );
        notificationActions = `view, See Image, '${targetItem.largeImageUrl}';`;
        if (targetItem.imageLocation) {
          notificationActions += `view, See Location, 'geo:0,0?q=${targetItem.imageLocation.latitude},${targetItem.imageLocation.longitude}';`;
        }
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

      targetItemPatchOps =
      [
        { op: "replace", path: "/notificationStatus/push/status", value: "sentViaNtfy"},
        { op: "replace", path: "/notificationStatus/push/notificationId", value: notificationItem.id},
        { op: "replace", path: "/notificationStatus/batch/status", value: "queued"},
      ];
    }

    // Patch update the target item regardless of rate limiting or not
    if (sbMessage.notificationType === "message") {
      await db.patchMessage(targetItem.id, targetItemPatchOps);
    } else if (sbMessage.notificationType === "sighting") {
      await db.patchSighting(targetItem.id, targetItemPatchOps);
    }
  }
});