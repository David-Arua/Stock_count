// Input validation middleware

function validateUserRegistration(req, res, next) {
    const { type, name, email, password } = req.body;
    const errors = [];

    if (!type || !['farmer', 'vendor', 'logistics'].includes(type)) {
        errors.push('Valid user type required (farmer, vendor, or logistics)');
    }
    if (!name || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Valid email required');
    }
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', errors });
    }
    next();
}

function validateProduct(req, res, next) {
    const { farmerId, name, category, quantity, unit, price } = req.body;
    const errors = [];

    if (!farmerId || farmerId.trim().length === 0) {
        errors.push('Farmer ID required');
    }
    if (!name || name.trim().length < 2) {
        errors.push('Product name must be at least 2 characters');
    }
    if (!category || category.trim().length === 0) {
        errors.push('Category required');
    }
    if (quantity === undefined || quantity === null || isNaN(quantity) || Number(quantity) <= 0) {
        errors.push('Valid quantity required (must be greater than 0)');
    }
    if (!unit || unit.trim().length === 0) {
        errors.push('Unit required');
    }
    if (price === undefined || price === null || isNaN(price) || Number(price) <= 0) {
        errors.push('Valid price required (must be greater than 0)');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', errors });
    }
    next();
}

function validateRequest(req, res, next) {
    const { productId, farmerId, vendorId, quantity } = req.body;
    const errors = [];

    if (!productId || productId.trim().length === 0) {
        errors.push('Product ID required');
    }
    if (!farmerId || farmerId.trim().length === 0) {
        errors.push('Farmer ID required');
    }
    if (!vendorId || vendorId.trim().length === 0) {
        errors.push('Vendor ID required');
    }
    if (quantity === undefined || quantity === null || isNaN(quantity) || Number(quantity) <= 0) {
        errors.push('Valid quantity required (must be greater than 0)');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', errors });
    }
    next();
}

function validateMessage(req, res, next) {
    const { senderId, recipientId, text } = req.body;
    const errors = [];

    if (!senderId || senderId.trim().length === 0) {
        errors.push('Sender ID required');
    }
    if (!recipientId || recipientId.trim().length === 0) {
        errors.push('Recipient ID required');
    }
    if (!text || text.trim().length === 0) {
        errors.push('Message text required');
    }
    if (text && text.length > 5000) {
        errors.push('Message text too long (max 5000 characters)');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', errors });
    }
    next();
}

module.exports = {
    validateUserRegistration,
    validateProduct,
    validateRequest,
    validateMessage
};
