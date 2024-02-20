import * as utils from "@vvdotcr/common";

export default async (context, req) => {
  const db = new utils.Database;

  const settingId = req.params.settingId;
  await db.deleteSetting(settingId);
  context.res = {
    status: 200,
    body: null
  };
};