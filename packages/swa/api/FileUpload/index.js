import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { ServiceBusClient } from "@azure/service-bus";

import parseMultipartFormData from "@anzp/azure-function-multipart";
import handlebars from "handlebars";
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

  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await utils.parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

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
    const submissionId = crypto.randomUUID();
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
    else if (originalFileSize >= 20 * 1024 * 1024) {
      const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sighting_submit_try_again.hbs');
      const templateContent = fs.readFileSync(directoryPath).toString();
      var template = handlebars.compile(templateContent);

      context.res = {
        status: 200,
        body: template({ error: "Images must be below 20 MB." })
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
      const fileName = `${submissionId}.${originalFileExtension}`;

      const fileMetadata = await sharp(fileData).metadata();

      if (fileMetadata.width < 600 || fileMetadata.height < 600) {
        const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sighting_submit_try_again.hbs');
        const templateContent = fs.readFileSync(directoryPath).toString();
        var template = handlebars.compile(templateContent);
        context.res = {
          status: 200,
          body: template({ error: "Images must be at least 600x600." })
        };
      } else {

        const originalImageUrl = await utils.uploadSighting(`originals/${fileName}`, fileData);

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

        const templatePath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sighting_submit_status_recheck.hbs');
        const templateContent = fs.readFileSync(templatePath).toString();
        var template = handlebars.compile(templateContent);

        context.res = {
          status: 200,
          body: template({ submissionId: submissionId, submissionStatus: submissionStatus, recheckCount: 0, recheckInterval: 1 })
        };
      }
    }
  }
};