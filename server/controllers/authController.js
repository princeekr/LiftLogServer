const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, initWeeklyPlan } = require('../supabase/client');
const { JWT_SECRET } = require('../middleware/auth');

exports.signup = async (req, res) => {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Using RETURNING to get the ID.
        const result = await db.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, created_at`,
            [email, hashedPassword]
        );
        const user = result.rows[0];
        const userId = user.id;

        // Create Profile
        await db.query(
            `INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)`,
            [userId, displayName || email.split('@')[0]]
        );

        // Initialize Weekly Plan
        initWeeklyPlan(userId, (err) => {
            if (err) console.error("Weekly plan init warning:", err);
        });

        // Generate Token
        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            user: { id: userId, email, created_at: user.created_at },
            session: { access_token: token, user: { id: userId, email, created_at: user.created_at } }
        });

    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'User already exists' });
        }
        console.error("Signup error:", error);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            user: { id: user.id, email: user.email, created_at: user.created_at },
            session: { access_token: token, user: { id: user.id, email: user.email, created_at: user.created_at } }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const result = await db.query(`SELECT display_name FROM profiles WHERE user_id = $1`, [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.updateProfile = async (req, res) => {
    const { display_name } = req.body;
    try {
        await db.query(
            `UPDATE profiles SET display_name = $1, updated_at = NOW() WHERE user_id = $2`,
            [display_name, req.user.id]
        );
        res.json({ success: true, message: 'Profile updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.updatePassword = async (req, res) => {
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [hashedPassword, req.user.id]
        );
        res.json({ success: true, message: 'Password updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
