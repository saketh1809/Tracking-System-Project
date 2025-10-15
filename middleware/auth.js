const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                error: 'Access denied', 
                message: 'No token provided' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.userId);
        
        if (!user || !user.isActive) {
            return res.status(401).json({ 
                error: 'Access denied', 
                message: 'Invalid token or user not found' 
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired', 
                message: 'Please log in again' 
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token', 
                message: 'Please log in again' 
            });
        }
        
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Authentication failed' 
        });
    }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Access forbidden', 
            message: 'Admin access required' 
        });
    }
    next();
};

// Middleware to check if user is agent or admin
const requireAgent = (req, res, next) => {
    if (!['agent', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ 
            error: 'Access forbidden', 
            message: 'Agent or admin access required' 
        });
    }
    next();
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (user && user.isActive) {
                req.user = user;
            }
        }
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireAgent,
    optionalAuth
};
