const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline
} = require("@azure/storage-blob");
const { CosmosClient } = require("@azure/cosmos");
const parseMultipartFormData = require("@anzp/azure-function-multipart").default;
const Handlebars = require("handlebars");
const crypto = require('crypto');
const streamifier = require('streamifier');
const fs = require('fs');
const path = require("path");
const handlebars = require("handlebars");

//Maps file extensions to MIME types
const ALLOWED_IMAGE_TYPES = {
  "png": "image/png",
  "jpg": "image/jpeg",
  "jpeg": "image/jpeg"
}

const STORAGE_ACCOUNT = process.env.STORAGE_ACCOUNT;
const STORAGE_KEY = process.env.STORAGE_KEY;
const STORAGE_CONTAINER = process.env.STORAGE_CONTAINER;
const STORAGE_URL = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;

const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;

module.exports = async function (context, req) {
  if (req.method === "GET") {
    const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sighting_submit.hbs');
    const templateContent = fs.readFileSync(directoryPath).toString();
    var template = handlebars.compile(templateContent);
  
    context.res = {
      status: 200,
      body: template({ name: "Vlad" })
    };
  }
  else if (req.method === "POST") {
    const { fields, files } = await parseMultipartFormData(req);
    const fileId = crypto.randomUUID();
    const contentType = files[0].mimeType;
    const originalFileName = files[0].filename;
    const originalFileExtension = path.extname(originalFileName).toLowerCase().replace(/^\./, '');
    const originalFileSize = files[0].bufferFile.length;

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
    else if (originalFileSize >= 8 * 1024 * 1024) {
      const templateContent = fs.readFileSync(context.executionContext.functionDirectory + '\\configAPI.json')
      context.res = {
        status: 400,
        body: {
          error: "File sizes above 8MB are not supported.",
          size: files[0].bufferFile.length
        }
      };
    }
    else if (!(originalFileExtension in ALLOWED_IMAGE_TYPES) || (ALLOWED_IMAGE_TYPES[originalFileExtension] != contentType)) {
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
      const fileName = `${fileId}.${originalFileExtension}`;

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
      const blockBlobClient = containerClient.getBlockBlobClient(`originals/${fileName}`);
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
        id: fileId,
        fileName: fileName,
        originalFileName: originalFileName,
        originalFileType: contentType,
        originalFileSize: originalFileSize,
        originalComment: null,
        uploadUserAgent: req.headers['user-agent'],
        uploadXFF: req.headers['x-forwarded-for'],
        uploadIP: null,
        createDate: createDate,
        modifyDate: createDate,
        publishDate: null,
        publishedBy: null,
        isPublished: false,
        originalImageUrl: `${STORAGE_URL}/${STORAGE_CONTAINER}/originals/${fileName}`,
        thumbnailImageUrl: null,
        largeImageUrl: null
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
          imageUrl: `${STORAGE_URL}/${STORAGE_CONTAINER}/originals/${fileName}`,
          cosmosResource: resource
        }
      };
    }
  }
};