// conversationConsumer.js
const { Kafka } = require('kafkajs');
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');
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

const conversationConsumer = kafka.consumer({ groupId: 'villager-conversation-consumer' });

async function initConversationConsumer(io) {
    await conversationConsumer.connect();
    await conversationConsumer.subscribe({
        topic: process.env.KAFKA_CONVERSATION_TOPIC,
        fromBeginning: false
    });

    await conversationConsumer.run({
        eachMessage: async ({ message }) => {
            const { from, to, message: text, timestamp } = await registry.decode(message.value);
            console.log('📬 conversation →', { from, to, text });

            // Send only to the socket(s) of the target villager
            // (assumes you have joined each villager to a room named after them)
            console.log('villagerConversationMessage', { from, to, message:text, timestamp });
            io.emit('villagerConversationMessage', { from, to, message:text, timestamp });
        }
    });

    console.log('Kafka conversation‐consumer up and running…');
}

module.exports = { initConversationConsumer };
