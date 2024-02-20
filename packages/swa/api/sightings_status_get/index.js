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
  const sighting = await db.getSighting(sightingId);
  const submissionStatus = sighting.submissionStatus;

  if (recheckCount >= 8) {
    response = eta.render(
      "./sighting_submit_status_timeout",
      {
        sighting: sighting
      }
    );
  } else if (submissionStatus === 'saved' || submissionStatus === 'pendingAutomaticApproval') {
    //Exponential backoff for retry requests
    response = eta.render(
      "./sighting_submit_status_recheck",
      {
        sighting: sighting,
        pendingResizing: true,
        pendingAutomaticApproval: false,
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
    response = eta.render(
      "./sighting_submit_approved",
      {
        sighting: sighting,
        sightingDate: new Date(sighting.createDate).toLocaleDateString('en-US', dateOptions),
        imageData: JSON.stringify(sighting)
      }
    );
  } else if (submissionStatus === 'needsManualApproval') {
    response = eta.render(
      "./sighting_submit_needs_manual_approval",
      {
        sighting: sighting,
        imageData: JSON.stringify(sighting)
      }
    );
  } else if (submissionStatus === 'locationRequest') {
    response = eta.render(
      "./sighting_submit_location_request",
      {
        sighting: sighting
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