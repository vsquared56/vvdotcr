import * as fs from "fs";
import * as path from "path";
import handlebars from "handlebars";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const submissionId = req.query.submissionId;
  const recheckCount = parseInt(req.query.recheckCount);
  var submissionStatus;
  var templateFile;

  var item = await utils.getSighting(submissionId);
  submissionStatus = item.submissionStatus;

  var templatePath, templateContent, template, response;
  if (submissionStatus === "saved") {
    if (recheckCount >= 8) {
      templateFile = "sighting_submit_status_timeout.hbs";
    } else {
      templateFile = "sighting_submit_status_recheck.hbs";
    }
    templatePath = path.join(context.executionContext.functionDirectory, '..', 'views', templateFile);
    templateContent = fs.readFileSync(templatePath).toString();
    template = handlebars.compile(templateContent);
    //Exponential backoff for retry requests
    response = template({ submissionId: submissionId, submissionStatus: submissionStatus, recheckCount: (recheckCount + 1), recheckInterval: Math.pow(1.5, recheckCount) });
  } else if (submissionStatus === "accepted") {
    templateFile = "sighting_submit_status_accepted.hbs";
    templatePath = path.join(context.executionContext.functionDirectory, '..', 'views', templateFile);
    templateContent = fs.readFileSync(templatePath).toString();
    template = handlebars.compile(templateContent);
    response = template({ submissionId: submissionId, submissionStatus: submissionStatus, imageData: JSON.stringify(item) });
  } else if (submissionStatus === "locationRequest") {
    templateFile = "sighting_submit_location_request.hbs";
    templatePath = path.join(context.executionContext.functionDirectory, '..', 'views', templateFile);
    templateContent = fs.readFileSync(templatePath).toString();
    template = handlebars.compile(templateContent);
    response = template({ submissionId: submissionId, submissionStatus: submissionStatus});
  }

  context.res = {
    status: 200,
    body: response
  };
};
