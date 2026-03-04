import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [30, 'Username cannot exceed 30 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
        },
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            maxlength: [50, 'Full name cannot exceed 50 characters'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false,
        },
        bio: {
            type: String,
            maxlength: [160, 'Bio cannot exceed 160 characters'],
            default: '',
        },
        avatar: {
            type: String, // Cloudinary or S3 URL
            default: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
        },
        coverImage: {
            type: String, // Cloudinary or S3 URL
            default: '',
        },
        role: {
            type: String,
            enum: {
                values: ['user', 'creator', 'admin', 'superadmin'],
                message: '{VALUE} is not a valid role',
            },
            default: 'user',
        },
        accountStatus: {
            type: String,
            enum: ['active', 'suspended', 'deleted'],
            default: 'active',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isBanned: {
            type: Boolean,
            default: false,
        },
        // Social Features
        followers: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        following: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        // Security / Auth
        refreshToken: {
            type: String,
            select: false,
        },
        otp: {
            type: String,
            select: false,
        },
        otpExpiry: {
            type: Date,
            select: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.password;
                delete ret.refreshToken;
                delete ret.otp;
                delete ret.otpExpiry;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            transform(doc, ret) {
                delete ret.password;
                delete ret.refreshToken;
                delete ret.otp;
                delete ret.otpExpiry;
                delete ret.__v;
                return ret;
            },
        },
    }
);

/**
 * Pre-save middleware to hash password and OTP
 */
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }

    if (this.isModified('otp') && this.otp) {
        this.otp = await bcrypt.hash(this.otp, 10);
    }

    next();
});

/**
 * Instance Methods
 */

// Compare Password
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Compare OTP
userSchema.methods.isOtpCorrect = async function (otp) {
    return await bcrypt.compare(otp, this.otp);
};

// Generate Access Token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            role: this.role,
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
        }
    );
};

// Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d',
        }
    );
};

export const User = mongoose.model('User', userSchema);
