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
      if (formName === "driving") {
        console.log("Driving");
        response = eta.render(
          "./message_submit/driving_form"
        );
      } else if (formName === "rating") {
        console.log("Rating");
        response = eta.render(
          "./message_submit/rating_form"
        );
      }
    } else {
      console.log("Normal form");
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