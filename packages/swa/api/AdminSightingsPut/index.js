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

  response = utils.renderTemplate(
    'admin_sightings_item',
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