// openaiClient.js
require('dotenv').config();

const {OpenAI} = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // can be omitted if using default env var
});

/**
 * Generate a reply for a villager conversation using the OpenAI Chat API.
 *
 * @param {Object}   opts
 * @param {string}   opts.name              The villager's name
 * @param {Object}   opts.metadata          The villager's metadata (background, loves, etc)
 * @param {string}   opts.partnerName       The other villager's name
 * @param {Object}   opts.partnerMetadata   The other villager's metadata
 * @param {string[]} opts.history           Array of “X said to Y: …” lines so far
 * @param {string}   opts.heardMessage      The last message you want to respond to
 * @param {string}   opts.relevantMemories  Any relevant memories from today
 * @returns {Promise<string>}               The villager’s generated reply
 */
async function generateVillagerReply({
                                         name,
                                         metadata,
                                         partnerName,
                                         partnerMetadata,
                                         history,
                                         heardMessage,
                                         relevantMemories = [],
                                     }) {
    console.log("relevantMemories!!! --- ", relevantMemories);
    const instructions = [
        `You live in Stardew Valley, you are a villager named ${name}.`,
        `YOUR background: ${metadata.background}`,
        // `YOU love: ${metadata.loves}`,
        ``,
        `You’re having a friendly conversation with ${partnerName}.`,
        `Their background: ${partnerMetadata.background}`,
        // `Their loves: ${partnerMetadata.loves}.`,
        ``,
        `${metadata.goal || ""}`,
        ``,
        relevantMemories
            ? `Relevant memories from today that you want to use for conversation: - ${relevantMemories.reply}`
            : '',
        `Your goal is to reply as ${name}:`,
        `- Keep it short, friendly, and in character, refer to what you learned today from others.`,
        `- Avoid shallow small talk or formal conversation.`,
        `- Only give a reply; no explanations or meta-comments.`,
        `- Do not mention your own name; speak as the villager.`,
        `- If conversation is ongoing, do not greet again.`,
        `- Answer questions, ask clarifying questions, and evolve the topic.`
        // `- When the conversation is done, end with exactly "CONVERSATION END".`
    ].join('\n')

    const input = [`Conversation so far:`,
        ...history.map((line, i) => `${i + 1}. ${line}`),
        ``,
        `${partnerName} just said to you: "${heardMessage}"`,
        ``,
        `Please respond. Answer questions, ask clarifying questions, and evolve the topic. Be concise, exchange short phrases:`
    ].join('\n')

    // return "1";
    const response = await client.responses.create({
        model: "gpt-3.5-turbo",
        instructions,
        input
    });

    console.log(`instructions => ${instructions}`);
    // console.log(`input => ${input}`);
    // console.log(`generateVillagerReply => ${name.toUpperCase()}:`, response.output_text);
    return response.output_text;
}

module.exports = {generateVillagerReply};
