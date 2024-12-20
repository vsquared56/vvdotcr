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
    "./panel/sightings_item",
    {
      sighting: sighting,
      minSightingScore: await db.getSetting("min_sighting_score")
    }
  );

  //Also replace the card behind the modal with the latest data
  response += eta.render(
    "./panel/sightings_card",
    {
      sighting: sighting,
      sightingDate: (new Date(sighting.createDate)).toLocaleString(utils.dateTimeLocale, utils.dateTimeOptions),
      minSightingScore: await db.getSetting("min_sighting_score"),
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