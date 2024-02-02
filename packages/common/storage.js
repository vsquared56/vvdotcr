import {
    BlobServiceClient,
    StorageSharedKeyCredential,
    newPipeline
  } from "@azure/storage-blob";

export async function downloadOriginalSighting(filename) {
    const STORAGE_ACCOUNT = process.env.STORAGE_ACCOUNT;
    const STORAGE_KEY = process.env.STORAGE_KEY;
    const storageContainer = "vvdotcr-sightings-originals-dev";
    const storageUrl = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;

    // Set auth credentials for download
    const sharedKeyCredential = new StorageSharedKeyCredential(STORAGE_ACCOUNT, STORAGE_KEY);
    const pipeline = newPipeline(sharedKeyCredential);

    // Download the files
    const blobServiceClient = new BlobServiceClient(storageUrl, pipeline);
    const containerClient = blobServiceClient.getContainerClient(storageContainer);
    const downloadBlobClient = containerClient.getBlobClient(`originals/${filename}`);
    const downloadBlobResponse = await downloadBlobClient.downloadToBuffer();

    return downloadBlobResponse;
}

export async function uploadSighting(filePath, type, buffer) {
    const STORAGE_ACCOUNT = process.env.STORAGE_ACCOUNT;
    const STORAGE_KEY = process.env.STORAGE_KEY;
    var storageContainer;
    if (type === "original") {
        storageContainer = "vvdotcr-sightings-originals-dev";
    } else if (type === "public") {
        storageContainer = "vvdotcr-sightings-public-dev";
    } else {
        throw new Error("Unsupported sighting file type, must be one of 'original' or 'public'");
    }

    const storageUrl = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;

    // Set auth credentials for upload
    const sharedKeyCredential = new StorageSharedKeyCredential(STORAGE_ACCOUNT, STORAGE_KEY);
    const pipeline = newPipeline(sharedKeyCredential);

    // Upload the files
    const blobServiceClient = new BlobServiceClient(storageUrl, pipeline);
    
    try {
        const containerClient = blobServiceClient.getContainerClient(storageContainer);
        const uploadBlobClient = containerClient.getBlockBlobClient(filePath);
        const uploadBlobResponse = await uploadBlobClient.uploadData(buffer);
    } catch {
        throw new Error("Error uploading file to Azure storage.");
    }
    const sightingUrl = `${storageUrl}/${storageContainer}/${filePath}`;

    return sightingUrl;
}