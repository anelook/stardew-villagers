// server/routes/villager.js
const express = require('express');
const { storeLongTermMemory } = require('../storeLongTermMemory');

const router = express.Router();

router.post('/store', async (req, res) => {

    console.log(req.body);
    const {
        conversation_summary,
        name
    } = req.body;

    try {
        const reply = await storeLongTermMemory({
            conversation_summary,
            name
        });
        res.json({ reply });
    } catch (err) {
        console.error('Memory error:', err);
        res.status(500).json({ error: 'memory service failed' });
    }
});

module.exports = router;
