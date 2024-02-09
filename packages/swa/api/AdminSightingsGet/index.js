import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var response = "";

  const edit = req.params.edit;
  const sightingId = req.params.sightingId;

  if (sightingId && edit === 'edit') {
    const sighting = await utils.getSighting(sightingId);
    var sightingProperties = "";
    for (const property in sighting) {
      var propertyValue;

      if (!property.match(/_.*/)) { //Ignore internal CosmosDB properties
        if (property.match(/.*Date/) && sighting[property]) {
          propertyValue = (new Date(sighting[property])).toLocaleString();
        } else if (typeof sighting[property] === 'string' || sighting[property] instanceof String) {
          propertyValue = sighting[property];
        } else {
          propertyValue = JSON.stringify(sighting[property]);
        }
        sightingProperties += utils.renderTemplate(
          'admin_sightings_item_property',
          {
            propertyName: property,
            propertyValue: propertyValue
          },
          context
        );
      }
    }
    response = utils.renderTemplate(
      'admin_sightings_item_edit',
      {
        sighting: sighting,
        sightingProperties: sightingProperties
      },
      context
    );
  } else {

    const page = req.query.page ? parseInt(req.query.page) : 0;
    const sightings = await utils.getPaginatedSightings(2, true, page);

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
          'admin_sightings_card',
          {
            sighting: sighting,
            sightingDate: (new Date(sighting.createDate)).toLocaleString(),
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