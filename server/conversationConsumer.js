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
            try {
                const decoded = await registry.decode(message.value);
                // decoded will be { from, to, message, timestamp }
                console.log('🤖 conversation →', decoded);
                io.emit('villagerConversationMessage', decoded);
            } catch (err) {
                console.error('Error decoding conversation message', err);
            }
        }
    });

    console.log('Kafka conversation‐consumer up and running…');
}

module.exports = { initConversationConsumer };
