import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var response = "";

  const edit = req.params.edit;
  const propertyName = req.params.propertyName;
  const sightingId = req.params.sightingId;

  const sighting = await utils.getSighting(sightingId);

  if (propertyName === 'edit') {
    var sightingProperties = "";
    for (const property in sighting) {
      
      if (!property.match(/_.*/)) { //Ignore internal CosmosDB properties
        const propertyValue = utils.renderSightingProperty(property, sighting[property]);
        sightingProperties += utils.renderTemplate(
          'admin_sightings_item_property',
          {
            sightingId: sighting.id,
            propertyName: property,
            propertyValue: propertyValue
          },
          context
        );
      }
    }
    response = utils.renderTemplate(
      'admin_sightings_item_properties',
      {
        sighting: sighting,
        sightingProperties: sightingProperties
      },
      context
    );
  } else if (edit === "edit") {
    response = utils.renderTemplate(
      'admin_sightings_item_property_edit',
      {
        sightingId: sighting.id,
        propertyName: propertyName,
        propertyValue: JSON.stringify(sighting[propertyName])
      },
      context
    );
  } else {
    response = utils.renderTemplate(
      'admin_sightings_item_property',
      {
        sightingId: sighting.id,
        propertyName: propertyName,
        propertyValue: utils.renderSightingProperty(propertyName, sighting[propertyName])
      },
      context
    );
  }

  context.res = {
    status: 200,
    body: response
  };
};