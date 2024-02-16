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
        const db = new utils.Database;
        const storage = new utils.Storage;

        const item = await db.getSighting(message);
        const originalSighting = await storage.downloadSighting('originals', item.fileName);
        
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

        const thumbnailImageUrl = await storage.uploadSighting('thumb', `${item.id}.jpeg`, croppedBuffer);

        // Resize the image to a reasonable size
        const largeBuffer = await sharp(originalSighting)
            .rotate()
            .jpeg()
            .toBuffer();

        const largeImageUrl = await storage.uploadSighting('large', `${item.id}.jpeg`, largeBuffer);

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
        item.largeImageUrl = largeImageUrl;
        item.visionData = visionData;
        item.processingLatency = item.modifyDate - item.createDate;

        await db.saveSighting(item);

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