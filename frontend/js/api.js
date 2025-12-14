// Farmer-Vendor Marketplace API (backend-backed)
(function () {
    const API_BASE = 'http://localhost:5000/api';
    const CURRENT_USER_KEY = 'fvm_current_user';

    const readCurrentUser = () => {
        try {
            const raw = localStorage.getItem(CURRENT_USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    };

    const writeCurrentUser = (user) => {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    };

    const request = async (path, options = {}) => {
        const user = readCurrentUser();
        const headers = { 
            'Content-Type': 'application/json', 
            ...(options.headers || {})
        };
        
        // Add authorization token if user is logged in
        if (user && user.token) {
            headers['Authorization'] = `Bearer ${user.token}`;
        }
        
        const res = await fetch(`${API_BASE}${path}`, {
            headers,
            ...options
        });
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await res.json() : null;
        if (!res.ok) {
            const message = data?.error || res.statusText || 'Request failed';
            throw new Error(message);
        }
        return data;
    };

    const api = {
        // Auth
        async login(email, password) {
            const user = await request('/users/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            writeCurrentUser(user);
            return user;
        },
        async register(data) {
            const user = await request('/users/register', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            writeCurrentUser(user);
            return user;
        },
        getCurrentUser() {
            return readCurrentUser();
        },
        logout() {
            localStorage.removeItem(CURRENT_USER_KEY);
        },
        async getUser(id) {
            return request(`/users/${id}`);
        },

        // Products
        async getProducts(filters = {}) {
            const params = new URLSearchParams();
            if (filters.farmerId) params.append('farmerId', filters.farmerId);
            if (filters.search) params.append('search', filters.search);
            const qs = params.toString();
            return request(`/products${qs ? `?${qs}` : ''}`);
        },
        async getProduct(id) {
            return request(`/products/${id}`);
        },
        async addProduct(data) {
            return request('/products', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },
        async addProductWithFile(formData) {
            const user = readCurrentUser();
            const headers = {};
            if (user && user.token) {
                headers['Authorization'] = `Bearer ${user.token}`;
            }
            const res = await fetch(`${API_BASE}/products/upload`, {
                method: 'POST',
                headers,
                body: formData // Don't set Content-Type, let browser set it with boundary
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Upload failed');
            }
            return data;
        },
        async updateProduct(id, data) {
            return request(`/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },
        async deleteProduct(id) {
            await request(`/products/${id}`, { method: 'DELETE' });
        },

        // Purchase Requests
        async getRequests(filters = {}) {
            const params = new URLSearchParams();
            if (filters.farmerId) params.append('farmerId', filters.farmerId);
            if (filters.vendorId) params.append('vendorId', filters.vendorId);
            const qs = params.toString();
            return request(`/requests${qs ? `?${qs}` : ''}`);
        },
        async addRequest(data) {
            return request('/requests', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },
        async updateRequestStatus(id, status) {
            return request(`/requests/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        },

        // Messages
        async getMessages(userId1, userId2) {
            const qs = `?userId1=${encodeURIComponent(userId1)}&userId2=${encodeURIComponent(userId2)}`;
            return request(`/messages${qs}`);
        },
        async getConversations(userId) {
            return request(`/messages/conversations/${userId}`);
        },
        async sendMessage(data) {
            return request('/messages', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
    };

    window.AppAPI = api;
})();
