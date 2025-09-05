/**
 * Reusable Validation Middleware
 * Provides common validation patterns to eliminate code duplication across routes
 */

/**
 * Validate required fields in request body
 * @param {Array} requiredFields - Array of field names that are required
 * @param {Object} options - Options for customization
 * @param {string} options.errorCode - Custom error code (default: 'MISSING_REQUIRED_FIELDS')
 * @param {string} options.customMessage - Custom error message
 * @returns {Function} Express middleware function
 */
function validateRequiredFields(requiredFields, options = {}) {
    return (req, res, next) => {
        if (!Array.isArray(requiredFields) || requiredFields.length === 0) {
            throw new Error('validateRequiredFields: requiredFields must be a non-empty array');
        }

        const missingFields = [];
        const presentFields = {};

        // Check each required field
        for (const field of requiredFields) {
            const value = req.body[field];
            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                missingFields.push(field);
            } else {
                presentFields[field] = value;
            }
        }

        // If there are missing fields, return validation error
        if (missingFields.length > 0) {
            const errorCode = options.errorCode || 'MISSING_REQUIRED_FIELDS';
            const defaultMessage = `Missing required fields: ${missingFields.join(', ')}`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage,
                missingFields,
                receivedFields: Object.keys(presentFields)
            });
        }

        // Store validated fields for use in route handler
        req.validatedFields = presentFields;
        next();
    };
}

/**
 * Validate that specific fields match (e.g., password confirmation)
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {Object} options - Options for customization
 * @returns {Function} Express middleware function
 */
function validateFieldsMatch(field1, field2, options = {}) {
    return (req, res, next) => {
        const value1 = req.body[field1];
        const value2 = req.body[field2];

        if (value1 !== value2) {
            const errorCode = options.errorCode || 'FIELDS_MISMATCH';
            const defaultMessage = `${field1} and ${field2} do not match`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage
            });
        }

        next();
    };
}

/**
 * Validate nested object fields (e.g., customerInfo.name, customerInfo.email)
 * @param {string} parentField - Parent object field name
 * @param {Array} requiredSubFields - Array of required sub-field names
 * @param {Object} options - Options for customization
 * @returns {Function} Express middleware function
 */
function validateNestedFields(parentField, requiredSubFields, options = {}) {
    return (req, res, next) => {
        const parentObject = req.body[parentField];

        if (!parentObject || typeof parentObject !== 'object') {
            const errorCode = options.errorCode || 'MISSING_PARENT_OBJECT';
            const defaultMessage = `${parentField} is required and must be an object`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage
            });
        }

        const missingSubFields = [];
        for (const subField of requiredSubFields) {
            const value = parentObject[subField];
            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                missingSubFields.push(`${parentField}.${subField}`);
            }
        }

        if (missingSubFields.length > 0) {
            const errorCode = options.errorCode || 'MISSING_NESTED_FIELDS';
            const defaultMessage = `Missing required nested fields: ${missingSubFields.join(', ')}`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage,
                missingFields: missingSubFields
            });
        }

        next();
    };
}

/**
 * Validate array fields (e.g., order items)
 * @param {string} fieldName - Name of the array field
 * @param {Object} options - Options for customization
 * @param {number} options.minLength - Minimum array length (default: 1)
 * @param {number} options.maxLength - Maximum array length
 * @returns {Function} Express middleware function
 */
function validateArrayField(fieldName, options = {}) {
    return (req, res, next) => {
        const arrayField = req.body[fieldName];
        const minLength = options.minLength || 1;
        const maxLength = options.maxLength;

        if (!Array.isArray(arrayField)) {
            const errorCode = options.errorCode || 'INVALID_ARRAY_FIELD';
            const defaultMessage = `${fieldName} must be an array`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage
            });
        }

        if (arrayField.length < minLength) {
            const errorCode = options.errorCode || 'ARRAY_TOO_SHORT';
            const defaultMessage = `${fieldName} must contain at least ${minLength} item(s)`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage,
                actualLength: arrayField.length,
                minLength
            });
        }

        if (maxLength && arrayField.length > maxLength) {
            const errorCode = options.errorCode || 'ARRAY_TOO_LONG';
            const defaultMessage = `${fieldName} must contain at most ${maxLength} item(s)`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage,
                actualLength: arrayField.length,
                maxLength
            });
        }

        next();
    };
}

/**
 * Validate numeric fields with range checking
 * @param {string} fieldName - Name of the numeric field
 * @param {Object} options - Options for customization
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {boolean} options.integer - Must be an integer
 * @returns {Function} Express middleware function
 */
function validateNumericField(fieldName, options = {}) {
    return (req, res, next) => {
        const value = req.body[fieldName];
        
        if (value === undefined || value === null) {
            // Field is not present - let other middleware handle required field validation
            return next();
        }

        const numericValue = Number(value);
        
        if (isNaN(numericValue)) {
            const errorCode = options.errorCode || 'INVALID_NUMERIC_VALUE';
            const defaultMessage = `${fieldName} must be a valid number`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage,
                receivedValue: value
            });
        }

        if (options.integer && !Number.isInteger(numericValue)) {
            const errorCode = options.errorCode || 'MUST_BE_INTEGER';
            const defaultMessage = `${fieldName} must be an integer`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage,
                receivedValue: value
            });
        }

        if (options.min !== undefined && numericValue < options.min) {
            const errorCode = options.errorCode || 'VALUE_TOO_LOW';
            const defaultMessage = `${fieldName} must be at least ${options.min}`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage,
                receivedValue: numericValue,
                minValue: options.min
            });
        }

        if (options.max !== undefined && numericValue > options.max) {
            const errorCode = options.errorCode || 'VALUE_TOO_HIGH';
            const defaultMessage = `${fieldName} must be at most ${options.max}`;
            const customMessage = options.customMessage || defaultMessage;

            return res.status(400).json({
                success: false,
                error: errorCode,
                message: customMessage,
                receivedValue: numericValue,
                maxValue: options.max
            });
        }

        // Store the parsed numeric value
        req.body[fieldName] = numericValue;
        next();
    };
}

module.exports = {
    validateRequiredFields,
    validateFieldsMatch,
    validateNestedFields,
    validateArrayField,
    validateNumericField
};