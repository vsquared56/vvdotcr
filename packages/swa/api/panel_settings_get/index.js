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
 
  const edit = req.params.edit;
  const settingId = req.params.settingId;

  if (settingId === 'new') {
    response = eta.render(
      "./settings_item_new"
    );
  } else if (settingId === 'add') {
    response = eta.render(
      "./settings_item_add"
    );
  } else if (settingId) {
    const settingValue = await db.getSetting(settingId);
    if (edit) {
      response = eta.render(
        "./settings_item_edit",
        {
          settingName: settingId,
          settingValue: JSON.stringify(settingValue)
        }
      );
    } else {
      response = eta.render(
        "./settings_item",
        {
          settingName: settingId,
          settingValue: JSON.stringify(settingValue)
        }
      );
    }
  } else {
    const allSettings = await db.getAllSettings();
    var settingsItems = "";

    for (const setting of allSettings) {
      settingsItems += eta.render(
        "./settings_item",
        {
          settingName: settingId,
          settingValue: JSON.stringify(settingValue)
        }
      );
    }

    response = eta.render(
      "./settings_table",
      {
        settingsItems: settingsItems
      }
    );
  }

  context.res = {
    status: 200,
    body: response
  };
};