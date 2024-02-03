import { app } from '@azure/functions';
import { ServiceBusClient } from "@azure/service-bus";
import exifr from "exifr";
import fetch from 'node-fetch';
import sharp from "sharp";
import circle from '@turf/circle';
import booleanIntersects from '@turf/boolean-intersects';

import * as utils from "@vvdotcr/common";

const SERVICE_BUS_CONNECTION_STRING = process.env.SERVICE_BUS_CONNECTION_STRING;

app.serviceBusQueue('submission-approval', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    queueName: 'new-sightings-to-validate',
    handler: async (message, context) => {
        const item = await utils.getSighting(message);
        const minLocationAccuracy = await utils.getSetting("min_location_accuracy_meters");

        if (item.imageLocation === null || item.imageLocation.latitude === null || item.imageLocation.longitude === null) {
            item.submissionStatus = 'needsManualApproval';
            item.automaticApprovalDenied = 'missingLocation';
        } else if (item.imageLocation.source === 'browser' && item.imageLocation.accuracy > minLocationAccuracy) {
            item.submissionStatus = 'needsManualApproval';
            item.automaticApprovalDenied = 'inaccurateBrowserLocation';
        }
        else {
            const geolockedLocations = await utils.getSetting("geolocked_locations");
            const center = [item.imageLocation.longitude, item.imageLocation.latitude];
            const radius = item.imageLocation.accuracy;
            const options = { steps: 20, units: 'meters' };
            const imageCircle = circle(center, radius, options);
            var isGeolocked = false;

            for (const geolock of geolockedLocations.features) {
                if (booleanIntersects(geolock, imageCircle)) {
                    isGeolocked = true;
                }
            }

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

        await utils.saveSighting(item);
    },
});