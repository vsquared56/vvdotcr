import { Eta } from "eta";
import * as path from "path";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  const db = new utils.Database;
  const storage = new utils.Storage;

  var response;
  const sightingId = req.params.sightingId;
  var sighting = await db.getSighting(sightingId);

  await storage.deleteSightingFile('original', sighting.originalFileName);
  await storage.deleteSightingFile('thumb', sighting.thumbFileName);
  await storage.deleteSightingFile('large', sighting.largeFileName);
  await db.deleteSighting(sighting.id);
  
  //Remove the modal and card for this sighting
  response = eta.render(
    "./admin_sightings_card_delete",
    {
      sighting: sighting
    }
  );

  context.res = {
    status: 200,
    body: response
  };
};