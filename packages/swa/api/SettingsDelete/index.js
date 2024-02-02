import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const settingId = req.params.settingId;
  await utils.deleteSetting(settingId);
  context.res = {
    status: 200,
    body: null
  };
};