const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            user: req.user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve profile'
        });
    }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const users = await User.find({ isActive: true })
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments({ isActive: true });

        res.json({
            users,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total,
                limit
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve users'
        });
    }
});

module.exports = router;
