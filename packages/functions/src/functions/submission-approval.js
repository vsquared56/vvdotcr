import { app } from '@azure/functions';
import { ServiceBusClient } from "@azure/service-bus";

import * as utils from "@vvdotcr/common";

const serviceBusConnectionString = process.env.SERVICE_BUS_CONNECTION_STRING;

app.serviceBusQueue('submission-approval', {
  connection: 'SERVICE_BUS_CONNECTION_STRING',
  queueName: 'new-sightings-to-validate',
  handler: async (message, context) => {
    const db = new utils.Database;

    const sighting = await db.getSighting(message);
    const minLocationAccuracy = await db.getSetting("min_location_accuracy_meters");

    if (sighting.imageLocation === null || sighting.imageLocation.latitude === null || sighting.imageLocation.longitude === null) {
      sighting.submissionStatus = 'needsManualApproval';
      sighting.automaticApprovalDenied = 'missingLocation';
    } else if (sighting.imageLocation.source === 'browser' && sighting.imageLocation.accuracy > minLocationAccuracy) {
      sighting.submissionStatus = 'needsManualApproval';
      sighting.automaticApprovalDenied = 'inaccurateBrowserLocation';
    }
    else {
      const geolockedLocations = await db.getSetting("geolocked_locations");
      const isGeolocked = utils.isLocationInFeatureCollection(sighting.imageLocation, geolockedLocations);

      if (isGeolocked) {
        sighting.submissionStatus = 'needsManualApproval';
        sighting.automaticApprovalDenied = 'geolocked';
      } else {
        sighting.submissionStatus = 'approved';
        sighting.isPublished = true;
        sighting.publishDate = Date.now();
        sighting.publishedBy = "automaticApproval";
      }
    }

    sighting.notificationStatus.push("queuedPushNotification");
    const sbClient = new ServiceBusClient(serviceBusConnectionString);
    const sbSender = sbClient.createSender("immediate-notifications");
    try {
      await sbSender.sendMessages({ body: { notificationType: "sighting", id: sighting.id }});
    } finally {
      await sbClient.close();
    }

    await db.saveSighting(sighting);
  },
});