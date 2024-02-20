import { Eta } from "eta";
import * as path from "path";

import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const eta = new Eta(
    {
      views: path.join(context.executionContext.functionDirectory, '..', 'views')
    });
  const db = new utils.Database;

  var response;

  const form = req.parseFormBody();
  const settingId = form.get('name').value.toString();
  const settingValue = JSON.parse(form.get('value').value.toString());

  await db.saveSetting(settingId, settingValue);

  response = eta.render(
    "./panel/settings_item",
    {
      setting: {id: settingId, value: JSON.stringify(settingValue) }
    }
  );

  response += eta.render(
    "./panel/settings_item_add"
  );

  context.res = {
    status: 200,
    body: response
  };
};