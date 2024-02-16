import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const db = new utils.Database;
  
  var response;
  const submissionId = req.query.submissionId;
  const recheckCount = parseInt(req.query.recheckCount);
  const item = await db.getSighting(submissionId);
  const submissionStatus = item.submissionStatus;

  if (recheckCount >= 8) {
    response = utils.renderTemplate(
      'sighting_submit_status_timeout',
      { submissionId: submissionId, submissionStatus: submissionStatus },
      context
    );
  } else if (submissionStatus === 'saved') {
    //Exponential backoff for retry requests
    response = utils.renderTemplate(
      'sighting_submit_status_recheck',
      {
        submissionId: submissionId,
        pendingResizing: true,
        pendingAutomaticApproval: false,
        recheckCount: (recheckCount + 1),
        recheckInterval: Math.pow(1.5, recheckCount)
      },
      context
    );
  } else if (submissionStatus === 'pendingAutomaticApproval') {
    //Exponential backoff for retry requests
    response = utils.renderTemplate(
      'sighting_submit_status_recheck',
      {
        submissionId: submissionId,
        pendingResizing: false,
        pendingAutomaticApproval: true,
        recheckCount: (recheckCount + 1),
        recheckInterval: Math.pow(1.5, recheckCount)
      },
      context
    );
  } else if (submissionStatus === 'approved') {
    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const card = utils.renderTemplate(
      'sightings_card',
      {
        sightingId: submissionId,
        sightingImage: item.thumbnailImageUrl,
        sightingDate: new Date(item.createDate).toLocaleDateString('en-US', dateOptions),
        loadMore: false,
        nextPage: null
      },
      context
    );
    response = utils.renderTemplate(
      'sighting_submit_approved',
      {
        submissionId: submissionId,
        submissionStatus: submissionStatus,
        imageData: JSON.stringify(item),
        card: card
      },
      context
    );
  } else if (submissionStatus === 'needsManualApproval') {
    response = utils.renderTemplate(
      'sighting_submit_needs_manual_approval',
      { submissionId: submissionId, submissionStatus: submissionStatus, imageData: JSON.stringify(item) },
      context
    );
  } else if (submissionStatus === 'locationRequest') {
    response = utils.renderTemplate(
      'sighting_submit_location_request',
      { submissionId: submissionId, submissionStatus: submissionStatus },
      context
    );
  } else {
    throw new Error(`Submission ID ${submissionId} has an invalid status of ${submissionStatus}`);
  }

  context.res = {
    status: 200,
    body: response
  };
};
