import { app } from '@azure/functions';

import * as utils from "@vvdotcr/common";

app.serviceBusQueue('submission-approval', {
  connection: 'SERVICE_BUS_CONNECTION_STRING',
  queueName: 'new-sightings-to-validate',
  handler: async (message, context) => {
    const db = new utils.Database;

    await utils.sightingApproval(db, message, true);
  }
});