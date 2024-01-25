import { app } from '@azure/functions';
import { ServiceBusClient } from "@azure/service-bus";
import exifr from "exifr";
import fetch from 'node-fetch';
import sharp from "sharp";

import * as utils from "@vvdotcr/common";

const SERVICE_BUS_CONNECTION_STRING = process.env.SERVICE_BUS_CONNECTION_STRING;
const VISION_API_ENDPOINT = process.env.VISION_API_ENDPOINT;
const VISION_API_KEY = process.env.VISION_API_KEY;

app.serviceBusQueue('process-image', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    queueName: 'new-file-uploads',
    handler: async (message, context) => {
        const item = await utils.getSighting(message);
        const originalSighting = await utils.downloadSighting(item.fileName);

        // Resize to 600px
        const resizedBuffer = await sharp(originalSighting)
            .resize(600)
            .jpeg()
            .toBuffer();

        // Upload the resized image to Blob storage
        const thumbnailImageUrl = await utils.uploadSighting(`resized/${item.id}.jpeg`, resizedBuffer);

        // Send the image to the Azure Vision API
        const visionResponse = await fetch(`${VISION_API_ENDPOINT}/vision/v3.1/tag`, {
            headers: {
                "Content-Type": "application/json",
                "Ocp-Apim-Subscription-Key": VISION_API_KEY
            },
            method: "POST",
            body: JSON.stringify({ url: thumbnailImageUrl })
        })
        const visionData = await visionResponse.json();

        // Parse location from EXIF data
        var submissionStatus;
        const locationData = await exifr.gps(originalSighting);

        if (locationData == null) {
            submissionStatus = "locationRequest";
            item.imageLocation = null;
        } else {
            submissionStatus = "pendingAutomaticApproval";
            item.imageLocation = {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                accuracy: null,
                timestamp: null,
                source: "exif"
            };
        }
        
        item.submissionStatus = submissionStatus;
        item.thumbnailImageUrl = thumbnailImageUrl;
        item.visionData = visionData;
        item.processingLatency = item.modifyDate - item.createDate;

        await utils.saveSighting(item);

        // Send a Service Bus Message
        const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
        const sbSender = sbClient.createSender('new-sightings-to-validate');
        try {
          await sbSender.sendMessages({ body: item.id });
        } finally {
          await sbClient.close();
        }
    },
});