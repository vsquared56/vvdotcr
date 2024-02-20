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
  const sightingId = req.params.sightingId;
  const recheckCount = parseInt(req.query.recheckCount);
  const item = await db.getSighting(sightingId);
  const submissionStatus = item.submissionStatus;

  if (recheckCount >= 8) {
    response = eta.render(
      "./sighting_submit_status_timeout",
      {
        sightingId: sightingId,
        submissionStatus: submissionStatus
      }
    );
  } else if (submissionStatus === 'saved') {
    //Exponential backoff for retry requests
    response = eta.render(
      "./sighting_submit_status_recheck",
      {
        sightingId: sightingId,
        pendingResizing: true,
        pendingAutomaticApproval: false,
        recheckCount: (recheckCount + 1),
        recheckInterval: Math.pow(1.5, recheckCount)
      }
    );
  } else if (submissionStatus === 'pendingAutomaticApproval') {
    //Exponential backoff for retry requests
    response = eta.render(
      "./sighting_submit_status_recheck",
      {
        sightingId: sightingId,
        pendingResizing: false,
        pendingAutomaticApproval: true,
        recheckCount: (recheckCount + 1),
        recheckInterval: Math.pow(1.5, recheckCount)
      }
    );
  } else if (submissionStatus === 'approved') {
    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const card = eta.render(
      "./sightings_card",
      {
        sightingId: sightingId,
        sightingImage: item.thumbImageUrl,
        sightingDate: new Date(item.createDate).toLocaleDateString('en-US', dateOptions),
        loadMore: false,
        nextPage: null
      }
    );
    response = eta.render(
      "./sighting_submit_approved",
      {
        sightingId: sightingId,
        submissionStatus: submissionStatus,
        imageData: JSON.stringify(item),
        card: card
      }
    );
  } else if (submissionStatus === 'needsManualApproval') {
    response = eta.render(
      "./sighting_submit_needs_manual_approval",
      {
        sightingId: sightingId,
        submissionStatus: submissionStatus,
        imageData: JSON.stringify(item)
      }
    );
  } else if (submissionStatus === 'locationRequest') {
    response = eta.render(
      "./sighting_submit_location_request",
      {
        sightingId: sightingId,
        submissionStatus: submissionStatus
      }
    );
  } else {
    throw new Error(`Submission ID ${sightingId} has an invalid status of ${submissionStatus}`);
  }

  context.res = {
    status: 200,
    body: response
  };
};
