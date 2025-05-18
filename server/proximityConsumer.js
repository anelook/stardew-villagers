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

const consumer = kafka.consumer({
    readUncommitted: true,
    groupId: 'villager-proximity-consumer-8',
    // Don’t wait long if there’s only a little data:
    minBytes: 1,            // default is 1, ensures it returns on any data
    maxWaitTimeInMs: 100,   // instead of 5000ms, wait at most 100 ms
    // Optionally cap the total bytes fetched per request
    maxBytes: 1048576       // e.g. 1 MB max per fetch (default 10 MB)
});

async function initMovementConsumer(io) {
    await consumer.connect();
    await consumer.subscribe({
        topic: process.env.KAFKA_PROXIMITY_TOPIC,
        fromBeginning: false
    });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                // decode Avro‐encoded key & value
                // const keyObj   = await registry.decode(message.key);
                const valueObj = await registry.decode(message.value);

                // merge them into one flat object
                // const merged = { ...keyObj, ...valueObj };
                // console.log("=====> message.offset: ", message.offset);


                // console.log("consumer ====> ", merged);
                // console.log("consumer ====> ", JSON.stringify(valueObj));

                io.emit('villagersProximityIOEvent', valueObj);
            } catch (err) {
                console.error('Failed to decode/process proximity message', err);
            }
        }
    });

    console.log('Kafka proximity‐consumer up and running…');
}

module.exports = { initMovementConsumer };
