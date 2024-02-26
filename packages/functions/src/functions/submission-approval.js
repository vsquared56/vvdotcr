import { app } from '@azure/functions';
import { ServiceBusClient } from "@azure/service-bus";
import exifr from "exifr";
import fetch from 'node-fetch';
import sharp from "sharp";

import * as utils from "@vvdotcr/common";

const SERVICE_BUS_CONNECTION_STRING = process.env.SERVICE_BUS_CONNECTION_STRING;

app.serviceBusQueue('submission-approval', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    queueName: 'new-sightings-to-validate',
    handler: async (message, context) => {
        const db = new utils.Database;

        const item = await db.getSighting(message);
        const minLocationAccuracy = await db.getSetting("min_location_accuracy_meters");

        if (item.imageLocation === null || item.imageLocation.latitude === null || item.imageLocation.longitude === null) {
            item.submissionStatus = 'needsManualApproval';
            item.automaticApprovalDenied = 'missingLocation';
        } else if (item.imageLocation.source === 'browser' && item.imageLocation.accuracy > minLocationAccuracy) {
            item.submissionStatus = 'needsManualApproval';
            item.automaticApprovalDenied = 'inaccurateBrowserLocation';
        }
        else {
            const geolockedLocations = await db.getSetting("geolocked_locations");
            const isGeolocked = utils.isLocationInFeatureCollection(item.imageLocation, geolockedLocations);

            if (isGeolocked) {
                item.submissionStatus = 'needsManualApproval';
                item.automaticApprovalDenied = 'geolocked';
            } else {
                item.submissionStatus = 'approved';
                item.isPublished = true;
                item.publishDate = Date.now();
                item.publishedBy = "automaticApproval";
            }
        }

        await db.saveSighting(item);
    },
});