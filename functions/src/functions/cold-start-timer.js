import { app } from '@azure/functions';

app.timer('cold-start-timer', {
    schedule: '*/3 * * * *',
    handler: async (myTimer, context) => {
        const run = "Triggered."
    }
});