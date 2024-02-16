import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const db = new utils.Database;
  const storage = new utils.Storage;

  var response;
  const sightingId = req.params.sightingId;
  var sighting = await db.getSighting(sightingId);

  await storage.deleteSightingFile('original', sighting.originalFileName);
  await storage.deleteSightingFile('thumb', sighting.thumbFileName);
  await storage.deleteSightingFile('large', sighting.largeFileName);
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