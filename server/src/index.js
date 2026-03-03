import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path: './.env',
});

// Port & DB connection
const PORT = process.env.PORT || 5000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MONGO db connection failed !!! ', err);
    });
