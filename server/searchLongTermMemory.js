// retrieveSimilarMemories.js
require('dotenv').config();

const { OpenAI } = require('openai');
const { Client: OpenSearchClient } = require('@opensearch-project/opensearch');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const osClient = new OpenSearchClient({
    node: process.env.OPENSEARCH_NODE_URL,        // e.g. "https://localhost:9200"
    auth: {
        username: process.env.OPENSEARCH_USERNAME,   // e.g. "admin"
        password: process.env.OPENSEARCH_PASSWORD,
    },
    ssl: {                                       // if you disabled TLS checks earlier
        rejectUnauthorized: false
    }
});


async function searchLongTermMemory({ query, name, k = 5 }) {
    console.log({query, name});
    if (typeof query !== 'string' || !query.trim()) {
        throw new Error('query must be a non-empty string');
    }

    // 1) Get embedding for the query
    const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query
    });
    const [{ embedding }] = embeddingRes.data;

    // 2) Build index name
    const indexName = `${process.env.OPENSEARCH_INDEX}_${name.toLowerCase()}`;

    // 3) kNN via script_score + cosineSimilarity
    const { body } = await osClient.search({
        index: indexName,
        size: k,
        body: {
            query: {
                script_score: {
                    query: { match_all: {} },
                    script: {
                        // cosineSimilarity returns [-1,1]; +1 to shift to [0,2] if you like
                        source: "cosineSimilarity(params.query_vector, doc['embedding']) + 1.0",
                        params: { query_vector: embedding }
                    }
                }
            },
            _source: ['summary']   // only fetch the summary field
        }
    });

    const result = body.hits.hits.map(hit => hit._source.summary).join(";");

    // console.log("searchLongTermMemory => ", name.toUpperCase(), result);
    return result;
}

module.exports = { searchLongTermMemory };
