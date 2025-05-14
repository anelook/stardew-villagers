// server/routes/villager.js
const express = require('express');
const { generateVillagerReply } = require('../villagerResponseLLM');

const router = express.Router();

router.post('/reply', async (req, res) => {

    console.log(req.body);
    const {
        name,
        metadata,
        partnerName,
        partnerMetadata,
        history,
        heardMessage
    } = req.body;

    try {
        const reply = await generateVillagerReply({
            name,
            metadata,
            partnerName,
            partnerMetadata,
            history,
            heardMessage
        });
        res.json({ reply });
    } catch (err) {
        console.error('OpenAI error:', err);
        res.status(500).json({ error: 'LLM failed' });
    }
});

module.exports = router;
