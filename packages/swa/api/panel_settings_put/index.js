import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const settingId = req.params.settingId;

  var response;

  const form = req.parseFormBody();
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

  context.res = {
    status: 200,
    body: response
  };
};