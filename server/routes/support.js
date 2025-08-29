const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { persistenceManager } = require('../modules/persist_module');
const AuthMiddleware = require('../middleware/auth-middleware');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const ticketSchema = Joi.object({
    subject: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    category: Joi.string().valid('order', 'product', 'account', 'technical', 'billing', 'general').required(),
    priority: Joi.string().valid('low', 'medium', 'high').optional().default('medium')
});

// FAQ data
const FAQ_DATA = [
    {
        id: 'faq-1',
        question: 'How long does shipping take?',
        answer: 'Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days.',
        category: 'shipping',
        helpful: 45,
        tags: ['shipping', 'delivery', 'time']
    },
    {
        id: 'faq-2',
        question: 'What is your return policy?',
        answer: 'We accept returns within 30 days of purchase. Items must be in original condition with receipt.',
        category: 'returns',
        helpful: 38,
        tags: ['returns', 'refund', 'policy']
    },
    {
        id: 'faq-3',
        question: 'How do I clean my espresso machine?',
        answer: 'Run a cleaning cycle with descaling solution monthly. Clean the portafilter and steam wand daily.',
        category: 'maintenance',
        helpful: 52,
        tags: ['cleaning', 'maintenance', 'espresso', 'machine']
    },
    {
        id: 'faq-4',
        question: 'Do you offer international shipping?',
        answer: 'Currently we only ship within the United States. International shipping coming soon!',
        category: 'shipping',
        helpful: 23,
        tags: ['international', 'shipping', 'worldwide']
    },
    {
        id: 'faq-5',
        question: 'How do I earn and use loyalty points?',
        answer: 'Earn 10 points per dollar spent. Redeem points for free items, discounts, and exclusive products.',
        category: 'loyalty',
        helpful: 67,
        tags: ['loyalty', 'points', 'rewards', 'earn']
    },
    {
        id: 'faq-6',
        question: 'What grind size should I use?',
        answer: 'Espresso: fine, Pour over: medium-coarse, French press: coarse, Drip coffee: medium.',
        category: 'brewing',
        helpful: 89,
        tags: ['grind', 'brewing', 'coffee', 'size']
    },
    {
        id: 'faq-7',
        question: 'How do I track my order?',
        answer: 'You can track your order in the "My Orders" section of your account or use the tracking link in your email.',
        category: 'orders',
        helpful: 41,
        tags: ['tracking', 'orders', 'status', 'delivery']
    },
    {
        id: 'faq-8',
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards, PayPal, and Apple Pay for secure checkout.',
        category: 'payment',
        helpful: 29,
        tags: ['payment', 'credit card', 'paypal', 'checkout']
    }
];

// Create support ticket
router.post('/tickets', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { error, value } = ticketSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: error.details[0].message
            });
        }

        const { subject, description, category, priority } = value;
        const userId = req.user.id;
        const username = req.user.username;

        const tickets = await persistenceManager.readData('support');
        
        const newTicket = {
            id: uuidv4(),
            ticketNumber: `TICKET-${Date.now()}`,
            userId,
            username,
            subject,
            description,
            category,
            priority,
            status: 'open',
            messages: [
                {
                    id: uuidv4(),
                    sender: 'user',
                    senderName: username,
                    message: description,
                    timestamp: new Date().toISOString()
                }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        tickets.push(newTicket);
        await persistenceManager.writeData('support', tickets);

        res.status(201).json({
            success: true,
            data: newTicket,
            message: 'Support ticket created successfully'
        });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({
            success: false,
            error: 'CREATE_TICKET_ERROR',
            message: 'Failed to create support ticket'
        });
    }
});

// Get user tickets
router.get('/tickets/:userId', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if user can access these tickets
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'You can only access your own tickets'
            });
        }

        const tickets = await persistenceManager.readData('support');
        const userTickets = tickets.filter(ticket => ticket.userId === userId);

        // Sort by most recent first
        userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            data: userTickets
        });
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({
            success: false,
            error: 'FETCH_TICKETS_ERROR',
            message: 'Failed to fetch tickets'
        });
    }
});

