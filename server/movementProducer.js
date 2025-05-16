// producer.js
const { Kafka } = require('kafkajs');
const { SchemaRegistry, SchemaType } = require('@kafkajs/confluent-schema-registry');
const dotenv = require('dotenv');
dotenv.config();

// Initialize Kafka with your broker and security settings
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

// Configure the Schema Registry connection
const registry = new SchemaRegistry({
    host: process.env.SCHEMA_REGISTRY_URL,
    auth: {
        username: process.env.SCHEMA_REGISTRY_API_KEY,
        password: process.env.SCHEMA_REGISTRY_API_SECRET
    }
});

// Create a Kafka producer instance
const producer = kafka.producer();

// Define the Avro schema for a villager location update
const villagerLocationSchema = {
    type: 'record',
    name: 'villagerMovementRecord',
    namespace: 'stardew',
    fields: [
        { name: 'name', type: 'string' },
        { name: 'x', type: 'float' },
        { name: 'y', type: 'float' },
        { name: 'timestamp', type: { type: 'long', logicalType: 'timestamp-millis' } }
    ]
};

let schemaId;

// Initialize the producer and register the Avro schema
async function initProducer() {
    await producer.connect();
    schemaId = await registry.register({
        type: SchemaType.AVRO,
        schema: JSON.stringify(villagerLocationSchema)
    });
    console.log(`Producer connected and schema registered with id: ${JSON.stringify(schemaId)}`);
}

// Function to send the villager location update message
async function sendVillagerLocationUpdate(villagerName, x, y) {
    const payload = {
        name: villagerName,
        x,
        y,
        timestamp: Date.now()  // current time in epoch milliseconds
    };

    try {
        // Encode the payload using the registered Avro schema
        const encodedPayload = await registry.encode(schemaId.id, payload);

        // Send the encoded message to the Kafka topic (default: 'villager-location-updates')
        await producer.send({
            topic: process.env.KAFKA_VILLAGERS_LOCATION_TOPIC,
            messages: [{ value: encodedPayload }]
        });
        // console.log(`Sent update for ${villagerName}: (${x}, ${y}) at ${payload.timestamp}`);
    } catch (err) {
        console.error('Error sending update to Kafka:', err);
    }
}

// Export the functions for external use
module.exports = {
    initProducer,
    sendVillagerLocationUpdate
};
