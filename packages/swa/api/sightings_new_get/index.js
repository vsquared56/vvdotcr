import { Eta } from "eta";
import BrowserDetector from 'browser-dtector';
import * as path from "path";

import * as utils from "@vvdotcr/common";

const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY;

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
    console.log(sessionData.err);
    context.res = {
      status: 400
    };
  } else {
    var response;
    var requireClientHints;
    if (req.query.finished) {
      response = eta.render(
        "./sighting_submit/finished"
      );
    } else if (await utils.isActionRateLimited(clientIp, sessionData.sessionId, "newSighting")) {
      response = eta.render(
        "./sighting_submit/rate_limited",
        null
      );
    } else if (req.params.submit && req.params.submit === "submit" ) {
      const browser = new BrowserDetector(req.headers["user-agent"]);
      const ua = browser.parseUserAgent();
      var requireChromeAndroidBehavior = false;
      //Do a file upload selector workaround for any version of Chrome on Android v14 and above
      if (ua.isChrome && ua.isAndroid) {
        const regex = /"(\d{1,3}).\d{1,5}.\d{1,5}"/;
        const matches = req.headers["sec-ch-ua-platform-version"].match(regex);
        if (matches && parseInt(matches[1]) >= 14) {
          requireChromeAndroidBehavior = true;
        }
      }
      response = eta.render(
        "./sighting_submit/submit",
        {
          turnstileSiteKey: turnstileSiteKey,
          requireChromeAndroidBehavior: requireChromeAndroidBehavior
        }
      );
    } else {
      response = eta.render(
        "./sighting_submit/new",
        null
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