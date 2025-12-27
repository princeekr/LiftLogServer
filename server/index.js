const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.options(/.*/, cors());

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'LiftLog API is running' });
});

app.get('/api/health', async (req, res) => {
    try {
        const { db } = require('./supabase/client');
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

module.exports = app;
