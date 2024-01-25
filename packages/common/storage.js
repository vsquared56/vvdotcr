import {
    BlobServiceClient,
    StorageSharedKeyCredential,
    newPipeline
  } from "@azure/storage-blob";

export async function downloadSighting(filename) {
    const STORAGE_ACCOUNT = process.env.STORAGE_ACCOUNT;
    const STORAGE_KEY = process.env.STORAGE_KEY;
    const STORAGE_CONTAINER = "vvdotcr-fileupload-dev";
    const STORAGE_URL = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;

    // Set auth credentials for download
    const sharedKeyCredential = new StorageSharedKeyCredential(STORAGE_ACCOUNT, STORAGE_KEY);
    const pipeline = newPipeline(sharedKeyCredential);

    // Download the files
    const blobServiceClient = new BlobServiceClient(STORAGE_URL, pipeline);
    const containerClient = blobServiceClient.getContainerClient(STORAGE_CONTAINER);
    const downloadBlobClient = containerClient.getBlobClient(`originals/${filename}`);
    const downloadBlobResponse = await downloadBlobClient.downloadToBuffer();

    return downloadBlobResponse;
}

export async function uploadSighting(filePath, buffer) {
    const STORAGE_ACCOUNT = process.env.STORAGE_ACCOUNT;
    const STORAGE_KEY = process.env.STORAGE_KEY;
    const STORAGE_CONTAINER = "vvdotcr-fileupload-dev";
    const STORAGE_URL = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;

    // Set auth credentials for upload
    const sharedKeyCredential = new StorageSharedKeyCredential(STORAGE_ACCOUNT, STORAGE_KEY);
    const pipeline = newPipeline(sharedKeyCredential);

    // Upload the files
    const blobServiceClient = new BlobServiceClient(STORAGE_URL, pipeline);
    const containerClient = blobServiceClient.getContainerClient(STORAGE_CONTAINER);
    const uploadBlobClient = containerClient.getBlockBlobClient(filePath);
    const uploadBlobResponse = await uploadBlobClient.uploadData(buffer);
    const sightingUrl = `${STORAGE_URL}/${STORAGE_CONTAINER}/${filePath}`;

    return sightingUrl;
}