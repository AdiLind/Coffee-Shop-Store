const rateLimit = require('express-rate-limit');

// General API rate limiting - Very generous for development/testing
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (very generous)
    message: {
        success: false,
        error: 'Too many requests',
        message: 'Too many API requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Auth rate limiting - Very generous for development/testing
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // limit each IP to 50 auth requests per windowMs (very generous)
    message: {
        success: false,
        error: 'Too many authentication attempts',
        message: 'Too many login/registration attempts, please try again in a few minutes.'
    }
});

module.exports = {
    apiLimiter,
    authLimiter
};