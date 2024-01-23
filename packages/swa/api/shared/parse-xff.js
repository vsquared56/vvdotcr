import ipRangeCheck from "ip-range-check"

import * as utils from "@vvdotcr/common";

export default async function parseXff(xff) {
    const trustedIpBlocks = await utils.getSetting("trusted_xff_ip_blocks");

    const regex = /^(.*?(?:[^:]|::))(?:(:)([0-9]*))?$/;
    const xffArr = xff.replace(/\s/g, "").split(",")

    var clientIp = null;
    var i = xffArr.length - 1;
    do {
        const matches = xffArr[i].match(regex);
        if (matches && matches.length == 4) {
            const ip = matches[1].replace(/\[|\]/g, "")
            if (ipRangeCheck(ip, trustedIpBlocks)) {
                i--;
            }
            else {
                clientIp = ip;
            }
        }
        else {
            throw new Error('Error parsing IP from X-Forwarded-For: ' + xffArr[i]);
        }
    }
    while (i >= 0 && clientIp == null);
    return clientIp;
}