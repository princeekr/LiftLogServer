const { db } = require('./server/supabase/client');
require('dotenv').config();

async function checkConnection() {
    try {
        console.log("Attempting to connect to the database...");
        const result = await db.query('SELECT NOW() as time');
        console.log("✅ Database connection successful!");
        console.log("Server time:", result.rows[0].time);
        process.exit(0);
    } catch (err) {
        console.error("❌ Database connection failed:");
        console.error(err);
        process.exit(1);
    }
}

checkConnection();
