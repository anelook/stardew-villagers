// consumer.js
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

const consumer = kafka.consumer({ groupId: 'villager-proximity-consumer' });

async function initConsumer(io) {
    await consumer.connect();
    await consumer.subscribe({
        topic: process.env.KAFKA_PROXIMITY_TOPIC || 'villagersProximity',
        fromBeginning: false
    });

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                // decode Avro‐encoded payload
                const payload = await registry.decode(message.value);
                // emit over socket.io to all connected clients
                io.emit('villagersProximity', payload);
            } catch (err) {
                console.error('Failed to decode/process proximity message', err);
            }
        }
    });

    console.log('Kafka proximity‐consumer up and running…');
}

module.exports = { initConsumer };
