import { CosmosClient } from "@azure/cosmos";

export async function getSighting(id) {
    const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
    const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;
    const COSMOS_DB_CONTAINER_NAME = "vvdotcr-fileupload-dev";

    const cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
    const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_DATABASE_NAME });
    const { container } = await database.containers.createIfNotExists({
        id: COSMOS_DB_CONTAINER_NAME,
        partitionKey: {
            paths: "/id"
        }
    });

    const { resource } = await container.item(id, id).read();
    if (resource === undefined) {
        throw new Error(`Error reading file upload document ${id} from CosmosDB`);
    }
    else {
        return resource;
    }
}

export async function saveSighting(sighting) {
    const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
    const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;
    const COSMOS_DB_CONTAINER_NAME = "vvdotcr-fileupload-dev";

    const cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
    const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_DATABASE_NAME });
    const { container } = await database.containers.createIfNotExists({
        id: COSMOS_DB_CONTAINER_NAME,
        partitionKey: {
            paths: "/id"
        }
    });
    const { upsert } = await container.items.upsert(sighting);
}

export async function getSetting(name) {
    const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
    const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;
    const COSMOS_DB_CONTAINER_NAME = "vvdotcr-settings-dev";

    const cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
    const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_DATABASE_NAME });
    const { container } = await database.containers.createIfNotExists({
        id: COSMOS_DB_CONTAINER_NAME,
        partitionKey: {
            paths: "/id"
        }
    });

    const { resource } = await container.item(name, name).read();
    if (resource === undefined) {
        throw new Error(`Error reading setting ${name} from CosmosDB`);
    }
    else {
        return resource.value;
    }
}

export async function saveSetting(name, value) {
    const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
    const COSMOS_DB_DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME;
    const COSMOS_DB_CONTAINER_NAME = "vvdotcr-settings-dev";

    const cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
    const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_DATABASE_NAME });
    const { container } = await database.containers.createIfNotExists({
        id: COSMOS_DB_CONTAINER_NAME,
        partitionKey: {
            paths: "/id"
        }
    });

    const item = {
        id: "name",
        modifyDate: Date.now(),
        value: value
    }

    const { resource } = await container.items.upsert(item);
}