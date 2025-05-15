// server/routes/villager.js
const express = require('express');
const { generateConversationSummary } = require('../conversationSummaryLLM');

const router = express.Router();

router.post('/summary', async (req, res) => {

    console.log(req.body);
    const {
        name,
        partnerName,
        history
    } = req.body;

    try {
        const reply = await generateConversationSummary({
            name,
            partnerName,
            history
        });
        res.json({ reply });
    } catch (err) {
        console.error('OpenAI error:', err);
        res.status(500).json({ error: 'LLM failed' });
    }
});

module.exports = router;
