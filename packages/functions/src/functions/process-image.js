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
        const originalSighting = await utils.downloadOriginalSighting(item.fileName);
        
        // Get image data from the Azure Vision API
        const visionResponse = await fetch(`${VISION_API_ENDPOINT}/computervision/imageanalysis:analyze?api-version=2023-10-01&features=smartCrops,objects,tags&smartcrops-aspect-ratios=1.0`, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Ocp-Apim-Subscription-Key": VISION_API_KEY
            },
            method: "POST",
            body: originalSighting
        })
        const visionData = await visionResponse.json();

        // Crop the image with Sharp using the vision data bounding box
        const cropBoundingBox = visionData.smartCropsResult.values[0].boundingBox;
        const croppedBuffer = await sharp(originalSighting)
            .extract({ left: cropBoundingBox.x, top: cropBoundingBox.y, width: cropBoundingBox.w, height: cropBoundingBox.h })
            .rotate()
            .resize(600)
            .jpeg()
            .toBuffer();

        const thumbnailImageUrl = await utils.uploadSighting(`thumb/${item.id}.jpeg`, 'public', croppedBuffer);

        // Resize the image to a reasonable size
        const resizedBuffer = await sharp(originalSighting)
            .rotate()
            .resize(600)
            .jpeg()
            .toBuffer();

        const resizedImageUrl = await utils.uploadSighting(`large/${item.id}.jpeg`, 'public', resizedBuffer);

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
        item.largeImageUrl = resizedImageUrl;
        item.visionData = visionData;
        item.processingLatency = item.modifyDate - item.createDate;

        await utils.saveSighting(item);

        if (submissionStatus === "pendingAutomaticApproval") {
            // Send a Service Bus Message
            const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
            const sbSender = sbClient.createSender('new-sightings-to-validate');
            try {
                await sbSender.sendMessages({ body: item.id });
            } finally {
                await sbClient.close();
            }
        }
    }
});