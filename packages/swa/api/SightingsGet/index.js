import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var response = "";

  const dateOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (req.params.sightingId) {
    const sightingId = req.params.sightingId.toString();
    const sighting = await utils.getSighting(sightingId);
    response = utils.renderTemplate(
      'sightings_item',
      {
        sightingId: sighting.id,
        sightingImage: sighting.largeImageUrl,
        sightingDate: new Date(sighting.createDate).toLocaleDateString('en-US', dateOptions)
      },
      context
    );
  } else {
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const sightings = await utils.getPaginatedSightings(5, false, page);
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
          'sightings_card',
          {
            sightingId: sighting.id,
            sightingImage: sighting.thumbnailImageUrl,
            sightingDate: new Date(sighting.createDate).toLocaleDateString('en-US', dateOptions),
            loadMore: (itemCount === sightings.items.length && sightings.continuationToken !== null),
            nextPage: page + 1
          },
          context
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