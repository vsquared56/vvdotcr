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

  const dateOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (req.params.sightingId) {
    const sightingId = req.params.sightingId.toString();
    const sighting = await db.getSighting(sightingId);
    response = eta.render(
      "./sightings/item",
      {
        sighting: sighting,
        sightingDate: new Date(sighting.createDate).toLocaleDateString('en-US', dateOptions)
      }
    );
  } else {
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const sightings = await db.getPaginatedSightings(5, false, page);
    if (!sightings.items) {
      response = eta.render(
        "./sightings/no_more"
      );
    }
    else {
      var itemCount = 1;
      for (const sighting of sightings.items) {
        response += eta.render(
          "./sightings/card",
          {
            sighting: sighting,
            sightingDate: new Date(sighting.createDate).toLocaleDateString('en-US', dateOptions),
            loadMore: (itemCount === sightings.items.length && sightings.continuationToken !== null),
            nextPage: page + 1
          }
        );
        itemCount++;
      }
    }
  }
  
  context.res = {
    status: 200,
    body: response
  };
};