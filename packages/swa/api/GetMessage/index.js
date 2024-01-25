import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var clientIp = null;
  if (req.headers.hasOwnProperty("x-forwarded-for")) {
    clientIp = await utils.parseXff(req.headers["x-forwarded-for"]);
  }
  else {
    clientIp = null;
  }

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: {
      text: utils.renderTemplate(
        'sample',
        { name: "Vlad" },
        context
      ),
      request: req,
      clientIp: clientIp
    },
  };
};
