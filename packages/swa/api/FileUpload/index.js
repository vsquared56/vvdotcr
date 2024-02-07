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
  var response;
  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await utils.parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

  if (req.method === "GET") {
    if (req.query.finished) {
      response = utils.renderTemplate(
        'sighting_submit_finished',
        null,
        context
      );
    } else {
      response = utils.renderTemplate(
        'sighting_submit',
        { retrySubmission: (req.query.retry === "true") },
        context
      );
    }
  }
  else if (req.method === "POST") {
    const { fields, files } = await parseMultipartFormData.default(req);
    const submissionId = crypto.randomUUID();
    const contentType = files[0].mimeType;
    const originalFileName = files[0].filename;
    const originalFileExtension = path.extname(originalFileName).toLowerCase().replace(/^\./, '');
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
      const fileName = `${submissionId}.${originalFileExtension}`;

      const fileMetadata = await sharp(fileData).metadata();

      if (fileMetadata.width < 600 || fileMetadata.height < 600) {
        response = utils.renderTemplate(
          'sighting_submit_error',
          { error: "Images must be at least 600x600." },
          context
        );
      } else {
        const originalImageUrl = await utils.uploadSighting(`originals/${fileName}`, 'original', fileData);

        // Set DB item
        const createDate = Date.now();
        const submissionStatus = "saved";
        const item = {
          id: submissionId,
          submissionStatus: submissionStatus,
          fileName: fileName,
          originalFileName: originalFileName,
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
          originalImageUrl: originalImageUrl,
          thumbnailImageUrl: null,
          largeImageUrl: null,
          imageLocation: null,
          visionData: null
        }

        // Save image data to CosmosDB
        await utils.saveSighting(item);

        // Send a Service Bus Message
        const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
        const sbSender = sbClient.createSender('new-file-uploads');
        try {
          await sbSender.sendMessages({ body: submissionId });
        } finally {
          await sbClient.close();
        }

        response = utils.renderTemplate(
          'sighting_submit_status_recheck',
          { submissionId: submissionId, submissionStatus: submissionStatus, recheckCount: 0, recheckInterval: 1 },
          context
        );
      }
    }
  }

  context.res = {
    status: 200,
    body: response
  };
};