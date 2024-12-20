import { Eta } from "eta";
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
    if (req.query.finished) {
      response = eta.render(
        "./message_submit/finished"
      );
    } else {
      if (req.params.form) {
        const formName = req.params.form.toString();
        const enabledForms = {
          driving: req.query.driving === "on",
          parking: req.query.parking === "on",
          rating: req.query.rating === "on"
        }
        const enabledFormsCount = Object.values(enabledForms).reduce((accumulator, item) => accumulator + item, 0);
        const submitEnabled = (enabledFormsCount > 0);
        if (formName.match(/^(driving|parking|rating)$/)) {
          response = eta.render(
            "./message_submit/message_form_checkbox",
            {
              checkboxName: formName,
              formEnabled: enabledForms[formName],
              updateSubmit: true,
              numMessages: enabledFormsCount,
              submitEnabled: submitEnabled
            }
          );
        } else if (formName === "location") {
          var locationPermission;
          if (!req.query.locationPermission) {
            console.log(`Missing locationPermission parameter`);
            context.res = {
              status: 400,
              body: "Missing locationPermission parameter."
            };
            return;
          } else if (req.query.locationPermission.match(/^(prompt|granted|denied)$/)) {
            locationPermission = req.query.locationPermission;
          } else {
            console.log(`Invalid locationPermission query parameter.`);
            context.res = {
              status: 400,
              body: "Invalid locationPermission query parameter."
            };
            return;
          }
          response = eta.render(
            "./message_submit/location_toggle",
            {
              locationEnabled: req.query["locationEnable"] === "on",
              locationPermission: locationPermission
            }
          );
        } else if (formName === "submit") {
          var locationPermission;
          if (!req.query.locationPermission) {
            console.log(`Missing locationPermission parameter`);
            context.res = {
              status: 400,
              body: "Missing locationPermission parameter."
            };
            return;
          } else if (req.query.locationPermission.match(/^(prompt|granted|denied)$/)) {
            locationPermission = req.query.locationPermission;
          } else {
            console.log(`Invalid locationPermission query parameter.`);
            context.res = {
              status: 400,
              body: "Invalid locationPermission query parameter."
            };
            return;
          }
          response = eta.render(
            "./message_submit/submit",
            {
              locationEnabled: true,
              locationPermission: locationPermission,
              turnstileSiteKey: turnstileSiteKey
            }
          );
        }
      } else {
        if (await utils.isActionRateLimited(clientIp, sessionData.sessionId, "newMessage")) {
          response = eta.render(
            "./message_submit/rate_limited",
            null
          );
        } else {
          response = eta.render(
            "./message_submit/new",
            null
          );
        }
      }
    }

    var cookie = await utils.getResponseCookie(sessionData);
    context.res = {
      status: 200,
      body: response,
      cookies: cookie ? [cookie] : null
    };
  }
};