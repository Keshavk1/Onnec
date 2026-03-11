import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path: './.env',
});

import http from 'http';
import { initializeSocket } from './socket/index.js';

// Port & DB connection
const PORT = process.env.PORT || 5000;

connectDB()
    .then(() => {
        const server = http.createServer(app);
        
        // Initialize Socket.io
        const io = initializeSocket(server);
        app.set('io', io);

        server.listen(PORT, () => {
            console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MONGO db connection failed !!! ', err);
    });
