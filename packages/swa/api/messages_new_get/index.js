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
      "./message_submit/finished"
    );
  } else {
    if (req.params.form) {
      const formName = req.params.form.toString();
      const drivingFormEnabled = (req.query.driving === "on");
      const ratingFormEnabled = (req.query.rating === "on");
      const submitEnabled = (drivingFormEnabled || ratingFormEnabled);
      if (formName === "driving") {
        response = eta.render(
          "./message_submit/driving_form",
          {
            formEnabled: drivingFormEnabled,
            updateSubmit: true,
            submitEnabled: submitEnabled
          }
        );
      } else if (formName === "rating") {
        response = eta.render(
          "./message_submit/rating_form",
          {
            formEnabled: ratingFormEnabled,
            updateSubmit: true,
            submitEnabled: submitEnabled
          }
        );
      }
    } else {
      response = eta.render(
        "./message_submit/new"
      );
    }
  }

  context.res = {
    status: 200,
    body: response
  };
};