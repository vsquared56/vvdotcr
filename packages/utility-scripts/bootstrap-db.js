#!/usr/bin/node
import { readFile } from 'fs/promises';
import * as utils from "@vvdotcr/common";

const localSettings = JSON.parse(
  await readFile(
    new URL('./local.settings.json', import.meta.url)
  )
);

process.env["COSMOS_DB_CONNECTION_STRING"] = localSettings.Values["BOOTSTRAP_DB_CONNECTION_STRING"];
process.env["COSMOS_DB_DATABASE_NAME"] = localSettings.Values["BOOTSTRAP_DB_DATABASE_NAME"];
process.env["ENVIRONMENT_NAME"] = localSettings.Values["BOOTSTRAP_ENVIRONMENT_NAME"];

const db = new utils.Database;

const existingSettings = await db.getAllSettings();

if (existingSettings.length != 0) {
  throw new Error("Unable to bootstrap a database with existing settings.");
}

await db.saveSetting("cloudflare_ip_blocks", []);
await db.saveSetting("azure_ip_blocks", []);
await db.saveSetting("trusted_xff_ip_blocks", []);
await db.saveSetting("min_location_accuracy_meters", 200);

const emptyFeatureCollection = {
  "type": "FeatureCollection",
  "features": []
};

await db.saveSetting("geolocked_locations", emptyFeatureCollection);
await db.saveSetting("valid_locations", emptyFeatureCollection);

const notificationRateLimits = [
  { "seconds": 300, "limit": 5 },
  { "seconds": 3600, "limit": 10 },
  { "seconds": 86400, "limit": 30 }
];
await db.saveSetting("notification-rate-limits", notificationRateLimits);

const messagePushNotifications = {
  "missingLocation":false,
  "inaccurateBrowserLocation":false,
  "invalidLocation":false,
  "validLocation":true
}
await db.saveSetting("message_push_notifications", messagePushNotifications);

const actionRateLimits = [
  {"actionType":"newMessage","originatorType":"ip","seconds":3600,"limit":2},
  {"actionType":"newMessage","originatorType":"session","seconds":3600,"limit":1},
  {"actionType":"newSighting","originatorType":"ip","seconds":3600,"limit":2},
  {"actionType":"newSighting","originatorType":"session","seconds":3600,"limit":1}
];
await db.saveSetting("action_rate_limits", actionRateLimits);
await db.saveSetting("min_sighting_score", 7);

const sightingTagScores = {
  "defaultMinConfidence":0.7,
  "tags" : {
    "outdoor":{"minConfidence":0.8,"score":1},
    "indoor":{"minConfidence":0.5,"score":-5},
  }
};
await db.saveSetting("sighting_tag_scores", sightingTagScores);

console.log("Done.");