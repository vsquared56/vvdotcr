import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  var response;

  const form = req.parseFormBody();
  const settingId = form.get('name').value.toString();
  const settingValue = JSON.parse(form.get('value').value.toString());

  await db.saveSetting(settingId, settingValue);

  response = utils.renderTemplate(
    'settings_item',
    {
      settingName: settingId,
      settingValue: JSON.stringify(settingValue)
    },
    context
  );
  response += utils.renderTemplate('settings_item_add', null, context);

  context.res = {
    status: 200,
    body: response
  };
};