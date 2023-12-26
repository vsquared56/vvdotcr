import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import {
    BlobServiceClient,
    StorageSharedKeyCredential,
    newPipeline
} from "@azure/storage-blob";
import sharp from "sharp";

app.serviceBusQueue('process-image', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    queueName: 'new-file-uploads',
    handler: async (message, context) => {
        var item;
        const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
        const { database } = await cosmosClient.databases.createIfNotExists({ id: process.env.COSMOS_DB_DATABASE_NAME });
        const { container } = await database.containers.createIfNotExists({
            id: "vvdotcr-fileupload-dev",
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

        // Set auth credentials for upload
        const STORAGE_URL = `https://${process.env.STORAGE_ACCOUNT}.blob.core.windows.net`;
        const sharedKeyCredential = new StorageSharedKeyCredential(
            process.env.STORAGE_ACCOUNT,
            process.env.STORAGE_KEY
        );
        const pipeline = newPipeline(sharedKeyCredential);

        // Download the files
        const blobServiceClient = new BlobServiceClient(STORAGE_URL, pipeline);
        const containerClient =
            blobServiceClient.getContainerClient(process.env.STORAGE_CONTAINER);
        const downloadBlobClient = containerClient.getBlobClient(`originals/${item.fileName}`);
        const downloadBlobResponse = await downloadBlobClient.downloadToBuffer();

        const resizedBuffer = await sharp(downloadBlobResponse)
        .resize(300)
        .jpeg()
        .toBuffer();

        const uploadBlobClient = containerClient.getBlockBlobClient(`resized/${item.id}.jpeg`);
        const uploadBlobResponse = await uploadBlobClient.uploadData(resizedBuffer);

        item.modifyDate = Date.now();

        const { upsert } = await container.items.upsert(item);

    },
});