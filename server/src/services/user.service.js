import { User } from '../models/user.model.js';

class UserService {
    /**
     * Find user by email including sensitive fields
     */
    async findByEmail(email) {
        return await User.findOne({ email }).select('+password +refreshToken +otp +otpExpiry');
    }

    /**
     * Find user by username
     */
    async findByUsername(username) {
        return await User.findOne({ username });
    }

    /**
     * Find user by ID
     */
    async findById(id) {
        return await User.findById(id);
    }

    /**
     * Create new user
     */
    async registerUser(userData) {
        return await User.create(userData);
    }

    /**
     * Update user details
     */
    async updateUserInfo(userId, updateData) {
        return await User.findByIdAndUpdate(
            userId,
            {
                $set: updateData,
            },
            {
                new: true,
                runValidators: true,
            }
        );
    }

    /**
     * Handle Refresh Token Updates
     */
    async updateRefreshToken(userId, refreshToken) {
        return await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    refreshToken: refreshToken,
                },
            },
            { new: true }
        );
    }
}

export default new UserService();
