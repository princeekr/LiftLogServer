const { Pool } = require('pg');
require('dotenv').config();

// Use connection pooling for serverless environments (Vercel)
// to prevent exhausting database connections.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 1, // Limit pool size for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Helper to initialize weekly plan for new users (moved from legacy db.js)
// This keeps business logic identical as requested.
function initWeeklyPlan(userId, callback) {
    const defaultPlan = [
        { day_of_week: 0, day_name: 'Sunday', muscle_group: 'Rest', is_rest_day: 1 },
        { day_of_week: 1, day_name: 'Monday', muscle_group: 'Chest & Triceps', is_rest_day: 0 },
        { day_of_week: 2, day_name: 'Tuesday', muscle_group: 'Back & Biceps', is_rest_day: 0 },
        { day_of_week: 3, day_name: 'Wednesday', muscle_group: 'Rest', is_rest_day: 1 },
        { day_of_week: 4, day_name: 'Thursday', muscle_group: 'Shoulders', is_rest_day: 0 },
        { day_of_week: 5, day_name: 'Friday', muscle_group: 'Legs', is_rest_day: 0 },
        { day_of_week: 6, day_name: 'Saturday', muscle_group: 'Abs & Cardio', is_rest_day: 0 },
    ];

    (async () => {
        try {
            for (const day of defaultPlan) {
                await pool.query(
                    `INSERT INTO weekly_plans (user_id, day_of_week, day_name, muscle_group, is_rest_day) 
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, day_of_week) DO NOTHING`,
                    [userId, day.day_of_week, day.day_name, day.muscle_group, day.is_rest_day]
                );
            }
            if (callback) callback();
        } catch (err) {
            console.error("Error initializing weekly plan:", err);
            if (callback) callback(err);
        }
    })();
}

module.exports = { db: pool, initWeeklyPlan };
