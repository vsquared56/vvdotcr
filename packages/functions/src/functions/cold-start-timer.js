import { app } from '@azure/functions';

const coldStartPingUrl = process.env.PING_URL;

app.timer('cold-start-timer', {
  schedule: '*/3 * * * *',
  handler: async (myTimer, context) => {
    await fetch(coldStartPingUrl, {
      headers: {
        "User-Agent": "cold-start-timer"
      }
    });
  }
});