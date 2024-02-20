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
  
  const settingId = req.params.settingId;

  const form = req.parseFormBody();
  const settingValue = JSON.parse(form.get('value').value.toString());

  await db.saveSetting(settingId, settingValue);

  response = eta.render(
    "./settings_item",
    {
      settingName: settingId,
      settingValue: JSON.stringify(settingValue)
    }
  );

  context.res = {
    status: 200,
    body: response
  };
};