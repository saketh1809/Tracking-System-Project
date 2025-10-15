const mongoose = require('mongoose');

const trackingEventSchema = new mongoose.Schema({
    status: {
        type: String,
        required: true,
        enum: ['Order Placed', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned', 'Cancelled', 'Exception']
    },
    location: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    coordinates: {
        latitude: Number,
        longitude: Number
    },
    agent: {
        name: String,
        id: String,
        contact: String
    }
});

const shipmentSchema = new mongoose.Schema({
    trackingNumber: {
        type: String,
        required: [true, 'Tracking number is required'],
        unique: true,
        uppercase: true,
        match: [/^IND\d{9}$/, 'Tracking number must be in format IND123456789']
    },
    sender: {
        name: {
            type: String,
            required: [true, 'Sender name is required'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Sender email is required'],
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
        },
        phone: {
            type: String,
            required: [true, 'Sender phone is required'],
            match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
        },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { 
                type: String, 
                required: true,
                match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode']
            },
            country: { type: String, default: 'India' }
        }
    },
    recipient: {
        name: {
            type: String,
            required: [true, 'Recipient name is required'],
            trim: true
        },
        email: {
            type: String,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
        },
        phone: {
            type: String,
            required: [true, 'Recipient phone is required'],
            match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
        },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { 
                type: String, 
                required: true,
                match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode']
            },
            country: { type: String, default: 'India' }
        }
    },
    package: {
        description: {
            type: String,
            required: [true, 'Package description is required']
        },
        weight: {
            type: Number,
            required: [true, 'Package weight is required'],
            min: [0.1, 'Weight must be at least 0.1 kg']
        },
        dimensions: {
            length: { type: Number, required: true, min: 1 },
            width: { type: Number, required: true, min: 1 },
            height: { type: Number, required: true, min: 1 }
        },
        value: {
            type: Number,
            required: [true, 'Package value is required'],
            min: [1, 'Package value must be at least ₹1']
        },
        category: {
            type: String,
            enum: ['Documents', 'Electronics', 'Clothing', 'Food', 'Fragile', 'Liquid', 'Other'],
            default: 'Other'
        },
        isFragile: {
            type: Boolean,
            default: false
        },
        requiresSignature: {
            type: Boolean,
            default: false
        }
    },
    service: {
        type: {
            type: String,
            required: true,
            enum: ['hyperlocal', 'same-day', 'next-day', 'standard', 'economy', 'express']
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal'
        },
        cost: {
            type: Number,
            required: [true, 'Service cost is required'],
            min: [0, 'Cost cannot be negative']
        },
        estimatedDelivery: {
            type: Date,
            required: true
        },
        insurance: {
            isInsured: { type: Boolean, default: false },
            coverage: { type: Number, default: 0 },
            premium: { type: Number, default: 0 }
        }
    },
    currentStatus: {
        type: String,
        enum: ['Order Placed', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned', 'Cancelled', 'Exception'],
        default: 'Order Placed'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    tracking: [trackingEventSchema],
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded', 'cod'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['online', 'cod', 'wallet', 'upi'],
        default: 'online'
    },
    deliveryAttempts: {
        type: Number,
        default: 0,
        max: 3
    },
    specialInstructions: String,
    internalNotes: String,
    assignedAgent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    deliveredAt: Date,
    returnedAt: Date,
    cancelledAt: Date,
    cancellationReason: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for delivery window
shipmentSchema.virtual('deliveryWindow').get(function() {
    if (this.service.estimatedDelivery) {
        const start = new Date(this.service.estimatedDelivery);
        start.setHours(9, 0, 0, 0);
        const end = new Date(this.service.estimatedDelivery);
        end.setHours(18, 0, 0, 0);
        return { start, end };
    }
    return null;
});

// Virtual for estimated delivery status
shipmentSchema.virtual('isDelayed').get(function() {
    if (this.currentStatus === 'Delivered') return false;
    return new Date() > this.service.estimatedDelivery;
});

// Virtual for package volume
shipmentSchema.virtual('package.volume').get(function() {
    const { length, width, height } = this.package.dimensions;
    return (length * width * height) / 1000000; // Convert to cubic meters
});

// Indexes for better query performance
shipmentSchema.index({ trackingNumber: 1 });
shipmentSchema.index({ 'sender.email': 1 });
shipmentSchema.index({ 'recipient.email': 1 });
shipmentSchema.index({ currentStatus: 1 });
shipmentSchema.index({ createdAt: -1 });
shipmentSchema.index({ 'service.estimatedDelivery': 1 });
shipmentSchema.index({ createdBy: 1 });

// Pre-save middleware to generate tracking number
shipmentSchema.pre('save', async function(next) {
    if (this.isNew && !this.trackingNumber) {
        try {
            let trackingNumber;
            let exists = true;
            
            while (exists) {
                // Generate random 9-digit number
                const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
                trackingNumber = `IND${randomNum}`;
                
                // Check if it already exists
                const existingShipment = await this.constructor.findOne({ trackingNumber });
                exists = !!existingShipment;
            }
            
            this.trackingNumber = trackingNumber;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Pre-save middleware to update progress based on status
shipmentSchema.pre('save', function(next) {
    const statusProgress = {
        'Order Placed': 10,
        'In Transit': 50,
        'Out for Delivery': 80,
        'Delivered': 100,
        'Returned': 100,
        'Cancelled': 0,
        'Exception': this.progress // Keep current progress for exceptions
    };
    
    if (this.isModified('currentStatus') && statusProgress[this.currentStatus] !== undefined) {
        this.progress = statusProgress[this.currentStatus];
    }
    
    next();
});

// Method to add tracking event
shipmentSchema.methods.addTrackingEvent = function(eventData) {
    this.tracking.push({
        ...eventData,
        timestamp: eventData.timestamp || new Date()
    });
    
    // Update current status if provided
    if (eventData.status) {
        this.currentStatus = eventData.status;
    }
    
    // Set delivery/return/cancellation dates
    if (eventData.status === 'Delivered') {
        this.deliveredAt = eventData.timestamp || new Date();
    } else if (eventData.status === 'Returned') {
        this.returnedAt = eventData.timestamp || new Date();
    } else if (eventData.status === 'Cancelled') {
        this.cancelledAt = eventData.timestamp || new Date();
        this.cancellationReason = eventData.description;
    }
    
    return this.save();
};

// Method to increment delivery attempts
shipmentSchema.methods.incrementDeliveryAttempts = function() {
    this.deliveryAttempts += 1;
    
    if (this.deliveryAttempts >= 3) {
        this.addTrackingEvent({
            status: 'Exception',
            location: 'Delivery Center',
            description: 'Maximum delivery attempts reached. Package being returned to sender.',
        });
    }
    
    return this.save();
};

// Static method to find shipments by user
shipmentSchema.statics.findByUser = function(userId) {
    return this.find({ 
        $or: [
            { createdBy: userId },
            { 'sender.email': userId },
            { 'recipient.email': userId }
        ],
        isActive: true 
    }).sort({ createdAt: -1 });
};

// Static method to find by tracking number
shipmentSchema.statics.findByTrackingNumber = function(trackingNumber) {
    return this.findOne({ 
        trackingNumber: trackingNumber.toUpperCase(),
        isActive: true 
    }).populate('createdBy', 'fullName email phone')
      .populate('assignedAgent', 'fullName email phone');
};

const Shipment = mongoose.model('Shipment', shipmentSchema);

module.exports = Shipment;
