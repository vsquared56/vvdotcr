import { Eta } from "eta";
import * as path from "path";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  var response;
  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await utils.parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

  if (req.query.finished) {
    response = eta.render(
      "./sighting_submit_finished"
    );
  } else {
    response = eta.render(
      "./sighting_submit",
      { retrySubmission: (req.query.retry === "true") }
    );
  }

  context.res = {
    status: 200,
    body: response
  };
};