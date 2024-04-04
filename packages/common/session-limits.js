import { Database } from "./db.js"
import * as cookie from "cookie";
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

const SESSION_COOKIE_NAME = "vvdotcrsession";

export async function getOrCreateSession(cookieHeader) {
  const db = new Database;
  if (!cookieHeader) {
    return (await createSession(db));
  } else {
    const parsedCookies = cookie.parse(cookieHeader);
    if (parsedCookies[SESSION_COOKIE_NAME]) {
      if (uuidValidate(parsedCookies[SESSION_COOKIE_NAME])) {
        if (await db.countSessionsById(parsedCookies[SESSION_COOKIE_NAME]) === 1) {
          return { sessionId: parsedCookies[SESSION_COOKIE_NAME], new: false, err: null };
        } else {
          return (await createSession(db));
        }
      } else {
        return { sessionId: null, new: false, err: "Invalid sessionId parsed from cookie" };
      }
    } else {
      return (await createSession(db));
    }
  }
}

export async function createSession(db) {
  const sessionId = uuidv4();
  const createDate = Date.now();
  const sessionItem = {
    id: sessionId,
    createDate: createDate,
    modifyDate: createDate
  }
  await db.saveSession(sessionItem);
  return { sessionId: sessionId, new: true, err: null };
}

export async function getSession(cookieHeader) {
  const db = new Database;

  if (!cookieHeader) {
    return { sessionId: null, new: false, err: "No session defined in cookies" };
  } else {
    const parsedCookies = cookie.parse(cookieHeader);
    if (parsedCookies[SESSION_COOKIE_NAME]) {
      if (uuidValidate(parsedCookies[SESSION_COOKIE_NAME])) {
        if (await db.countSessionsById(parsedCookies[SESSION_COOKIE_NAME]) === 1) {
          return { sessionId: parsedCookies[SESSION_COOKIE_NAME], new: false, err: null };
        } else {
          return { sessionId: null, new: false, err: `No existing session with ID ${parsedCookies[SESSION_COOKIE_NAME]}` };
        }
      } else {
        return { sessionId: null, new: false, err: "Invalid sessionId parsed from cookie" };
      }
    } else {
      return { sessionId: null, new: false, err: "No session defined in cookies" };
    }
  }
}

export async function getResponseCookie(sessionData) {
  if (sessionData.sessionId && sessionData.new === false) {
    return null;
  } else if (sessionData.sessionId && sessionData.new && !sessionData.err) {
    return {
      name: SESSION_COOKIE_NAME,
      value: sessionData.sessionId,
      path: "/api",
      httpOnly: true,
      secure: true,
      sameSite: "lax"
    };
  } else {
    throw new Error("Calling getResponseCookie() with invalid sessionData");
  }
}

export async function isActionRateLimited(ip, session, actionType) {
  const db = new Database;

  const rateLimits = await db.getSetting("action_rate_limits");
  var isRateLimited = false;
  for (var limit of rateLimits) {
    if (limit.actionType === actionType) {
      var recentActions;
      if (limit.originatorType === "ip") {
        recentActions = await db.countActions(actionType, "ip", ip, (Date.now() - limit.seconds * 1000));
      } else if (limit.originatorType === "session") {
        recentActions = await db.countActions(actionType, "session", session, (Date.now() - limit.seconds * 1000));
      } else {
        throw new Error("Invalid rate limit in action_rate_limits");
      }

      if (recentActions >= limit.limit) {
        isRateLimited = true;
      }
    }
  }

  return isRateLimited;
}

export async function saveAction(ip, session, actionType, actionTarget) {
  const db = new Database;
  const actionId = uuidv4();
  const createDate = Date.now();
  const actionItem = {
    id: actionId,
    createDate: createDate,
    modifyDate: createDate,
    ip: ip,
    session: session,
    actionType: actionType,
    actionTarget: actionTarget
  }
  return db.saveAction(actionItem);
}