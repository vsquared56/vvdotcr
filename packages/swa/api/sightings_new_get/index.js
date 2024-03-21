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
      console.log(ua);
      response = eta.render(
        "./sighting_submit/submit",
        {
          turnstileSiteKey: turnstileSiteKey,
          platformVersion: req.headers["sec-ch-ua-platform-version"]
        }
      );
    } else {
      const browser = new BrowserDetector(req.headers["user-agent"]);
      const ua = browser.parseUserAgent();
      if (ua.isChrome && !ua.isAndroid) {
        console.log("Asking for client hints");
        requireClientHints = true;
      }
      console.log(ua);
      response = eta.render(
        "./sighting_submit/new",
        {
          platformVersion: req.headers["sec-ch-ua-platform-version"]
        }
      );
    }

    var cookie = await utils.getResponseCookie(sessionData);
    context.res = {
      status: 200,
      body: response,
      cookies: cookie ? [cookie] : null,
      headers: requireClientHints ? {
        "accept-ch": "Sec-CH-UA-Platform,Sec-CH-UA-Platform-Version",
        "critical-ch": "Sec-CH-UA-Platform,Sec-CH-UA-Platform-Version"
      } : null
    };
  }
};