import { ServiceBusClient } from "@azure/service-bus";

import * as utils from "@vvdotcr/common";

const SERVICE_BUS_CONNECTION_STRING = process.env.SERVICE_BUS_CONNECTION_STRING;

export default async (context, req) => {
  var response;
  const submissionId = req.query.submissionId;
  var submissionStatus;
  var item = await utils.getSighting(submissionId);

  const form = req.parseFormBody();
  const latitude = parseFloat(form.get('latitude').value.toString());
  const longitude = parseFloat(form.get('longitude').value.toString());
  const accuracy = parseFloat(form.get('accuracy').value.toString());
  const timestamp = parseInt(form.get('timestamp').value.toString());

  const imageLocation = {
    latitude: isNaN(latitude) ? null : latitude,
    longitude: isNaN(longitude) ? null : longitude,
    accuracy: isNaN(accuracy) ? null : accuracy,
    timestamp: isNaN(timestamp) ? null : timestamp,
    source: 'browser'
  };
  submissionStatus = 'pendingAutomaticApproval';

  item.imageLocation = imageLocation;
  item.submissionStatus = submissionStatus;

  await utils.saveSighting(item);
  response = utils.renderTemplate(
    'sighting_submit_status_recheck',
    {
      submissionId: submissionId,
      pendingResizing: false,
      pendingAutomaticApproval: true,
      recheckCount: 0,
      recheckInterval: 1
    },
    context
  );

  // Send a Service Bus Message
  const sbClient = new ServiceBusClient(SERVICE_BUS_CONNECTION_STRING);
  const sbSender = sbClient.createSender('new-sightings-to-validate');
  try {
    await sbSender.sendMessages({ body: item.id });
  } finally {
    await sbClient.close();
  }

  context.res = {
    status: 200,
    body: response
  };
};
