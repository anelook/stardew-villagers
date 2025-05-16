// openaiClient.js
require('dotenv').config();

const { OpenAI } = require('openai');
const { Client: OpenSearchClient } = require('@opensearch-project/opensearch');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const osClient = new OpenSearchClient({
    node: process.env.OPENSEARCH_NODE_URL,
    auth: {
        username: process.env.OPENSEARCH_USERNAME,
        password: process.env.OPENSEARCH_PASSWORD,
    },
    ssl: {
        rejectUnauthorized: false
    },
});


async function storeLongTermMemory({ conversation_summary, name }) {
    if (typeof conversation_summary !== 'string' || !conversation_summary.trim()) {
        throw new Error('conversation_summary must be a non-empty string');
    }

    // 1) Get embedding from OpenAI
    const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: conversation_summary
    });
    // embeddingRes.data is an array; we only sent one input
    const [{ embedding }] = embeddingRes.data;

    // 2) Prepare document
    const doc = {
        summary: conversation_summary,
        embedding,                        // an array of floats
        timestamp: new Date().toISOString()
    };
    const indexName = process.env.OPENSEARCH_INDEX + '_' + name.toLowerCase();

    // 3) Index into OpenSearch
    const resp = await osClient.index({
        index: indexName,
        body: doc,
        refresh: 'wait_for'               // wait so it's immediately queryable
    });

    return resp;  // you can inspect resp.body._id, resp.statusCode, etc.
}

module.exports = { storeLongTermMemory };