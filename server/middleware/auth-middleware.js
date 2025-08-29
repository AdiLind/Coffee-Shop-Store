const { persistenceManager } = require('../modules/persist_module');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class AuthMiddleware {
    // Verify if user is authenticated
    static async requireAuth(req, res, next) {
        try {
            const token = req.cookies.authToken;
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Authentication required. Please login.',
                    redirectTo: '/pages/login.html'
                });
            }

            // Verify token and get user
            const user = await AuthMiddleware.verifyToken(token);
            if (!user) {
                res.clearCookie('authToken');
                return res.status(401).json({
                    success: false,
                    error: 'Invalid session',
                    message: 'Session expired. Please login again.',
                    redirectTo: '/pages/login.html'
                });
            }

            // Add user to request
            req.user = user;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'Authentication error',
                message: 'Unable to verify authentication'
            });
        }
    }

    // Verify if user is admin
    static async requireAdmin(req, res, next) {
        try {
            await AuthMiddleware.requireAuth(req, res, () => {
                if (req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        error: 'Forbidden',
                        message: 'Admin access required'
                    });
                }
                next();
            });
        } catch (error) {
            next(error);
        }
    }

    // Optional auth - user can be logged in or not
    static async optionalAuth(req, res, next) {
        try {
            const token = req.cookies.authToken;
            if (token) {
                const user = await AuthMiddleware.verifyToken(token);
                req.user = user; // Will be null if token is invalid
            }
            next();
        } catch (error) {
            // Continue without auth if there's an error
            req.user = null;
            next();
        }
    }

    // Verify token and return user
    static async verifyToken(token) {
        try {
            const sessions = await persistenceManager.readData('sessions.json');
            const session = sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
            
            if (!session) {
                return null;
            }

            // Get user details
            const users = await persistenceManager.getUsers();
            const user = users.find(u => u.id === session.userId);
            
            if (!user) {
                return null;
            }

            // Return user without password
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            console.error('Token verification error:', error);
            return null;
        }
    }

    // Create session token
    static async createSession(userId, rememberMe = false) {
        try {
            const token = uuidv4();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + (rememberMe ? 12 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000)); // 12 days or 30 minutes
            
            const session = {
                id: uuidv4(),
                token,
                userId,
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                rememberMe
            };

            const sessions = await persistenceManager.readData('sessions.json');
            
            // Remove old sessions for this user
            const filteredSessions = sessions.filter(s => s.userId !== userId);
            filteredSessions.push(session);
            
            await persistenceManager.writeData('sessions.json', filteredSessions);
            
            return { token, expiresAt };
        } catch (error) {
            console.error('Session creation error:', error);
            throw error;
        }
    }

    // Destroy session
    static async destroySession(token) {
        try {
            const sessions = await persistenceManager.readData('sessions.json');
            const filteredSessions = sessions.filter(s => s.token !== token);
            await persistenceManager.writeData('sessions.json', filteredSessions);
            return true;
        } catch (error) {
            console.error('Session destruction error:', error);
            return false;
        }
    }

    // Clean up expired sessions
    static async cleanupSessions() {
        try {
            const sessions = await persistenceManager.readData('sessions.json');
            const activeSessions = sessions.filter(s => new Date(s.expiresAt) > new Date());
            await persistenceManager.writeData('sessions.json', activeSessions);
            console.log(`🧹 Cleaned up ${sessions.length - activeSessions.length} expired sessions`);
        } catch (error) {
            console.error('Session cleanup error:', error);
        }
    }
}

module.exports = AuthMiddleware;