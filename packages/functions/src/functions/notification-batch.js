import { Eta } from "eta";
import * as url from 'url';
import * as crypto from "crypto";
import { app } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";
import { ServiceBusClient } from "@azure/service-bus";

import * as utils from "@vvdotcr/common";

const serviceBusConnectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
const emailConnectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
const emailFrom = process.env.EMAIL_FROM_ADDRESS;
const emailTo = process.env.EMAIL_NOTIFICATION_ADDRESS;

app.timer('notification-batch', {
  schedule: '*/1 * * * *',
  handler: async (myTimer, context) => {
    const eta = new Eta(
      {
        views: url.fileURLToPath(new URL('../../views', import.meta.url))
      });

    const db = new utils.Database;
    const sbClient = new ServiceBusClient(serviceBusConnectionString);
    const sbReceiver = sbClient.createReceiver("batch-notifications");
    const queuedItems = await sbReceiver.receiveMessages(5, {maxWaitTimeInMs: 100});

    if (queuedItems.length > 0) {
      const notificationId = crypto.randomUUID();
      try {
        var emailTitle = "New vv.cr dev activity";
        var submittedMessages = [];
        var submittedSightings = [];
        for (const item of queuedItems) {
          if (item.body.notificationType === "message") {
            var message = await db.getMessage(item.body.id);
            message.notificationId = notificationId;
            message.notificationStatus = message.notificationStatus.map(function (status) {
              return (status === "queuedBatchNotification" ? "sentViaEmail" : status);
            });
            await db.saveMessage(message);
            submittedMessages.push(message);
          } else if (item.body.notificationType === "sighting") {
            var sighting = await db.getSighting(item.body.id);
            sighting.notificationId = notificationId;
            sighting.notificationStatus = sighting.notificationStatus.map(function (status) {
              return (status === "queuedBatchNotification" ? "sentViaEmail" : status);
            });
            await db.saveSighting(sighting);
            submittedSightings.push(sighting);
          }
        }

        var emailBody = eta.render(
          "./email_notification",
          {
            submittedMessages: submittedMessages.map(msg => (
              {
                ...msg,
                messageDate: new Date(msg.createDate).toLocaleString()
              })),
            submittedSightings: submittedSightings.map(s => (
              {
                ...s,
                sightingDate: new Date(s.createDate).toLocaleString()
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