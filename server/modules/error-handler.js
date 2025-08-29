class CoffeeShopError extends Error {
    constructor(message, statusCode = 500, errorType = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'CoffeeShopError';
        this.statusCode = statusCode;
        this.errorType = errorType;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

const asyncWrapper = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const handleError = (error, req, res, next) => {
    let statusCode = 500;
    let errorType = 'INTERNAL_ERROR';
    let message = 'Internal server error';

    if (error instanceof CoffeeShopError) {
        statusCode = error.statusCode;
        errorType = error.errorType;
        message = error.message;
    } else if (error.name === 'ValidationError') {
        statusCode = 400;
        errorType = 'VALIDATION_ERROR';
        message = error.message;
    } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        errorType = 'UNAUTHORIZED';
        message = 'Authentication required';
    } else if (error.code === 'ENOENT') {
        statusCode = 404;
        errorType = 'FILE_NOT_FOUND';
        message = 'Requested resource not found';
    } else if (error.code === 'EACCES') {
        statusCode = 403;
        errorType = 'ACCESS_DENIED';
        message = 'Access denied';
    }

    console.error(`[${new Date().toISOString()}] ERROR:`, {
        statusCode,
        errorType,
        message: error.message,
        stack: error.stack,
        url: req?.url,
        method: req?.method,
        ip: req?.ip
    });

    res.status(statusCode).json({
        success: false,
        error: errorType,
        message,
        statusCode,
        timestamp: new Date().toISOString()
    });
};

const handleNotFound = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Route ${req.originalUrl} not found`,
        statusCode: 404,
        timestamp: new Date().toISOString()
    });
};

const createError = (message, statusCode = 500, errorType = 'INTERNAL_ERROR') => {
    return new CoffeeShopError(message, statusCode, errorType);
};

module.exports = {
    CoffeeShopError,
    asyncWrapper,
    handleError,
    handleNotFound,
    createError
};