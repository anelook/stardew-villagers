// index.js
const path = require('path');
const express = require('express');
const http = require('http');
const {initMovementProducer, sendVillagerLocationUpdate} = require('./server/movementProducer');
const {initMovementConsumer} = require('./server/proximityConsumer');

const {initConversationProducer, sendConversationMessage} = require('./server/conversationProducer');
const {initConversationConsumer} = require('./server/conversationConsumer');

const replyRoutes = require('./server/routes/reply');
const summaryRoutes = require('./server/routes/summary');
const memoryRoutes = require('./server/routes/memory');

// initi conversation producer and consumer
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);


const PORT = process.env.PORT || 3000;

// serve static assets...
app.use(express.static('public'));
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use("/api/villager", replyRoutes);
app.use("/api/general", summaryRoutes);
app.use("/api/memory", memoryRoutes);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// connect to Kafka
initMovementProducer().catch(err => {
    console.error('Failed to initialize Kafka producer', err);
    process.exit(1);
});

// connect to Kafka consumer (for proximity)
initMovementConsumer(io).catch(err => {
    console.error('Failed to initialize Kafka consumer', err);
    process.exit(1);
});

initConversationProducer().catch(err => {
    console.error('Failed to init conversation producer', err);
    process.exit(1);
});

initConversationConsumer(io).catch(err => {
    console.error('Failed to init conversation consumer', err);
    process.exit(1);
});

// when any client connects via WebSocket...
io.on('connection', socket => {
    console.log(`Client connected: ${socket.id}`);
    // socket.on('villagerMessage', (msg) => {
    //     console.log("villagerMessage", msg);
    // })

    // socket.on('villagerMessage', msg => {
    //     // console.log('received villagerMessage on server:', msg);
    //     // send to *all* clients (including sender) – or use socket.broadcast.emit to exclude sender
    //     io.emit('villagerMessage', msg);
    // });

    socket.on('villagerMessageFromClient', async msg => {
        // msg should include: { from: 'villagerA', to: 'villagerB', message: 'Hello' }
        try {
            await sendConversationMessage(msg.from, msg.to, msg.message);
            console.log(`Produced conversation message from ${msg.from} → ${msg.to}`);
        } catch (err) {
            console.error('Error sending conversation message to Kafka:', err);
        }
    });

    // listen for villager updates
    socket.on('villagerLocationUpdated', async ({name, x, y}) => {
        try {
            await sendVillagerLocationUpdate(name, x, y);
            // console.log(`Received ${name}  ${x}  ${y}`);
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
