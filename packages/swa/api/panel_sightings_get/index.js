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
  const sightingId = req.params.sightingId;

  if (sightingId && edit === 'edit') {
    const sighting = await db.getSighting(sightingId);
    response = eta.render(
      "./admin_sightings_item",
      {
        sighting: sighting
      }
    );
  } else {

    const page = req.query.page ? parseInt(req.query.page) : 0;
    const sightings = await db.getPaginatedSightings(2, true, page);

    if (!sightings.items) {
      response = eta.render(
        "./sightings_no_more"
      );
    }
    else {
      var itemCount = 1;
      for (const sighting of sightings.items) {
        response += eta.render(
          "./admin_sightings_card",
          {
            sighting: sighting,
            sightingDate: (new Date(sighting.createDate)).toLocaleString(),
            loadMore: (itemCount === sightings.items.length && sightings.continuationToken !== null),
            nextPage: page + 1,
            replace: false
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