// Update ticket status (admin only or add message)
router.put('/tickets/:ticketId', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, message, priority } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        const tickets = await persistenceManager.readData('support');
        const ticketIndex = tickets.findIndex(ticket => ticket.id === ticketId);

        if (ticketIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'TICKET_NOT_FOUND',
                message: 'Support ticket not found'
            });
        }

        const ticket = tickets[ticketIndex];

        // Check permissions - user can only add messages to their own tickets
        if (!isAdmin && ticket.userId !== userId && !message) {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'Insufficient permissions to update ticket'
            });
        }

        // Add message if provided
        if (message && message.trim()) {
            const newMessage = {
                id: uuidv4(),
                sender: isAdmin ? 'support' : 'user',
                senderName: req.user.username,
                message: message.trim(),
                timestamp: new Date().toISOString()
            };
            ticket.messages.push(newMessage);
        }

        // Update status if provided (admin only)
        if (status && isAdmin) {
            const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
            if (validStatuses.includes(status)) {
                ticket.status = status;
            }
        }

        // Update priority if provided (admin only)
        if (priority && isAdmin) {
            const validPriorities = ['low', 'medium', 'high'];
            if (validPriorities.includes(priority)) {
                ticket.priority = priority;
            }
        }

        ticket.updatedAt = new Date().toISOString();
        tickets[ticketIndex] = ticket;
        await persistenceManager.writeData('support', tickets);

        res.json({
            success: true,
            data: ticket,
            message: 'Ticket updated successfully'
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({
            success: false,
            error: 'UPDATE_TICKET_ERROR',
            message: 'Failed to update ticket'
        });
    }
});

// Get FAQ entries
router.get('/faq', async (req, res) => {
    try {
        const { search, category } = req.query;
        let faqData = [...FAQ_DATA];

        // Filter by category if provided
        if (category) {
            faqData = faqData.filter(faq => faq.category === category);
        }

        // Search functionality
        if (search && search.trim()) {
            const searchTerm = search.trim().toLowerCase();
            faqData = faqData.filter(faq => 
                faq.question.toLowerCase().includes(searchTerm) ||
                faq.answer.toLowerCase().includes(searchTerm) ||
                faq.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }

        // Sort by helpful count (most helpful first)
        faqData.sort((a, b) => b.helpful - a.helpful);

        res.json({
            success: true,
            data: faqData,
            totalResults: faqData.length
        });
    } catch (error) {
        console.error('Error fetching FAQ:', error);
        res.status(500).json({
            success: false,
            error: 'FETCH_FAQ_ERROR',
            message: 'Failed to fetch FAQ entries'
        });
    }
});

// Get all tickets (admin only)
router.get('/admin/tickets', AuthMiddleware.requireAuth, AuthMiddleware.requireAdmin, async (req, res) => {
    try {
        const { status, priority, category } = req.query;
        let tickets = await persistenceManager.readData('support');

        // Apply filters
        if (status) {
            tickets = tickets.filter(ticket => ticket.status === status);
        }
        if (priority) {
            tickets = tickets.filter(ticket => ticket.priority === priority);
        }
        if (category) {
            tickets = tickets.filter(ticket => ticket.category === category);
        }

        // Sort by most recent first
        tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            data: tickets,
            totalTickets: tickets.length
        });
    } catch (error) {
        console.error('Error fetching admin tickets:', error);
        res.status(500).json({
            success: false,
            error: 'FETCH_ADMIN_TICKETS_ERROR',
            message: 'Failed to fetch tickets'
        });
    }
});

// Get support statistics (admin only)
router.get('/admin/stats', AuthMiddleware.requireAuth, AuthMiddleware.requireAdmin, async (req, res) => {
    try {
        const tickets = await persistenceManager.readData('support');
        
        const stats = {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'open').length,
            inProgress: tickets.filter(t => t.status === 'in_progress').length,
            resolved: tickets.filter(t => t.status === 'resolved').length,
            closed: tickets.filter(t => t.status === 'closed').length,
            byCategory: {},
            byPriority: {},
            avgResponseTime: 0, // Would need to calculate based on message timestamps
            recentTickets: tickets
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
        };

        // Calculate category distribution
        tickets.forEach(ticket => {
            stats.byCategory[ticket.category] = (stats.byCategory[ticket.category] || 0) + 1;
        });

        // Calculate priority distribution
        tickets.forEach(ticket => {
            stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching support statistics:', error);
        res.status(500).json({
            success: false,
            error: 'FETCH_SUPPORT_STATS_ERROR',
            message: 'Failed to fetch support statistics'
        });
    }
});

module.exports = router;