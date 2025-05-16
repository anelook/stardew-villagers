// openaiClient.js
require('dotenv').config();

const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});

async function generateConversationSummary({
                                                name,
                                                partnerName,
                                                history
                                            }) {

    const instructions = `
You're  ${name}, one of the villagers in Stardew Valley. You just had a chat with another villager ${partnerName}. Reflect on this conversation and summarize in one most important thought that is worth remembering about the person you met. Output only the thought. Remember, you're ${name}`;

    // Build the chat history

    const input = `Here is the conversation you had: ---- ${history} -----. 
    
    Summarize it, be brief, keep only the important things.`;

    // return `Message from ${name} to ${partnerName}.}`;
    const response = await client.responses.create({
        model: "gpt-3.5-turbo",
        instructions,
        input
        // max_tokens: 100,
        // temperature: 0.8
    });

    //console.log({response});
    return `I talked with ${partnerName} today: ${response.output_text}`;
}


module.exports = { generateConversationSummary };