import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var response;
  const submissionId = req.query.submissionId;
  const recheckCount = parseInt(req.query.recheckCount);
  const item = await utils.getSighting(submissionId);
  const submissionStatus = item.submissionStatus;

  if (submissionStatus === 'saved') {
    if (recheckCount >= 8) {
      response = utils.renderTemplate(
        'sighting_submit_status_timeout',
        { submissionId: submissionId, submissionStatus: submissionStatus },
        context
      );
    } else {
      //Exponential backoff for retry requests
      response = utils.renderTemplate(
        'sighting_submit_status_recheck',
        {
          submissionId: submissionId,
          submissionStatus: submissionStatus,
          recheckCount: (recheckCount + 1),
          recheckInterval: Math.pow(1.5, recheckCount)
        },
        context
      );
    }
  } else if (submissionStatus === 'accepted') {
    response = utils.renderTemplate(
      'sighting_submit_status_accepted',
      { submissionId: submissionId, submissionStatus: submissionStatus, imageData: JSON.stringify(item) },
      context
    );
  } else if (submissionStatus === 'locationRequest') {
    response = utils.renderTemplate(
      'sighting_submit_location_request',
      { submissionId: submissionId, submissionStatus: submissionStatus },
      context
    );
  }

  context.res = {
    status: 200,
    body: response
  };
};
