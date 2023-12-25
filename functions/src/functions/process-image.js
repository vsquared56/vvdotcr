import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

app.serviceBusQueue('process-image', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    queueName: 'new-file-uploads',
    handler: async (message, context) => {
        var item;
        const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
        const { database } = await cosmosClient.databases.createIfNotExists({ id: process.env.COSMOS_DB_DATABASE_NAME });
        const { container } = await database.containers.createIfNotExists({
            id: "vvdotcr-fileupload-dev",
            partitionKey: {
                paths: "/id"
            }
        });
        console.log(message);
        const { resource } = await container.item(message, message).read();
        if (resource === undefined) {
            throw new Error(`Error reading file upload document ${message} from CosmosDB`);
        }
        else {
            item = resource;
        }

        item.modifyDate = Date.now();

        const { upsert } = await container.items.upsert(item);
        
    },
});