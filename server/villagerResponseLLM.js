// openaiClient.js
require('dotenv').config();

const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});

/**
 * Generate a reply for a villager conversation using the OpenAI Chat API.
 *
 * @param {Object}   opts
 * @param {string}   opts.name             The villager's name
 * @param {Object}   opts.metadata         The villager's metadata (background, loves, etc)
 * @param {string}   opts.partnerName      The other villager's name
 * @param {Object}   opts.partnerMetadata  The other villager's metadata
 * @param {string[]} opts.history          Array of “X said to Y: …” lines so far
 * @param {string}   opts.heardMessage     The last message you want to respond to
 * @returns {Promise<string>}              The villager’s generated reply
 */
async function generateVillagerReply({
                                                name,
                                                metadata,
                                                partnerName,
                                                partnerMetadata,
                                                history,
                                                heardMessage
                                            }) {
    const instructions = `
You are a villager named ${name}.
Background: ${metadata.background}
Loves: ${metadata.loves}
You’re having a friendly conversation with ${partnerName}.
This is the conversation so far: ${history.join(" ===> ")}
Their background: ${partnerMetadata.background}
Their loves: ${partnerMetadata.loves}. 
Keep it short, friendly, and in character. 
 Don't add any extra info, description, explanation - only give a reply. If the conversation is already ongoing, do not greet the villager, just continue talking. If asked a question, answer it and keep up conversation evolving it. 
  `.trim();

    // Build the chat history

    const input = `Pretend you're the character ${name} and reply to ${partnerName}. Keep it short, friendly, and in character. Don't add any extra info, description, explanation - only give what should be spoken outloud. If the conversation is already ongoing, do not greet the villager, just continue talking. If asked a question, answer it and keep up conversation evolving it.`;

    //const relevant info ----

    // return `Message from ${name} to ${partnerName}.}`;
    const response = await client.responses.create({
        model: "gpt-3.5-turbo",
        instructions,
        input
        // max_tokens: 100,
        // temperature: 0.8
    });

    console.log({response});
    return response.output_text;
}


module.exports = { generateVillagerReply };