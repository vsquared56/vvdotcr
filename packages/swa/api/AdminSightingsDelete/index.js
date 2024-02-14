import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const db = new utils.Database;

  var response;
  const sightingId = req.params.sightingId;
  var sighting = await db.getSighting(sightingId);

  await utils.deleteSightingFile(`originals/${sighting.fileName}`, 'original');
  await utils.deleteSightingFile(`thumb/${sighting.id}.jpeg`, 'public');
  await utils.deleteSightingFile(`large/${sighting.id}.jpeg`, 'public');
  await db.deleteSighting(sighting.id);
  
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