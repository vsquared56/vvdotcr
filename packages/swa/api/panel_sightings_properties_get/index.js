import { Eta } from "eta";
import * as path from "path";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  const db = new utils.Database;

  var response = "";

  const edit = req.params.edit;
  const propertyName = req.params.propertyName;
  const sightingId = req.params.sightingId;

  const sighting = await db.getSighting(sightingId);

  if (propertyName === 'edit') {
    var sightingProperties = "";
    for (const property in sighting) {
      
      if (!property.match(/_.*/)) { //Ignore internal CosmosDB properties
        const propertyValue = utils.renderSightingProperty(property, sighting[property]);
        sightingProperties += eta.render(
          "./admin_sightings_item_property",
          {
            sightingId: sighting.id,
            propertyName: property,
            propertyValue: propertyValue
          }
        );
      }
    }
    response = eta.render(
      "./admin_sightings_item_properties",
      {
        sighting: sighting,
        sightingProperties: sightingProperties
      }
    );
  } else if (edit === "edit") {
    response = eta.render(
      "./admin_sightings_item_property_edit",
      {
        sightingId: sighting.id,
        propertyName: propertyName,
        propertyValue: JSON.stringify(sighting[propertyName])
      }
    );
  } else {
    response = eta.render(
      "./admin_sightings_item_property",
      {
        sightingId: sighting.id,
        propertyName: propertyName,
        propertyValue: utils.renderSightingProperty(propertyName, sighting[propertyName])
      }
    );
  }

  context.res = {
    status: 200,
    body: response
  };
};