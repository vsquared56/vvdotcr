import * as utils from "@vvdotcr/common";

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
  submissionStatus = 'accepted';

  item.imageLocation = imageLocation;
  item.submissionStatus = submissionStatus;

  await utils.saveSighting(item);
  response = utils.renderTemplate(
    'sighting_submit_status_accepted',
    { submissionId: submissionId, submissionStatus: submissionStatus, imageData: JSON.stringify(item) },
    context
  );

  context.res = {
    status: 200,
    body: response
  };
};
