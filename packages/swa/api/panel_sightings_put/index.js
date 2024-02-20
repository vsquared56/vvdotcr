import { Eta } from "eta";
import * as path from "path";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  const db = new utils.Database;

  const sightingId = req.params.sightingId;
  var response;

  const form = req.parseFormBody();
  const actionValue = form.get('action').value.toString();

  var sighting = await db.getSighting(sightingId);

  if (actionValue === "publish") {
    sighting.submissionStatus = "adminPublished";
    sighting.isPublished = true;
  } else if (actionValue === "unpublish") {
    sighting.submissionStatus = "adminUnpublished";
    sighting.isPublished = false;
  }

  await db.saveSighting(sighting);

  //Update the modal for this sighting
  response = eta.render(
    "./admin_sightings_item",
    {
      sighting: sighting
    }
  );

  //Also replace the card behind the modal with the latest data
  response += eta.render(
    "./admin_sightings_card",
    {
      sighting: sighting,
      sightingDate: (new Date(sighting.createDate)).toLocaleString(),
      loadMore: false,
      nextPage: null,
      replace: true
    }
  );

  context.res = {
    status: 200,
    body: response
  };
};