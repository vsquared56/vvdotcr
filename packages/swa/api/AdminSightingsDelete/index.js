import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const sightingId = req.params.sightingId;
  var response;

  var sighting = await utils.getSighting(sightingId);

  await utils.deleteSightingFile(`originals/${sighting.fileName}`, 'original');
  await utils.deleteSightingFile(`thumb/${sighting.id}.jpeg`, 'public');
  await utils.deleteSightingFile(`large/${sighting.id}.jpeg`, 'public');
  await utils.deleteSightingRecord(sighting.id);
  
  //Remove the modal and card for this sighting
  response = utils.renderTemplate(
    'admin_sightings_card_delete',
    {
      sighting: sighting
    },
    context
  );

  context.res = {
    status: 200,
    body: response
  };
};