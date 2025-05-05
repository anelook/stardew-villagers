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

const consumer = kafka.consumer({ groupId: 'villager-proximity-consumer-8' });

async function initConsumer(io) {
    await consumer.connect();
    await consumer.subscribe({
        topic: process.env.KAFKA_PROXIMITY_TOPIC,
        fromBeginning: false
    });

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                // decode Avro‐encoded key & value
                const keyObj   = await registry.decode(message.key);
                const valueObj = await registry.decode(message.value);

                // merge them into one flat object
                const merged = { ...keyObj, ...valueObj };


                console.log("consumer => ", merged);

                io.emit('villagersProximityIOEvent', merged);
            } catch (err) {
                console.error('Failed to decode/process proximity message', err);
            }
        }
    });

    console.log('Kafka proximity‐consumer up and running…');
}

module.exports = { initConsumer };
