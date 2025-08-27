const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { persistenceManager } = require('../modules/persist_module');
const AuthMiddleware = require('../middleware/auth-middleware');
const ErrorHandler = require('../modules/error-handler');

// POST /api/auth/register - User registration
router.post('/register', ErrorHandler.asyncWrapper(async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({
            success: false,
            error: 'Missing fields',
            message: 'All fields are required: username, email, password, confirmPassword'
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            error: 'Password mismatch',
            message: 'Password and confirm password do not match'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            error: 'Weak password',
            message: 'Password must be at least 6 characters long'
        });
    }

    // Check if user already exists
    const users = await persistenceManager.getUsers();
    const existingUser = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() || 
        u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
        return res.status(409).json({
            success: false,
            error: 'User exists',
            message: 'Username or email already exists'
        });
    }

    // Hash password and create user
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
        id: uuidv4(),
        username,
        email,
        password: hashedPassword,
        role: 'user',
        preferences: {
            theme: 'light',
            language: 'en'
        },
        createdAt: new Date().toISOString(),
        lastLogin: null
    };

    await persistenceManager.addUser(newUser);
    
    // Log activity
    await persistenceManager.logActivity(username, 'register');

    // Return user without password
    const { password: _, ...userResponse } = newUser;

    res.status(201).json({
        success: true,
        data: userResponse,
        message: 'User registered successfully'
    });
}));

// POST /api/auth/login - User login
router.post('/login', ErrorHandler.asyncWrapper(async (req, res) => {
    const { username, password, rememberMe } = req.body;

    // Validation
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Missing credentials',
            message: 'Username and password are required'
        });
    }

    // Find user
    const users = await persistenceManager.getUsers();
    const user = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() || 
        u.email.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials',
            message: 'Invalid username or password'
        });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials',
            message: 'Invalid username or password'
        });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    await persistenceManager.saveUsers(users);

    // Create session
    const { token, expiresAt } = await AuthMiddleware.createSession(user.id, rememberMe);

    // Set cookie
    res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: rememberMe ? 12 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000, // 12 days or 30 minutes
        sameSite: 'lax',
        path: '/'
    });

    // Log activity
    await persistenceManager.logActivity(user.username, 'login');

    // Return user without password
    const { password: _, ...userResponse } = user;

    res.json({
        success: true,
        data: userResponse,
        message: 'Login successful',
        sessionExpiresAt: expiresAt
    });
}));

// POST /api/auth/logout - User logout
router.post('/logout', AuthMiddleware.requireAuth, ErrorHandler.asyncWrapper(async (req, res) => {
    const token = req.cookies.authToken;
    
    // Destroy session
    await AuthMiddleware.destroySession(token);
    
    // Clear cookie
    res.clearCookie('authToken');
    
    // Log activity
    await persistenceManager.logActivity(req.user.username, 'logout');

    res.json({
        success: true,
        message: 'Logout successful'
    });
}));

// GET /api/auth/profile - Get current user profile
router.get('/profile', AuthMiddleware.requireAuth, (req, res) => {
    res.json({
        success: true,
        data: req.user,
        message: 'Profile retrieved successfully'
    });
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', AuthMiddleware.requireAuth, ErrorHandler.asyncWrapper(async (req, res) => {
    const { email, preferences } = req.body;
    const userId = req.user.id;

    const users = await persistenceManager.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'User not found',
            message: 'User profile not found'
        });
    }

    // Update user data
    if (email) users[userIndex].email = email;
    if (preferences) users[userIndex].preferences = { ...users[userIndex].preferences, ...preferences };
    
    users[userIndex].updatedAt = new Date().toISOString();

    await persistenceManager.saveUsers(users);

    // Return updated user without password
    const { password: _, ...updatedUser } = users[userIndex];

    res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
    });
}));

module.exports = router;