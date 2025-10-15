// MongoDB initialization script for Docker
// This script runs when the MongoDB container starts for the first time

// Switch to the logistics-tracker database
db = db.getSiblingDB('logistics-tracker');

// Create collections and initial indexes
db.createCollection('users');
db.createCollection('shipments');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });

db.shipments.createIndex({ "trackingNumber": 1 }, { unique: true });
db.shipments.createIndex({ "sender.email": 1 });
db.shipments.createIndex({ "recipient.email": 1 });
db.shipments.createIndex({ "currentStatus": 1 });
db.shipments.createIndex({ "createdAt": -1 });
db.shipments.createIndex({ "service.estimatedDelivery": 1 });
db.shipments.createIndex({ "createdBy": 1 });

// Create a sample admin user (optional)
db.users.insertOne({
    fullName: "Admin User",
    email: "admin@trackship.in",
    phone: "9999999999",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGhBfnDgF3SjUXW", // Password: admin123
    role: "admin",
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    preferences: {
        notifications: {
            email: true,
            sms: true,
            push: true
        },
        language: "en",
        theme: "light"
    },
    createdAt: new Date(),
    updatedAt: new Date()
});

// Create sample shipment data for testing
const sampleShipments = [
    {
        trackingNumber: "IND123456789",
        sender: {
            name: "Mumbai Warehouse",
            email: "mumbai@trackship.in",
            phone: "9876543210",
            address: {
                street: "123 Warehouse Street",
                city: "Mumbai",
                state: "Maharashtra",
                pincode: "400001",
                country: "India"
            }
        },
        recipient: {
            name: "Rajesh Kumar",
            email: "rajesh@example.com",
            phone: "9876543211",
            address: {
                street: "456 Delivery Lane",
                city: "Pune",
                state: "Maharashtra",
                pincode: "411001",
                country: "India"
            }
        },
        package: {
            description: "Electronics - Mobile Phone",
            weight: 0.5,
            dimensions: {
                length: 20,
                width: 10,
                height: 5
            },
            value: 25000,
            category: "Electronics",
            isFragile: true,
            requiresSignature: true
        },
        service: {
            type: "next-day",
            priority: "high",
            cost: 150,
            estimatedDelivery: new Date(Date.now() + 86400000), // Tomorrow
            insurance: {
                isInsured: true,
                coverage: 25000,
                premium: 100
            }
        },
        currentStatus: "In Transit",
        progress: 50,
        tracking: [
            {
                status: "Order Placed",
                location: "Mumbai Warehouse",
                description: "Package received and processed",
                timestamp: new Date(Date.now() - 86400000), // Yesterday
            },
            {
                status: "In Transit",
                location: "Pune Distribution Center",
                description: "Package en route to destination",
                timestamp: new Date(Date.now() - 43200000), // 12 hours ago
            }
        ],
        paymentStatus: "paid",
        paymentMethod: "online",
        isActive: true,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date()
    },
    {
        trackingNumber: "IND987654321",
        sender: {
            name: "Delhi Hub",
            email: "delhi@trackship.in",
            phone: "9876543212",
            address: {
                street: "789 Hub Avenue",
                city: "Delhi",
                state: "Delhi",
                pincode: "110001",
                country: "India"
            }
        },
        recipient: {
            name: "Priya Sharma",
            email: "priya@example.com",
            phone: "9876543213",
            address: {
                street: "321 Home Street",
                city: "Gurgaon",
                state: "Haryana",
                pincode: "122001",
                country: "India"
            }
        },
        package: {
            description: "Documents - Legal Papers",
            weight: 0.2,
            dimensions: {
                length: 30,
                width: 21,
                height: 2
            },
            value: 1000,
            category: "Documents",
            isFragile: false,
            requiresSignature: true
        },
        service: {
            type: "same-day",
            priority: "urgent",
            cost: 200,
            estimatedDelivery: new Date(),
            insurance: {
                isInsured: false,
                coverage: 0,
                premium: 0
            }
        },
        currentStatus: "Out for Delivery",
        progress: 80,
        tracking: [
            {
                status: "Order Placed",
                location: "Delhi Hub",
                description: "Package received and processed",
                timestamp: new Date(Date.now() - 21600000), // 6 hours ago
            },
            {
                status: "In Transit",
                location: "Gurgaon Distribution Center",
                description: "Package arrived at local facility",
                timestamp: new Date(Date.now() - 10800000), // 3 hours ago
            },
            {
                status: "Out for Delivery",
                location: "Gurgaon Local Office",
                description: "Package out for delivery",
                timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            }
        ],
        paymentStatus: "cod",
        paymentMethod: "cod",
        isActive: true,
        createdAt: new Date(Date.now() - 21600000),
        updatedAt: new Date()
    }
];

// Insert sample shipments
db.shipments.insertMany(sampleShipments);

console.log('Database initialized with sample data');
console.log('Admin user created: admin@trackship.in / admin123');
console.log('Sample tracking numbers: IND123456789, IND987654321');
