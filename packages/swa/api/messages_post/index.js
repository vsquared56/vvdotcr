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
  var formResults = {};
  const formItems = {
    driving: {
      speed: { type: "select", validValues: ["faster", "slower", "ok"] }
    },
    parking: {
      parkingQuality: { type: "select", validValues: ["bad", "too-close", "too-far", "ok"] }
    },
    rating: {
      ratingValue: { type: "int", min: 1, max: 5 },
      ratingType: { type: "toggle", offValue: "starRating", onValue: "gtaRating" },
    }
  }

  var badRequest = false;
  for (let formName in formItems) {
    var formSent = form.get(formName);
    if (!formSent || formSent.value.toString() !== "on") { //Individual forms (driving/parking/etc) can be toggled on
      formResults[formName] = null;
    } else {
      formResults[formName] = {};
      for (let formItem in formItems[formName]) {
        const formValue = form.get(formItem);
        var validatedValue;
        if (formItems[formName][formItem].type === "toggle") { //Toggle values can be missing, check them first
          if (!formValue) {
            validatedValue = formItems[formName][formItem].offValue;
          } else if (formValue.value.toString() === "on") {
            validatedValue = formItems[formName][formItem].onValue;
          } else {
            badRequest = true;
            console.log(`Bad request -- toggle value ${formItem} is set, but the value is not 'on'.`);
          }
        } else if (!formValue) {
          badRequest = true;
          validatedValue = null;
          console.log(`Bad request -- required value ${formItem} is missing.`);
        } else if (formItems[formName][formItem].type === "select") {
          validatedValue = formValue.value.toString();
          if (!formItems[formName][formItem].validValues.includes(validatedValue)) {
            badRequest = true;
            console.log(`Bad request -- select value ${formItem} is not one of the allowed options.`);
          }
        } else if (formItems[formName][formItem].type === "int") {
          validatedValue = parseInt(formValue.value.toString());
          if (validatedValue < formItems[formName][formItem].min || validatedValue > formItems[formName][formItem].max) {
            badRequest = true;
            console.log(`Bad request -- int value ${formItem} is out of range.`);
          }
        }
        formResults[formName][formItem] = validatedValue;
      }
    }
  }

  if (badRequest) {
    context.res = {
      status: 400,
      body: ""
    };
  } else {
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
      notificationStatusReason: notificationStatusReason,
      messageData: formResults
    }

    //Save message to CosmosDB
    await db.saveMessage(item);

    // Send a Service Bus Message
    const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
    const sbSender = sbClient.createSender('new-message-submissions');
    try {
      await sbSender.sendMessages({ body: messageId });
    } finally {
      await sbClient.close();
    }

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
  }
};