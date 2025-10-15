const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Token expires in 7 days
    );
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', [
    body('fullName')
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('phone')
        .matches(/^[0-9]{10}$/)
        .withMessage('Please provide a valid 10-digit phone number'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Please check your input',
                details: errors.array()
            });
        }

        const { fullName, email, phone, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { phone: phone }
            ]
        });

        if (existingUser) {
            const field = existingUser.email === email.toLowerCase() ? 'email' : 'phone';
            return res.status(400).json({
                error: 'User already exists',
                message: `A user with this ${field} already exists`
            });
        }

        // Create new user
        const user = new User({
            fullName: fullName.trim(),
            email: email.toLowerCase(),
            phone,
            password
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Registration error:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({
                error: 'Duplicate entry',
                message: `This ${field} is already registered`
            });
        }

        res.status(500).json({
            error: 'Server error',
            message: 'Something went wrong during registration'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Please check your input',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user and validate password
        const user = await User.findByCredentials(email, password);

        // Generate token
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
                lastLogin: user.lastLogin,
                preferences: user.preferences
            }
        });

    } catch (error) {
        console.error('Login error:', error);

        // Handle specific authentication errors
        if (error.message.includes('Invalid login credentials')) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Incorrect email or password'
            });
        }

        if (error.message.includes('Account temporarily locked')) {
            return res.status(423).json({
                error: 'Account locked',
                message: 'Account temporarily locked due to too many failed login attempts. Please try again later.'
            });
        }

        res.status(500).json({
            error: 'Server error',
            message: 'Something went wrong during login'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                fullName: req.user.fullName,
                email: req.user.email,
                phone: req.user.phone,
                role: req.user.role,
                isEmailVerified: req.user.isEmailVerified,
                isPhoneVerified: req.user.isPhoneVerified,
                address: req.user.address,
                preferences: req.user.preferences,
                lastLogin: req.user.lastLogin,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve user information'
        });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, [
    body('fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('phone')
        .optional()
        .matches(/^[0-9]{10}$/)
        .withMessage('Please provide a valid 10-digit phone number')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Please check your input',
                details: errors.array()
            });
        }

        const { fullName, phone, address, preferences } = req.body;
        const userId = req.user._id;

        // Build update object
        const updateData = {};
        if (fullName) updateData.fullName = fullName.trim();
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;
        if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

        // Check if phone is already taken by another user
        if (phone) {
            const existingUser = await User.findOne({ 
                phone, 
                _id: { $ne: userId } 
            });
            
            if (existingUser) {
                return res.status(400).json({
                    error: 'Phone already taken',
                    message: 'This phone number is already registered with another account'
                });
            }
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            updateData, 
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                address: updatedUser.address,
                preferences: updatedUser.preferences,
                updatedAt: updatedUser.updatedAt
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                error: 'Duplicate entry',
                message: 'This phone number is already registered'
            });
        }

        res.status(500).json({
            error: 'Server error',
            message: 'Failed to update profile'
        });
    }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authenticateToken, [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Please check your input',
                details: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const user = req.user;

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                error: 'Invalid password',
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to change password'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
    res.json({
        message: 'Logged out successfully'
    });
});

module.exports = router;
