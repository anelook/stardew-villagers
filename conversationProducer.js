// conversationProducer.js
const { Kafka } = require('kafkajs');
const { SchemaRegistry, SchemaType } = require('@kafkajs/confluent-schema-registry');
require('dotenv').config();

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID,
    brokers: [process.env.KAFKA_BROKER],
    ssl: true,
    sasl: {
        mechanism: 'plain',
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
    }
});

const registry = new SchemaRegistry({
    host: process.env.SCHEMA_REGISTRY_URL,
    auth: {
        username: process.env.SCHEMA_REGISTRY_API_KEY,
        password: process.env.SCHEMA_REGISTRY_API_SECRET
    }
});

const producer = kafka.producer();

const conversationSchema = {
    type: 'record',
    name: 'VillagerConversationMessage',
    namespace: 'stardew',
    fields: [
        { name: 'from',    type: 'string' },
        { name: 'to',      type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'timestamp', type: { type: 'long', logicalType: 'timestamp-millis' } }
    ]
};

let schemaId;

async function initConversationProducer() {
    await producer.connect();
    const { id } = await registry.register({
        type: SchemaType.AVRO,
        schema: JSON.stringify(conversationSchema)
    });
    schemaId = id;
    console.log(`Conversation producer ready (schema id=${schemaId})`);
}

async function sendConversationMessage(from, to, message) {
    const payload = { from, to, message, timestamp: Date.now() };
    const encoded = await registry.encode(schemaId, payload);

    await producer.send({
        topic: process.env.KAFKA_CONVERSATION_TOPIC,
        messages: [{ value: encoded }]
    });
}

module.exports = {
    initConversationProducer,
    sendConversationMessage
};
