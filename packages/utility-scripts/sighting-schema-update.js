#!/usr/bin/node
import { readFile } from 'fs/promises';
import * as utils from "@vvdotcr/common";

const localSettings = JSON.parse(
  await readFile(
    new URL('./local.settings.json', import.meta.url)
  )
);

for (const envVar in localSettings.Values) {
  process.env[envVar] = localSettings.Values[envVar];
}

const db = new utils.Database;

const patchOps =
[
  { op: "add", path: "/sightingScore", value: 0}
];

const { resources: itemDefList } = await db.sightingsContainer.items.readAll().fetchAll();
for (const itemDef of itemDefList) {
  await db.sightingsContainer.item(itemDef.id, itemDef.id).patch(patchOps);
  console.log(itemDef.id);
}

console.log("Done.");