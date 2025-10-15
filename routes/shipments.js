const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Shipment = require('../models/Shipment');
const { authenticateToken, optionalAuth, requireAgent } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/shipments/track/:trackingNumber
// @desc    Track a shipment by tracking number (public endpoint)
// @access  Public
router.get('/track/:trackingNumber', [
    param('trackingNumber')
        .matches(/^IND\d{9}$/)
        .withMessage('Invalid tracking number format. Use format: IND123456789')
], optionalAuth, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Invalid tracking number format',
                details: errors.array()
            });
        }

        const { trackingNumber } = req.params;
        
        const shipment = await Shipment.findByTrackingNumber(trackingNumber);
        
        if (!shipment) {
            return res.status(404).json({
                error: 'Shipment not found',
                message: `No shipment found with tracking number ${trackingNumber}`
            });
        }

        // Return different levels of detail based on authentication
        if (req.user) {
            // Authenticated user gets full details
            return res.json({
                trackingNumber: shipment.trackingNumber,
                currentStatus: shipment.currentStatus,
                progress: shipment.progress,
                sender: shipment.sender,
                recipient: shipment.recipient,
                package: shipment.package,
                service: shipment.service,
                tracking: shipment.tracking,
                estimatedDelivery: shipment.service.estimatedDelivery,
                isDelayed: shipment.isDelayed,
                deliveryWindow: shipment.deliveryWindow,
                deliveryAttempts: shipment.deliveryAttempts,
                createdAt: shipment.createdAt,
                updatedAt: shipment.updatedAt
            });
        } else {
            // Public access gets limited information
            return res.json({
                trackingNumber: shipment.trackingNumber,
                currentStatus: shipment.currentStatus,
                progress: shipment.progress,
                tracking: shipment.tracking.map(event => ({
                    status: event.status,
                    location: event.location,
                    description: event.description,
                    timestamp: event.timestamp
                })),
                estimatedDelivery: shipment.service.estimatedDelivery,
                isDelayed: shipment.isDelayed,
                serviceType: shipment.service.type
            });
        }

    } catch (error) {
        console.error('Track shipment error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve shipment information'
        });
    }
});

// @route   POST /api/shipments
// @desc    Create a new shipment
// @access  Private
router.post('/', authenticateToken, [
    body('sender.name').notEmpty().withMessage('Sender name is required'),
    body('sender.email').isEmail().withMessage('Valid sender email is required'),
    body('sender.phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit sender phone is required'),
    body('sender.address.street').notEmpty().withMessage('Sender street address is required'),
    body('sender.address.city').notEmpty().withMessage('Sender city is required'),
    body('sender.address.state').notEmpty().withMessage('Sender state is required'),
    body('sender.address.pincode').matches(/^[0-9]{6}$/).withMessage('Valid 6-digit sender pincode is required'),
    
    body('recipient.name').notEmpty().withMessage('Recipient name is required'),
    body('recipient.phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit recipient phone is required'),
    body('recipient.address.street').notEmpty().withMessage('Recipient street address is required'),
    body('recipient.address.city').notEmpty().withMessage('Recipient city is required'),
    body('recipient.address.state').notEmpty().withMessage('Recipient state is required'),
    body('recipient.address.pincode').matches(/^[0-9]{6}$/).withMessage('Valid 6-digit recipient pincode is required'),
    
    body('package.description').notEmpty().withMessage('Package description is required'),
    body('package.weight').isFloat({ min: 0.1 }).withMessage('Package weight must be at least 0.1 kg'),
    body('package.value').isFloat({ min: 1 }).withMessage('Package value must be at least ₹1'),
    body('package.dimensions.length').isFloat({ min: 1 }).withMessage('Package length must be at least 1 cm'),
    body('package.dimensions.width').isFloat({ min: 1 }).withMessage('Package width must be at least 1 cm'),
    body('package.dimensions.height').isFloat({ min: 1 }).withMessage('Package height must be at least 1 cm'),
    
    body('service.type').isIn(['hyperlocal', 'same-day', 'next-day', 'standard', 'economy', 'express']).withMessage('Invalid service type'),
    body('service.cost').isFloat({ min: 0 }).withMessage('Service cost cannot be negative')
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

        // Calculate estimated delivery based on service type
        const serviceDeliveryDays = {
            'hyperlocal': 0.25, // 6 hours
            'same-day': 1,
            'next-day': 2,
            'standard': 4,
            'economy': 7,
            'express': 1
        };

        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + serviceDeliveryDays[req.body.service.type]);

        // Create shipment
        const shipmentData = {
            ...req.body,
            service: {
                ...req.body.service,
                estimatedDelivery
            },
            createdBy: req.user._id
        };

        const shipment = new Shipment(shipmentData);

        // Add initial tracking event
        shipment.tracking.push({
            status: 'Order Placed',
            location: `${req.body.sender.address.city}, ${req.body.sender.address.state}`,
            description: 'Shipment order has been placed and is being processed',
            timestamp: new Date()
        });

        await shipment.save();

        res.status(201).json({
            message: 'Shipment created successfully',
            shipment: {
                trackingNumber: shipment.trackingNumber,
                currentStatus: shipment.currentStatus,
                estimatedDelivery: shipment.service.estimatedDelivery,
                service: shipment.service,
                createdAt: shipment.createdAt
            }
        });

    } catch (error) {
        console.error('Create shipment error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to create shipment'
        });
    }
});

