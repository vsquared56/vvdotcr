import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var response = "";
  const page = req.query.page ? parseInt(req.query.page) : 0;
  const sightings = await utils.getPaginatedSightings(2, page);

  if (!sightings.items) {
    response = utils.renderTemplate(
      'sightings_no_more',
      null,
      context
    );
  }
  else {
    var itemCount = 1;
    for (const sighting of sightings.items) {
      response += utils.renderTemplate(
        'sightings_item',
        {
          sightingId: sighting.id,
          sightingImage: sighting.thumbnailImageUrl,
          sightingDate: sighting.createDate,
          loadMore: (itemCount === sightings.items.length && sightings.continuationToken !== null),
          nextPage: page + 1
        },
        context
      );
      itemCount++;
    }
  }

  context.res = {
    status: 200,
    body: response
  };
};