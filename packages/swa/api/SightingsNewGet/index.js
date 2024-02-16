import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var response;
  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await utils.parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

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

  context.res = {
    status: 200,
    body: response
  };
};