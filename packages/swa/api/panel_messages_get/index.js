import { Eta } from "eta";
import * as path from "path";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  const db = new utils.Database;

  const messagesPerPage = 5;

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
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const messages = await db.getPaginatedMessages(messagesPerPage, page);

    if (!messages.items) {
      response = eta.render(
        "./messages/no_more"
      );
    }
    else {
      const messageCount = await db.countMessages();
      const totalPages = Math.ceil(messageCount / messagesPerPage);
      const dateOptions = {
        timeStyle: "medium",
        dateStyle: "short",
      };
      response = eta.render(
        "./panel/messages_table",
        {
          messages: messages.items.map(item => (
            {
              ...item,
              messageDate: new Date(item.createDate).toLocaleString('en-US', dateOptions)
            })),
          currentPage: page,
          totalPages: totalPages
        }
      );
    }
  }

  context.res = {
    status: 200,
    body: response
  };
};