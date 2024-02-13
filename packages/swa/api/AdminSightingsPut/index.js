import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const sightingId = req.params.sightingId;
  var response;

  const form = req.parseFormBody();
  const actionValue = form.get('action').value.toString();

  var sighting = await utils.getSighting(sightingId);

  if (actionValue === "publish") {
    sighting.submissionStatus = "adminPublished";
    sighting.isPublished = true;
  } else if (actionValue === "unpublish") {
    sighting.submissionStatus = "adminUnpublished";
    sighting.isPublished = false;
  }

  await utils.saveSighting(sighting);

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
    'admin_sightings_item',
    {
      sighting: sighting,
      sightingProperties: sightingProperties
    },
    context
  );

  context.res = {
    status: 200,
    body: response
  };
};