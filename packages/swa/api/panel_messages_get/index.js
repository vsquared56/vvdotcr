import { Eta } from "eta";
import * as path from "path";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  const db = new utils.Database;

  var response = "";

  const edit = req.params.edit;
  const messageId = req.params.messageId;

  if (messageId && edit === 'edit') {
    const message = await db.getMessage(messageId);
    response = eta.render(
      "./panel/messages_item",
      {
        message: message,
        messageDate: (new Date(message.createDate)).toLocaleString()
      }
    );
  } else {

    const page = req.query.page ? parseInt(req.query.page) : 0;
    const messages = await db.getPaginatedMessages(2, page);

    if (!messages.items) {
      response = eta.render(
        "./messages/no_more"
      );
    }
    else {
      var itemCount = 1;
      for (const message of messages.items) {
        response += eta.render(
          "./panel/messages_card",
          {
            message: message,
            messageDate: (new Date(message.createDate)).toLocaleString(),
            loadMore: (itemCount === messages.items.length && messages.continuationToken !== null),
            nextPage: page + 1,
            replace: false
          }
        );
        itemCount++;
      }
    }
  }

  context.res = {
    status: 200,
    body: response
  };
};