const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize app
const app = express();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for simplicity. For prod, set this Vercel URL.
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Explicitly handle OPTIONS for preflight
app.options(/.*/, cors());

// Routes
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

// Mount routes
// Support both /api/... and root-mounted for flexibility
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/data', dataRoutes);
app.use('/data', dataRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'LiftLog API is running' });
});

// Health Check
app.get('/api/health', async (req, res) => {
    const { db } = require('./supabase/client');
    try {
        const result = await db.query('SELECT NOW()');
        res.json({
            status: 'ok',
            database: 'connected',
            time: result.rows[0].now
        });
    } catch (err) {
        console.error("Health check error:", err);
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// Catch-all 404 handler
app.use(/.*/, (req, res) => {
    res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// Start server ONLY if run directly (not imported as module)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export app for usage in Vercel entry point
module.exports = app;
