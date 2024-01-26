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
        const item = await utils.getSighting(message);

        if (item.imageLocation === null) {
            item.submissionStatus = "needsManualApproval";
        } else {
            item.submissionStatus = "approved";
        }
        
        await utils.saveSighting(item);
    },
});