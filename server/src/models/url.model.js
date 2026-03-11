import mongoose, { Schema } from 'mongoose';

const urlSchema = new Schema(
    {
        originalUrl: {
            type: String,
            required: [true, 'Original URL is required'],
            trim: true,
        },
        shortCode: {
            type: String,
            required: [true, 'Short code is required'],
            unique: true,
            index: true,
            trim: true,
        },
        clicks: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

export const Url = mongoose.model('Url', urlSchema);
