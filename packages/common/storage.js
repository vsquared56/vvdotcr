import {
    BlobServiceClient,
    StorageSharedKeyCredential,
    newPipeline
  } from "@azure/storage-blob";

export class Storage {
    constructor() {
        const storageKey = process.env.STORAGE_KEY;
        const storageAccount = process.env.STORAGE_ACCOUNT
        const storageUrl = `https://${storageAccount}.blob.core.windows.net`;

        // Set auth credentials for upload
        const sharedKeyCredential = new StorageSharedKeyCredential(storageAccount, storageKey);
        const pipeline = newPipeline(sharedKeyCredential);

        const blobServiceClient = new BlobServiceClient(storageUrl, pipeline);
        try {
            this.privateContainerClient = blobServiceClient.getContainerClient("vvdotcr-sightings-originals-dev");
            this.publicContainerClient = blobServiceClient.getContainerClient("vvdotcr-sightings-public-dev");
        } catch {
            throw new Error("Error getting container clients for Azure storage.");
        }
    }

    getContainer(type) {
        if (type === "originals") {
            return this.privateContainerClient
        } else {
            return this.publicContainerClient
        }
    }

    getPath(type, filename) {
        if (type.match(/^(originals|thumb|large)$/)) {
            return `${type}/${filename}`;
        }
    }

    async deleteSightingFile(type, filename) {
        const container = this.getContainer(type);
        const path = this.getPath(type, filename);

        const deleteBlobClient = container.getBlobClient(path);
        const deleteBlobResponse = await deleteBlobClient.delete();
    }

    async downloadSighting(type, filename) {
        const container = this.getContainer(type);
        const path = this.getPath(type, filename);

        const downloadBlobClient = container.getBlobClient(path);
        const downloadBlobResponse = await downloadBlobClient.downloadToBuffer();

        return downloadBlobResponse;
    }

    async uploadSighting(type, filename, buffer) {
        const container = this.getContainer(type);
        const path = this.getPath(type, filename);

        const uploadBlobClient = container.getBlockBlobClient(path);
        const uploadBlobResponse = await uploadBlobClient.uploadData(buffer);
        const sightingUrl = `${this.storageUrl}/${container.containerName}/${path}`;
    
        return sightingUrl;
    }
}