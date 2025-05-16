// server/routes/villager.js
const express = require('express');
const { storeLongTermMemory } = require('../storeLongTermMemory');
const { searchLongTermMemory } = require('../searchLongTermMemory');

const router = express.Router();

router.post('/store', async (req, res) => {

    // console.log(req.body);
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

router.post('/search', async (req, res) => {

    // console.log(req.body);
    const {
        query,
        name
    } = req.body;

    try {
        const reply = await searchLongTermMemory({
            query,
            name
        });
        res.json({ reply });
    } catch (err) {
        console.error('Memory error:', err);
        res.status(500).json({ error: 'memory service failed' });
    }
});

module.exports = router;
