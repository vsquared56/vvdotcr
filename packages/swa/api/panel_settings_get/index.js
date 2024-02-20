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
          setting: { id: settingId, value: JSON.stringify(settingValue) }
        }
      );
    } else {
      response = eta.render(
        "./settings_item",
        {
          setting: { id: settingId, value: JSON.stringify(settingValue) }
        }
      );
    }
  } else {
    const allSettings = await db.getAllSettings();
    //Format setting values as JSON for display
    const formattedSettings = allSettings.map(({ id, value }) => ({ id: id, value: JSON.stringify(value) }));

    var settingsItems = "";

    response = eta.render(
      "./settings_table",
      {
        settings: formattedSettings
      }
    );
  }

  context.res = {
    status: 200,
    body: response
  };
};