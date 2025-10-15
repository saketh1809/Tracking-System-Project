// TrackShip India API Client
class TrackShipAPI {
    constructor() {
        this.baseURL = window.location.origin + '/api';
        this.token = localStorage.getItem('trackship_token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('trackship_token', token);
        } else {
            localStorage.removeItem('trackship_token');
        }
    }

    // Get authentication headers
    getHeaders(isMultipart = false) {
        const headers = {};
        
        if (!isMultipart) {
            headers['Content-Type'] = 'application/json';
        }
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(options.isMultipart),
            ...options
        };

        // Convert data to JSON if not multipart
        if (config.body && !options.isMultipart) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.setToken(null);
        }
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: profileData
        });
    }

    async changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        });
    }

    // Shipment methods
    async trackShipment(trackingNumber) {
        return this.request(`/shipments/track/${trackingNumber}`);
    }

    async createShipment(shipmentData) {
        return this.request('/shipments', {
            method: 'POST',
            body: shipmentData
        });
    }

    async getMyShipments(page = 1, limit = 10, status = null) {
        let query = `?page=${page}&limit=${limit}`;
        if (status) {
            query += `&status=${status}`;
        }
        return this.request(`/shipments/my${query}`);
    }

    async addTrackingEvent(shipmentId, eventData) {
        return this.request(`/shipments/${shipmentId}/tracking`, {
            method: 'PUT',
            body: eventData
        });
    }

    async getDashboardStats() {
        return this.request('/shipments/dashboard/stats');
    }

    async getSampleData(trackingNumber = null) {
        let query = trackingNumber ? `?trackingNumber=${trackingNumber}` : '';
        return this.request(`/shipments/sample-data${query}`);
    }

    // Utility methods
    isAuthenticated() {
        return !!this.token;
    }

    async healthCheck() {
        return this.request('/health');
    }
}

// Initialize API client
const api = new TrackShipAPI();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackShipAPI;
}
