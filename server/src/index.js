import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';
import { redisClient } from './config/redis.js';

dotenv.config({
    path: './.env',
});

import http from 'http';
import { initializeSocket } from './socket/index.js';

// Port & DB connection
const PORT = process.env.PORT || 5000;

// Initialize Redis connection
async function initializeServices() {
    try {
        // Connect to Redis first
        await redisClient.connect();
        console.log('✅ Redis connected successfully');

        // Connect to MongoDB
        await connectDB();
        
        const server = http.createServer(app);
        
        // Initialize Socket.io
        const io = initializeSocket(server);
        app.set('io', io);

        server.listen(PORT, () => {
            console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down gracefully');
            await redisClient.disconnect();
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            console.log('SIGINT received, shutting down gracefully');
            await redisClient.disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

initializeServices().catch((err) => {
    console.error('MONGO db connection failed !!! ', err);
    process.exit(1);
});
