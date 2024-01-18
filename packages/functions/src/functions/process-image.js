import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import exifr from "exifr";
import fetch from 'node-fetch';
import sharp from "sharp";

import * as utils from "@vvdotcr/common";

const STORAGE_CONTAINER = "vvdotcr-fileupload-dev";

const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;
const SERVICE_BUS_CONNECTION_STRING = process.env.SERVICE_BUS_CONNECTION_STRING;
const VISION_API_ENDPOINT = process.env.VISION_API_ENDPOINT;
const VISION_API_KEY = process.env.VISION_API_KEY;

app.serviceBusQueue('process-image', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    queueName: 'new-file-uploads',
    handler: async (message, context) => {
        var item;
        const cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
        const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_DATABASE_NAME });
        const { container } = await database.containers.createIfNotExists({
            id: STORAGE_CONTAINER,
            partitionKey: {
                paths: "/id"
            }
        });

        const { resource } = await container.item(message, message).read();
        if (resource === undefined) {
            throw new Error(`Error reading file upload document ${message} from CosmosDB`);
        }
        else {
            item = resource;
        }

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
            submissionStatus = "accepted";
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
        item.modifyDate = Date.now();
        item.processingLatency = item.modifyDate - item.createDate;

        const { upsert } = await container.items.upsert(item);
    },
});