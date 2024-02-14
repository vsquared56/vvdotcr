import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var response;
  const propertyName = req.params.propertyName;
  const sightingId = req.params.sightingId;
  const form = req.parseFormBody();
  const propertyValue = JSON.parse(form.get('value').value.toString());

  var sighting = await utils.getSighting(sightingId);

  sighting[propertyName] = propertyValue;
  await utils.saveSighting(sighting);

  response = utils.renderTemplate(
    'admin_sightings_item_property',
    {
      sightingId: sighting.id,
      propertyName: propertyName,
      propertyValue: utils.renderSightingProperty(propertyName, sighting[propertyName])
    },
    context
  );

  context.res = {
    status: 200,
    body: response
  };
};