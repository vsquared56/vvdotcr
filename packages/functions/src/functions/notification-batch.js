import { Eta } from "eta";
import * as url from "url";
import * as crypto from "crypto";
import { app } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";
import { ServiceBusClient } from "@azure/service-bus";

import * as utils from "@vvdotcr/common";

const serviceBusConnectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
const emailConnectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
const emailFrom = process.env.EMAIL_FROM_ADDRESS;
const emailTo = process.env.EMAIL_NOTIFICATION_ADDRESS;

app.timer("notification-batch", {
  schedule: "*/15 * * * *",
  handler: async (myTimer, context) => {
    const eta = new Eta(
      {
        views: url.fileURLToPath(new URL("../../views", import.meta.url))
      });

    const db = new utils.Database;
    const sbClient = new ServiceBusClient(serviceBusConnectionString);
    const sbReceiver = sbClient.createReceiver("batch-notifications");
    const queuedItems = await sbReceiver.receiveMessages(5, {maxWaitTimeInMs: 100});
    const environment = process.env.ENVIRONMENT_NAME.toLowerCase();

    if (queuedItems.length > 0) {
      const notificationId = crypto.randomUUID();
      try {
        var emailTitle = `New vv.cr ${environment} activity`;
        var submittedMessages = [];
        var submittedSightings = [];
        for (const item of queuedItems) {
          const patchOps =
          [
            { op: "replace", path: "/notificationStatus/batch/notificationId", value: notificationId},
            { op: "replace", path: "/notificationStatus/batch/status", value: "sentViaEmail"},
          ];

          if (item.body.notificationType === "message") {
            var message = await db.getMessage(item.body.id);
            db.patchMessage(message.id, patchOps);
            message.notificationStatus.batch.notificationId = notificationId;
            message.notificationStatus.batch.status = "sentViaEmail";
            submittedMessages.push(message);
          } else if (item.body.notificationType === "sighting") {
            var sighting = await db.getSighting(item.body.id);
            db.patchSighting(sighting.id, patchOps);
            sighting.notificationStatus.batch.notificationId = notificationId;
            sighting.notificationStatus.batch.status = "sentViaEmail";
            submittedSightings.push(sighting);
          }
        }

        var emailBody = eta.render(
          "./email_notification",
          {
            submittedMessages: submittedMessages.map(msg => (
              {
                ...msg,
                messageDate: new Date(msg.createDate).toLocaleString(utils.dateTimeLocale, utils.dateTimeOptions)
              })),
            submittedSightings: submittedSightings.map(s => (
              {
                ...s,
                sightingDate: new Date(s.createDate).toLocaleString(utils.dateTimeLocale, utils.dateTimeOptions)
              })),
          }
        );

        //Send email
        const client = new EmailClient(emailConnectionString);
        const emailMessage = {
          senderAddress: emailFrom,
          content: {
            subject: emailTitle,
            html: emailBody
          },
          recipients: {
            to: [{ address: emailTo }],
          },
        };

        const poller = await client.beginSend(emailMessage);
        var result = await poller.pollUntilDone();
        for (const item of queuedItems) {
          sbReceiver.completeMessage(item);
        }
      }
      catch(e){
        context.error(e);
        for (const item of queuedItems) {
          sbReceiver.deadLetterMessage(item);
        }
      }

      const createDate = Date.now();
      const notificationItem = {
        id: notificationId,
        type: "batch",
        service: "email",
        destination: emailTo,
        serviceResponse: result,
        createDate: createDate,
        modifyDate: createDate,
        notificationTitle: emailTitle,
        notificationBody: emailBody
      };

      await db.saveNotification(notificationItem);
    }
  }
});