import { CosmosClient } from "@azure/cosmos";

export class Database {
    constructor() {
        const environment = process.env.ENVIRONMENT_NAME.toLowerCase();
        this.client = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
        this.database = this.client.database(process.env.COSMOS_DB_DATABASE_NAME);
        this.actionsContainer = this.database.container(`vvdotcr-actions-${environment}`);
        this.messagesContainer = this.database.container(`vvdotcr-messages-${environment}`);
        this.notificationsContainer = this.database.container(`vvdotcr-notifications-${environment}`);
        this.sessionsContainer = this.database.container(`vvdotcr-sessions-${environment}`);
        this.settingsContainer = this.database.container(`vvdotcr-settings-${environment}`);
        this.sightingsContainer = this.database.container(`vvdotcr-sightings-${environment}`);
    }

    async saveAction(action) {
        action.modifyDate = Date.now();
        const { upsert } = await this.actionsContainer.items.upsert(action);
    }

    async countActions(actionType, originatorType, originatorValue, minCreateDate) {
        var querySpec;
        if (originatorType === "ip") {
            querySpec = {
                query: `SELECT VALUE COUNT(c.id) FROM actions c WHERE c.actionType = '${actionType}' AND c.ip = '${originatorValue}' AND c.createDate > ${minCreateDate}`
            };
        } else if (originatorType === "session") {
            querySpec = {
                query: `SELECT VALUE COUNT(c.id) FROM actions c WHERE c.actionType = '${actionType}' AND c.session = '${originatorValue}' AND c.createDate > ${minCreateDate}`
            };
        }

        const results = await this.actionsContainer.items.query(querySpec, {
            partitionKey: undefined
        }).fetchNext();

        return results.resources[0];
    }

    async getMessage(id) {
        const { resource } = await this.messagesContainer.item(id, id).read();
        if (resource === undefined) {
            throw new Error(`Error reading message ${id} from CosmosDB`);
        }
        else {
            return resource;
        }
    }

    async countMessages() {
        const querySpec = {
            query: "SELECT VALUE COUNT(c.id) FROM messages c"
        };

        const results = await this.messagesContainer.items.query(querySpec, {
            partitionKey: undefined
        }).fetchNext();

        return results.resources[0];
    }

    async deleteMessage(id) {
        await this.messagesContainer.item(id, id).delete();
    }

    async getPaginatedMessages(count, page) {
        var querySpec;

        if (page) {
            const offset = count * (page - 1);
            querySpec = {
                query: `SELECT * FROM c ORDER BY c.createDate DESC OFFSET ${offset} LIMIT ${count}`
            };
        } else {
            querySpec = {
                query: `SELECT * FROM c ORDER BY c.createDate DESC`
            };
        }

        const results = await this.messagesContainer.items.query(querySpec, {
            maxItemCount: count,
            partitionKey: undefined
        }).fetchNext();

        return {
            items: results.resources,
            continuationToken: results.continuationToken
        };
    }

    async patchMessage(id, operations) {
        operations.push({op: 'replace', path: '/modifyDate', value: Date.now()});
        const { updated } = await this.messagesContainer.item(id, id).patch(operations);
    }

    async saveMessage(message) {
        message.modifyDate = Date.now();
        const { upsert } = await this.messagesContainer.items.upsert(message);
    }

    async countRecentNotifications(minCreateDate) {
        const querySpec = {
            query: `SELECT VALUE COUNT(c.id) FROM notifications c WHERE c.createDate > ${minCreateDate}`
        };

        const results = await this.notificationsContainer.items.query(querySpec, {
            partitionKey: undefined
        }).fetchNext();

        return results.resources[0];
    }

    async saveNotification(notification) {
        notification.modifyDate = Date.now();
        const { upsert } = await this.notificationsContainer.items.upsert(notification);
    }

    async countSessionsById(id) {
        const querySpec = {
            query: `SELECT VALUE COUNT(c.id) FROM sessions c WHERE c.id = '${id}'`
        };

        const results = await this.sessionsContainer.items.query(querySpec, {
            partitionKey: undefined
        }).fetchNext();

        return results.resources[0];
    }

    async getSession(id) {
        const { resource } = await this.sessionsContainer.item(id, id).read();
        if (resource === undefined) {
            throw new Error(`Error reading session ${id} from CosmosDB`);
        }
        else {
            return resource;
        }
    }

    async deleteSession(id) {
        await this.sessionsContainer.item(id, id).delete();
    }

    async saveSession(session) {
        session.modifyDate = Date.now();
        const { upsert } = await this.sessionsContainer.items.upsert(session);
    }

    async getSighting(id) {
        const { resource } = await this.sightingsContainer.item(id, id).read();
        if (resource === undefined) {
            throw new Error(`Error reading sighting ${id} from CosmosDB`);
        }
        else {
            return resource;
        }
    }

    async deleteSighting(id) {
        await this.sightingsContainer.item(id, id).delete();
    }

    async getPaginatedSightings(count, includeUnpublished, page) {
        var querySpec, whereClause;
        if (includeUnpublished) {
            whereClause = "";
        } else {
            whereClause = "WHERE c.isPublished";
        }
        if (page) {
            const offset = count * page;
            querySpec = {
                query: `SELECT * FROM c ${whereClause} ORDER BY c.createDate DESC OFFSET ${offset} LIMIT ${count}`
            };
        } else {
            querySpec = {
                query: `SELECT * FROM c ${whereClause} ORDER BY c.createDate DESC`
            };
        }

        const results = await this.sightingsContainer.items.query(querySpec, {
            maxItemCount: count,
            partitionKey: undefined
        }).fetchNext();

        return {
            items: results.resources,
            continuationToken: results.continuationToken
        };
    }

    async patchSighting(id, operations) {
        operations.push({op: 'replace', path: '/modifyDate', value: Date.now()});
        const { updated } = await this.sightingsContainer.item(id, id).patch(operations);
    }

    async saveSighting(sighting) {
        sighting.modifyDate = Date.now();
        const { upsert } = await this.sightingsContainer.items.upsert(sighting);
    }

    async getSetting(name) {
        const { resource } = await this.settingsContainer.item(name, name).read();
        if (resource === undefined) {
            throw new Error(`Error reading setting ${name} from CosmosDB`);
        }
        else {
            return resource.value;
        }
    }

    async getAllSettings() {
        const querySpec = {
            query: "SELECT * FROM c"
        };
        const { resources } = await this.settingsContainer.items.query(querySpec).fetchAll();
    
        return resources;
    }

    async saveSetting(name, value) {
        const item = {
            id: name,
            modifyDate: Date.now(),
            value: value
        }
    
        const { resource } = await this.settingsContainer.items.upsert(item);
    }

    async deleteSetting(name) {
        await this.settingsContainer.item(name, name).delete();
    }
}