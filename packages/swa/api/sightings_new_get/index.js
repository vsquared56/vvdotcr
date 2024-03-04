import { Eta } from "eta";
import * as path from "path";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });

  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await utils.parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

  const sessionData = await utils.getOrCreateSession(req.headers.cookie);
  if (sessionData.err) {
    context.error(sessionData.err);
    context.res = {
      status: 400
    };
  } else {
    var response;
    if (req.query.finished) {
      response = eta.render(
        "./sighting_submit/finished"
      );
    } else {
      response = eta.render(
        "./sighting_submit/new",
        { retrySubmission: (req.query.retry === "true") }
      );
    }

    var cookie = await utils.getResponseCookie(sessionData);
    context.res = {
      status: 200,
      body: response,
      cookies: cookie ? [cookie] : null
    };
  }
};