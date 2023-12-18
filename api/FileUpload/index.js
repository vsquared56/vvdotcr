import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline
} from "@azure/storage-blob";
import { CosmosClient } from "@azure/cosmos";
import parseMultipartFormData from "@anzp/azure-function-multipart";
import streamifier from "streamifier"
import handlebars from "handlebars";

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

export default async (context, req) => {
  if (req.method === "GET") {
    const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sighting_submit.hbs');
    const templateContent = fs.readFileSync(directoryPath).toString();
    var template = handlebars.compile(templateContent);
  
    context.res = {
      status: 200,
      body: template()
    };
  }
  else if (req.method === "POST") {
    const { fields, files } = await parseMultipartFormData.default(req);
    const fileId = crypto.randomUUID();
    const contentType = files[0].mimeType;
    const originalFileName = files[0].filename;
    const originalFileExtension = path.extname(originalFileName).toLowerCase().replace(/^\./, '');
    const originalFileSize = files[0].bufferFile.length;

    if (files.length != 1) {
      const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sighting_submit_try_again.hbs');
      const templateContent = fs.readFileSync(directoryPath).toString();
      var template = handlebars.compile(templateContent);

      context.res = {
        status: 200,
        body: template({ error: "Only one file upload is allowed at a time." })
      };
    }
    else if (originalFileSize >= 2 * 1024 * 1024) {
      const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sighting_submit_try_again.hbs');
      const templateContent = fs.readFileSync(directoryPath).toString();
      var template = handlebars.compile(templateContent);

      context.res = {
        status: 200,
        body: template({ error: "Images must be below 2MB." })
      };
    }
    else if (!(originalFileExtension in ALLOWED_IMAGE_TYPES) || (ALLOWED_IMAGE_TYPES[originalFileExtension] != contentType)) {
      const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sighting_submit_try_again.hbs');
      const templateContent = fs.readFileSync(directoryPath).toString();
      var template = handlebars.compile(templateContent);

      context.res = {
        status: 200,
        body: template({ error: "Image is not an allowed type." })
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