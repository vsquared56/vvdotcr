import * as crypto from "crypto";
import * as path from "path";
import { ServiceBusClient } from "@azure/service-bus";

import parseMultipartFormData from "@anzp/azure-function-multipart";
import sharp from "sharp";

import * as utils from "@vvdotcr/common";

//Maps file extensions to MIME types
const ALLOWED_IMAGE_TYPES = {
  "png": "image/png",
  "jpg": "image/jpeg",
  "jpeg": "image/jpeg"
}

const SERVICE_BUS_CONNECTION_STRING = process.env.SERVICE_BUS_CONNECTION_STRING;

export default async (context, req) => {
  const db = new utils.Database;
  const storage = new utils.Storage;
  var response;

  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await utils.parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

  const { fields, files } = await parseMultipartFormData.default(req);
  const sightingId = crypto.randomUUID();
  const contentType = files[0].mimeType;
  const sourceFileName = files[0].filename;
  const originalFileExtension = path.extname(sourceFileName).toLowerCase().replace(/^\./, '');
  const originalFileSize = files[0].bufferFile.length;

  if (files.length != 1) {
    response = utils.renderTemplate(
      'sighting_submit_error',
      { error: "Only one file upload is allowed at a time." },
      context
    );
  }
  else if (originalFileSize >= 20 * 1024 * 1024) {
    response = utils.renderTemplate(
      'sighting_submit_error',
      { error: "Images must be below 20 MB." },
      context
    );
  }
  else if (!(originalFileExtension in ALLOWED_IMAGE_TYPES) || (ALLOWED_IMAGE_TYPES[originalFileExtension] != contentType)) {
    response = utils.renderTemplate(
      'sighting_submit_error',
      { error: "Image is not an allowed type." },
      context
    );
  }
  else {
    const fileData = files[0].bufferFile;
    const originalFileName = `${sightingId}.${originalFileExtension}`;

    const fileMetadata = await sharp(fileData).metadata();

    if (fileMetadata.width < 600 || fileMetadata.height < 600) {
      response = utils.renderTemplate(
        'sighting_submit_error',
        { error: "Images must be at least 600x600." },
        context
      );
    } else {
      const originalImageUrl = await storage.uploadSighting('original', originalFileName, fileData);

      // Set DB item
      const createDate = Date.now();
      const submissionStatus = "saved";
      const item = {
        id: sightingId,
        submissionStatus: submissionStatus,
        sourceFileName: sourceFileName,
        originalFileType: contentType,
        originalFileSize: originalFileSize,
        originalHeight: fileMetadata.height,
        originalWidth: fileMetadata.width,
        originalComment: null,
        uploadUserAgent: req.headers['user-agent'],
        uploadXFF: req.headers['x-forwarded-for'],
        uploadIP: clientIp,
        createDate: createDate,
        modifyDate: createDate,
        processingLatency: null,
        publishDate: null,
        publishedBy: null,
        automaticApprovalDenied: null,
        isPublished: false,
        originalFileName: originalFileName,
        originalImageUrl: originalImageUrl,
        thumbFileName: null,
        thumbImageUrl: null,
        largeFileName: null,
        largeImageUrl: null,
        imageLocation: null,
        visionData: null
      }

      // Save image data to CosmosDB
      await db.saveSighting(item);

      // Send a Service Bus Message
      const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
      const sbSender = sbClient.createSender('new-file-uploads');
      try {
        await sbSender.sendMessages({ body: sightingId });
      } finally {
        await sbClient.close();
      }

      response = utils.renderTemplate(
        'sighting_submit_submitted',
        { sightingId: sightingId, submissionStatus: submissionStatus, recheckCount: 0, recheckInterval: 1 },
        context
      );
    }
  }

  context.res = {
    status: 200,
    body: response
  };
};