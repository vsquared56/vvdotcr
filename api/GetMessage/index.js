import * as fs from "fs";
import * as path from "path";
import handlebars from "handlebars";

import parseXff from "../shared/parse-xff.js";

export default async (context, req) => {
  const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sample.hbs');

  const templateContent = fs.readFileSync(directoryPath).toString();
  var template = handlebars.compile(templateContent);

  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: {
      text: template({ name: "Vlad" }),
      directoryPath: directoryPath,
      request: req,
      clientIp: clientIp
    },
  };
};
