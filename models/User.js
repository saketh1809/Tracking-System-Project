const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long']
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'agent'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    avatar: {
        type: String,
        default: null
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: {
            type: String,
            match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode']
        },
        country: {
            type: String,
            default: 'India'
        }
    },
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: true },
            push: { type: Boolean, default: true }
        },
        language: {
            type: String,
            enum: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'],
            default: 'en'
        },
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light'
        }
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    lastLogin: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date
}, {
    timestamps: true,
    toJSON: { 
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            delete ret.emailVerificationToken;
            delete ret.emailVerificationExpires;
            delete ret.__v;
            return ret;
        }
    }
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Method to handle login attempts and locking
userSchema.methods.incLoginAttempts = function() {
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 hours

    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Check if we have hit max attempts and should lock
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime };
    }
    
    return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
    return this.updateOne({ lastLogin: new Date() });
};

// Static method to find by credentials
userSchema.statics.findByCredentials = async function(email, password) {
    const user = await this.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
    });
    
    if (!user) {
        throw new Error('Invalid login credentials');
    }
    
    // Check if account is locked
    if (user.isLocked) {
        throw new Error('Account temporarily locked due to too many failed login attempts');
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
        // Increment login attempts
        await user.incLoginAttempts();
        throw new Error('Invalid login credentials');
    }
    
    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
    }
    
    // Update last login
    await user.updateLastLogin();
    
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
