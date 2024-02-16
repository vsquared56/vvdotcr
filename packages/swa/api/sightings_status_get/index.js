import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const db = new utils.Database;
  
  var response;
  const sightingId = req.params.sightingId;
  const recheckCount = parseInt(req.query.recheckCount);
  const item = await db.getSighting(sightingId);
  const submissionStatus = item.submissionStatus;

  if (recheckCount >= 8) {
    response = utils.renderTemplate(
      'sighting_submit_status_timeout',
      { sightingId: sightingId, submissionStatus: submissionStatus },
      context
    );
  } else if (submissionStatus === 'saved') {
    //Exponential backoff for retry requests
    response = utils.renderTemplate(
      'sighting_submit_status_recheck',
      {
        sightingId: sightingId,
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
        sightingId: sightingId,
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
        sightingId: sightingId,
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
        sightingId: sightingId,
        submissionStatus: submissionStatus,
        imageData: JSON.stringify(item),
        card: card
      },
      context
    );
  } else if (submissionStatus === 'needsManualApproval') {
    response = utils.renderTemplate(
      'sighting_submit_needs_manual_approval',
      { sightingId: sightingId, submissionStatus: submissionStatus, imageData: JSON.stringify(item) },
      context
    );
  } else if (submissionStatus === 'locationRequest') {
    response = utils.renderTemplate(
      'sighting_submit_location_request',
      { sightingId: sightingId, submissionStatus: submissionStatus },
      context
    );
  } else {
    throw new Error(`Submission ID ${sightingId} has an invalid status of ${submissionStatus}`);
  }

  context.res = {
    status: 200,
    body: response
  };
};
