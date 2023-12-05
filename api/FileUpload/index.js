const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline
} = require("@azure/storage-blob");
const { CosmosClient } = require("@azure/cosmos");
const parseMultipartFormData = require("@anzp/azure-function-multipart").default;
const crypto = require('crypto');
const streamifier = require('streamifier');
const path = require('path'); 

const ALLOWED_IMAGE_EXTENSIONS = ["png","jpg"]

const STORAGE_ACCOUNT = process.env.STORAGE_ACCOUNT;
const STORAGE_KEY = process.env.STORAGE_KEY;
const STORAGE_CONTAINER = process.env.STORAGE_CONTAINER;
const STORAGE_URL = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;

const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;

module.exports = async function (context, req) {
  const { fields, files } = await parseMultipartFormData(req);
  const fileId = crypto.randomUUID();
  const contentType = files[0].mimetype;
  const originalFileName = files[0].filename;
  const originalFileExtension = path.extname(originalFileName).toLowerCase();

  if (files.length != 1) {
    context.res = {
      status: 400,
      body: {
        error: "Expected only one file upload.",
        fields: fields,
        files: files
      }
    };
  }
  else if (files[0].bufferFile.length >= 2*1024*1024 ) {
    context.res = {
      status: 400,
      body: {
        error: "File sizes above 2MB are not supported.",
        size: files[0].bufferFile.data.length
      }
    };
  }
  else if (!(ALLOWED_IMAGE_EXTENSIONS.includes(originalFileExtension)) || (contentType != `image/${originalFileExtension}`)) {
    context.res = {
      status: 400,
      body: {
        error: "Invalid file type.",
        contentType: contentType,
        originalFileName: originalFileName,
        originalFileExtension: originalFileExtension
      }
    };
  }
  else {
    const fileData = files[0].bufferFile;
    const fileName = fileId;
    
    // Set auth credentials for upload
    const sharedKeyCredential = new StorageSharedKeyCredential(
      STORAGE_ACCOUNT,
      STORAGE_KEY
    );
    const pipeline = newPipeline(sharedKeyCredential);

    // Upload the file
    const blobServiceClient = new BlobServiceClient(STORAGE_URL, pipeline);
    const containerClient =
      blobServiceClient.getContainerClient(STORAGE_CONTAINER);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    const uploadBlobResponse = await blockBlobClient.uploadStream(
      streamifier.createReadStream(new Buffer(fileData)),
      fileData.length,
      5,
      {
        blobHTTPHeaders: {
          blobContentType: contentType
        }
      }
    );

    const createDate = Date.now();
    const item = {
      id: fileName,
      originalFileName: originalFileName,
      originalFileType: contentType,
      uploadUserAgent: req.headers['user-agent'],
      uploadXFF: req.headers['x-forwarded-for'],
      createDate: createDate,
      modifyDate: createDate,
      imageUrl: `${STORAGE_URL}/${STORAGE_CONTAINER}/${fileName}`
    }

    const cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
    const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_DATABASE_NAME });
    const { container } = await database.containers.createIfNotExists({
      id: "vvdotcr-fileupload-dev",
      partitionKey: {
        paths: "/id"
      }
    });
    const { resource } = await container.items.create(item);

    context.res = {
      body: {
        imageUrl: `${STORAGE_URL}/${STORAGE_CONTAINER}/${fileName}`,
        cosmosResource: resource
      }
    };
  }
};