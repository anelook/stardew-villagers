// index.js
const path = require('path');
const express = require('express');
const http = require('http');
const { initProducer, sendVillagerLocationUpdate } = require('./producer');
const { initConsumer } = require('./consumer');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

// serve static assets...
app.use(express.static('public'));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/data',   express.static(path.join(__dirname, 'data')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// connect to Kafka
initProducer().catch(err => {
    console.error('Failed to initialize Kafka producer', err);
    process.exit(1);
});

// connect to Kafka consumer (for proximity)
initConsumer().catch(err => {
    console.error('Failed to initialize Kafka consumer', err);
    process.exit(1);
});

// when any client connects via WebSocket...
io.on('connection', socket => {
    console.log(`Client connected: ${socket.id}`);

    // listen for villager updates
    socket.on('villagerLocationUpdated', async ({ name, x, y }) => {
        try {
            await sendVillagerLocationUpdate(name, x, y);
            console.log(`Received ${name}  ${x}  ${y}`);
        } catch (err) {
            console.error('Error sending to Kafka:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// start the server
server.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
});
