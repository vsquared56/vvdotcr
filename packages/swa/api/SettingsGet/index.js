import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var response;
 
  const edit = req.params.edit;
  const settingId = req.params.settingId;

  if (settingId === 'new') {
    response = utils.renderTemplate('settings_item_new', null, context);
  } else if (settingId === 'add') {
    response = utils.renderTemplate('settings_item_add', null, context);
  } else if (settingId) {
    const settingValue = await utils.getSetting(settingId);
    if (edit) {
      response = utils.renderTemplate(
        'settings_item_edit',
        {
          settingName: settingId,
          settingValue: JSON.stringify(settingValue)
        },
        context
      );
    } else {
      response = utils.renderTemplate(
        'settings_item',
        {
          settingName: settingId,
          settingValue: JSON.stringify(settingValue)
        },
        context
      );
    }
  } else {
    const allSettings = await utils.getAllSettings();
    var settingsItems = "";

    for (const setting of allSettings) {
      settingsItems += utils.renderTemplate(
        'settings_item',
        {
          settingName: setting.id,
          settingValue: JSON.stringify(setting.value)
        },
        context
      );
    }

    response = utils.renderTemplate(
      'settings_table',
      { settingsItems: settingsItems },
      context
    );
  }

  context.res = {
    status: 200,
    body: response
  };
};