import { ServiceBusClient } from "@azure/service-bus";
import { isLocationInFeatureCollection } from "./location.js"

export async function sightingApproval(db, sightingId, sendNotifications) {
  const serviceBusConnectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
  const sighting = await db.getSighting(sightingId);
  const minLocationAccuracy = await db.getSetting("min_location_accuracy_meters");
  const tagScores = await db.getSetting("sighting_tag_scores");

  var score = 0;
  for (const tag of sighting.visionData.tagsResult.values) {
    console.log(`Tag ${tag.name} Confidence: ${tag.confidence}`);
    if (tagScores.tags[tag.name]) {
      if ((tagScores.tags[tag.name].minConfidence && tag.confidence >= tagScores.tags[tag.name].minConfidence) ||
          (!tagScores.tags[tag.name].minConfidence && tag.confidence >= tagScores.defaultMinConfidence)) {
        console.log(tagScores.tags[tag.name]);
        score += (tagScores.tags[tag.name].score * tag.confidence);
      }
    }
  }
  sighting.sightingScore = score;
  console.log(`Final score ${score}`);

  if (sighting.imageLocation === null || sighting.imageLocation.latitude === null || sighting.imageLocation.longitude === null) {
    sighting.submissionStatus = 'needsManualApproval';
    sighting.automaticApprovalDenied = 'missingLocation';
  } else if (sighting.imageLocation.source === 'browser' && sighting.imageLocation.accuracy > minLocationAccuracy) {
    sighting.submissionStatus = 'needsManualApproval';
    sighting.automaticApprovalDenied = 'inaccurateBrowserLocation';
  }
  else {
    const geolockedLocations = await db.getSetting("geolocked_locations");
    const isGeolocked = isLocationInFeatureCollection(sighting.imageLocation, geolockedLocations);

    if (isGeolocked) {
      sighting.submissionStatus = 'needsManualApproval';
      sighting.automaticApprovalDenied = 'geolocked';
    } else if (score < (await db.getSetting("min_sighting_score"))) {
      sighting.submissionStatus = 'needsManualApproval';
      sighting.automaticApprovalDenied = 'lowScore';
    } else {
      sighting.submissionStatus = 'approved';
      sighting.isPublished = true;
      sighting.publishDate = Date.now();
      sighting.publishedBy = "automaticApproval";
    }
  }

  if (sendNotifications) {
    sighting.notificationStatus.push.status = "queued";
  }

  await db.saveSighting(sighting);

  if (sendNotifications) {
    const sbClient = new ServiceBusClient(serviceBusConnectionString);
    const sbSender = sbClient.createSender("immediate-notifications");
    try {
      await sbSender.sendMessages({ body: { notificationType: "sighting", id: sighting.id } });
    } finally {
      await sbClient.close();
    }
  }
}