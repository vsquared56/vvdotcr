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

  const propertyName = req.params.propertyName;
  const sightingId = req.params.sightingId;
  const form = req.parseFormBody();
  const propertyValue = JSON.parse(form.get('value').value.toString());

  var sighting = await db.getSighting(sightingId);

  sighting[propertyName] = propertyValue;
  await db.saveSighting(sighting);

  response = eta.render(
    "./panel/sightings_item_property",
    {
      sighting: sighting,
      propertyName: propertyName,
      propertyValue: utils.renderSightingProperty(propertyName, sighting[propertyName])
    }
  );

  context.res = {
    status: 200,
    body: response
  };
};