// @route   GET /api/shipments/my
// @desc    Get user's shipments
// @access  Private
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;

        let query = {
            $or: [
                { createdBy: req.user._id },
                { 'sender.email': req.user.email },
                { 'recipient.email': req.user.email }
            ],
            isActive: true
        };

        if (status) {
            query.currentStatus = status;
        }

        const shipments = await Shipment.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy', 'fullName email')
            .populate('assignedAgent', 'fullName email phone');

        const total = await Shipment.countDocuments(query);

        res.json({
            shipments,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total,
                limit
            }
        });

    } catch (error) {
        console.error('Get user shipments error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve shipments'
        });
    }
});

// @route   PUT /api/shipments/:id/tracking
// @desc    Add tracking event to shipment (Agent/Admin only)
// @access  Private (Agent/Admin)
router.put('/:id/tracking', authenticateToken, requireAgent, [
    param('id').isMongoId().withMessage('Invalid shipment ID'),
    body('status').isIn(['Order Placed', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned', 'Cancelled', 'Exception']).withMessage('Invalid status'),
    body('location').notEmpty().withMessage('Location is required'),
    body('description').notEmpty().withMessage('Description is required')
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

        const { id } = req.params;
        const { status, location, description, coordinates } = req.body;

        const shipment = await Shipment.findById(id);
        
        if (!shipment) {
            return res.status(404).json({
                error: 'Shipment not found',
                message: 'No shipment found with the provided ID'
            });
        }

        // Add tracking event
        const trackingData = {
            status,
            location,
            description,
            timestamp: new Date(),
            agent: {
                name: req.user.fullName,
                id: req.user._id.toString(),
                contact: req.user.email
            }
        };

        if (coordinates) {
            trackingData.coordinates = coordinates;
        }

        await shipment.addTrackingEvent(trackingData);

        res.json({
            message: 'Tracking event added successfully',
            shipment: {
                trackingNumber: shipment.trackingNumber,
                currentStatus: shipment.currentStatus,
                progress: shipment.progress,
                latestEvent: trackingData
            }
        });

    } catch (error) {
        console.error('Add tracking event error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to add tracking event'
        });
    }
});

// @route   GET /api/shipments/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Agent/Admin)
router.get('/dashboard/stats', authenticateToken, requireAgent, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get various statistics
        const [
            totalShipments,
            todayShipments,
            activeShipments,
            deliveredShipments,
            delayedShipments,
            statusBreakdown
        ] = await Promise.all([
            Shipment.countDocuments({ isActive: true }),
            Shipment.countDocuments({ 
                createdAt: { $gte: today, $lt: tomorrow },
                isActive: true 
            }),
            Shipment.countDocuments({ 
                currentStatus: { $in: ['Order Placed', 'In Transit', 'Out for Delivery'] },
                isActive: true 
            }),
            Shipment.countDocuments({ 
                currentStatus: 'Delivered',
                isActive: true 
            }),
            Shipment.countDocuments({
                currentStatus: { $nin: ['Delivered', 'Cancelled', 'Returned'] },
                'service.estimatedDelivery': { $lt: new Date() },
                isActive: true
            }),
            Shipment.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
            ])
        ]);

        res.json({
            statistics: {
                totalShipments,
                todayShipments,
                activeShipments,
                deliveredShipments,
                delayedShipments,
                statusBreakdown: statusBreakdown.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve dashboard statistics'
        });
    }
});

// Sample data endpoint for development/testing
router.get('/sample-data', async (req, res) => {
    try {
        const sampleTrackingData = {
            'IND123456789': {
                trackingNumber: 'IND123456789',
                currentStatus: 'In Transit',
                progress: 50,
                tracking: [
                    {
                        status: 'Order Placed',
                        location: 'Mumbai Warehouse',
                        description: 'Package received and processed',
                        timestamp: new Date('2024-01-15T10:00:00Z')
                    },
                    {
                        status: 'In Transit',
                        location: 'Pune Distribution Center',
                        description: 'Package en route to next facility',
                        timestamp: new Date('2024-01-15T14:30:00Z')
                    }
                ],
                estimatedDelivery: new Date(Date.now() + 86400000), // Tomorrow
                isDelayed: false
            },
            'IND987654321': {
                trackingNumber: 'IND987654321',
                currentStatus: 'Out for Delivery',
                progress: 75,
                tracking: [
                    {
                        status: 'Order Placed',
                        location: 'Delhi Warehouse',
                        description: 'Package received and processed',
                        timestamp: new Date('2024-01-15T10:00:00Z')
                    },
                    {
                        status: 'In Transit',
                        location: 'Noida Distribution Center',
                        description: 'Package en route to next facility',
                        timestamp: new Date('2024-01-15T14:30:00Z')
                    },
                    {
                        status: 'Out for Delivery',
                        location: 'Local Facility',
                        description: 'Package out for delivery',
                        timestamp: new Date('2024-01-16T11:00:00Z')
                    }
                ],
                estimatedDelivery: new Date(),
                isDelayed: false
            }
        };

        const requestedTracking = req.query.trackingNumber;
        
        if (requestedTracking && sampleTrackingData[requestedTracking]) {
            res.json(sampleTrackingData[requestedTracking]);
        } else {
            res.json({
                message: 'Sample tracking data for development',
                availableTrackingNumbers: Object.keys(sampleTrackingData),
                data: sampleTrackingData
            });
        }

    } catch (error) {
        console.error('Sample data error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve sample data'
        });
    }
});

module.exports = router;
