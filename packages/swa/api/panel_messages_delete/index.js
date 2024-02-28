import { Eta } from "eta";
import * as path from "path";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  const db = new utils.Database;

  var response;
  const messageId = req.params.messageId;
  await db.deleteMessage(messageId);
  
  //Remove the modal and card for this sighting
  response = eta.render(
    "./panel/messages_delete",
    {
      messageId: messageId
    }
  );

  context.res = {
    status: 200,
    body: response
  };
};