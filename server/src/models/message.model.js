import mongoose, { Schema } from 'mongoose';

const messageSchema = new Schema(
    {
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        chat: {
            type: Schema.Types.ObjectId,
            ref: 'Chat',
            required: true,
        },
        attachments: [
            {
                type: String, // URL to file
            },
        ],
    },
    {
        timestamps: true,
    }
);

export const Message = mongoose.model('Message', messageSchema);
