import { Eta } from "eta";
import { ServiceBusClient } from "@azure/service-bus";
import * as path from "path";

import * as utils from "@vvdotcr/common";

const serviceBusConnectionString = process.env.SERVICE_BUS_CONNECTION_STRING;

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  const db = new utils.Database;

  var response;

  const sightingId = req.params.sightingId;

  await utils.sightingApproval(db, sightingId, false);
  
  var sighting = await db.getSighting(sightingId);

  //Update the modal for this sighting
  response = eta.render(
    "./panel/sightings_item",
    {
      sighting: sighting,
      minSightingScore: await db.getSetting("min_sighting_score"),
    }
  );

  //Also replace the card behind the modal with the latest data
  response += eta.render(
    "./panel/sightings_card",
    {
      sighting: sighting,
      sightingDate: (new Date(sighting.createDate)).toLocaleString(),
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