import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());
app.use(helmet());
app.use(morgan('dev'));

// Import Routes
import urlRouter from './routes/url.routes.js';
import chatRouter from './routes/chat.routes.js';

// Basic Route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Welcome to Onnec API' });
});

// Routes Declaration
app.use('/api/v1/url', urlRouter);
app.use('/api/v1/chat', chatRouter);

export { app };
