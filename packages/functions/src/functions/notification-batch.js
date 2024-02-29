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
  schedule: '*/5 * * * *',
  handler: async (myTimer, context) => {
    const db = new utils.Database;
    const sbClient = new ServiceBusClient(serviceBusConnectionString);
    const sbReceiver = sbClient.createReceiver("batch-notifications");
    const queuedItems = await sbReceiver.receiveMessages(2);

    if (queuedItems.length > 0) {
      try {
        var emailTitle = "New vv.cr dev activity";
        var emailBody = "";
        for (const item of queuedItems) {
          if (item.body.notificationType === "message") {
            console.log("New message");
            const message = await db.getMessage(item.body.id);
            emailBody += `New message: ${JSON.stringify(message.messageData)}\n\n`
          } else if (item.body.notificationType === "sighting") {
            console.log("New sighting");
          }
        }

        //Send email
        const client = new EmailClient(emailConnectionString);
        const emailMessage = {
          senderAddress: emailFrom,
          content: {
            subject: emailTitle,
            plainText: emailBody,
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
        console.log(e);
        for (const item of queuedItems) {
          sbReceiver.deadLetterMessage(item);
        }
      }

      const createDate = Date.now();
      const notificationItem = {
        id: crypto.randomUUID(),
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