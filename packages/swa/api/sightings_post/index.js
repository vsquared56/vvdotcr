import { Eta } from "eta";
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
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
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

  const sessionData = await utils.getSession(req.headers.cookie);
  if (sessionData.err) {
    console.log(sessionData.err);
    context.res = {
      status: 401,
      body: "Sighting submissions require a valid session token."
    };
    return;
  } else if (await utils.isActionRateLimited(clientIp, sessionData.sessionId, "newSighting")) {
    console.log("Rate limited POST request for new sighting.");
    context.res = {
      status: 429,
      body: "Too many sighting submissions."
    };
    return;
  }

  const { fields, files } = await parseMultipartFormData.default(req);
  const sightingId = crypto.randomUUID();
  const contentType = files[0].mimeType;
  const sourceFileName = files[0].filename;
  const originalFileExtension = path.extname(sourceFileName).toLowerCase().replace(/^\./, '');
  const originalFileSize = files[0].bufferFile.length;

  if (files.length != 1) {
    response = eta.render(
      "./sighting_submit/error",
      { error: "Only one file upload is allowed at a time." }
    );
  }
  else if (originalFileSize >= 20 * 1024 * 1024) {
    response = eta.render(
      "./sighting_submit/error",
      { error: "Images must be below 20 MB." }
    );
  }
  else if (!(originalFileExtension in ALLOWED_IMAGE_TYPES) || (ALLOWED_IMAGE_TYPES[originalFileExtension] != contentType)) {
    response = eta.render(
      "./sighting_submit/error",
      { error: "Image is not an allowed type." }
    );
  }
  else {
    const fileData = files[0].bufferFile;
    const originalFileName = `${sightingId}.${originalFileExtension}`;

    const fileMetadata = await sharp(fileData).metadata();

    if (fileMetadata.width < 600 || fileMetadata.height < 600) {
      response = eta.render(
        "./sighting_submit/error",
        { error: "Images must be at least 600x600." }
      );
    } else {
      const originalImageUrl = await storage.uploadSighting('original', contentType, originalFileName, fileData);

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
        originalUserAgent: req.headers['user-agent'],
        originalXFF: req.headers['x-forwarded-for'],
        originalIP: clientIp,
        sessionId: sessionData.sessionId,
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
        visionData: null,
        notificationStatus: { batch: { status: null, notificationId: null }, push: { status: null, notificationId: null } },
        notificationStatusReason: null,
        viewCount: 0
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

      //Save this action for rate limiting
      await utils.saveAction(clientIp, sessionData.sessionId, "newSighting", sightingId);

      response = eta.render(
        "./sighting_submit/status_recheck",
        {
          sighting: item,
          submissionStatus: submissionStatus,
          recheckCount: 0,
          recheckInterval: 1
        }
      );
    }
  }

  context.res = {
    status: 200,
    body: response
  };
};