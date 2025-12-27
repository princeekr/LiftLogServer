const { db } = require('../supabase/client');

exports.getWeeklyPlan = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM weekly_plans WHERE user_id = $1 ORDER BY day_of_week`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.updateWeeklyPlan = async (req, res) => {
    const { days } = req.body;
    if (!days || !Array.isArray(days)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        for (const day of days) {
            await client.query(
                `UPDATE weekly_plans SET muscle_group = $1, is_rest_day = $2 WHERE user_id = $3 AND day_of_week = $4`,
                [day.muscleGroup, day.isRestDay ? 1 : 0, req.user.id, day.dayOfWeek]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Weekly plan update error:", err);
        res.status(500).json({ error: 'Failed to update plan' });
    } finally {
        client.release();
    }
};

exports.getWorkoutLogs = async (req, res) => {
    try {
        // 1. Get Logs
        const logsResult = await db.query(
            `SELECT * FROM workout_logs WHERE user_id = $1 ORDER BY date DESC, created_at DESC`,
            [req.user.id]
        );
        const logs = logsResult.rows;

        if (logs.length === 0) return res.json([]);

        const logIds = logs.map(l => l.id);

        // 2. Get Exercises
        const exercisesResult = await db.query(
            `SELECT * FROM exercises WHERE workout_log_id = ANY($1::uuid[]) ORDER BY created_at`,
            [logIds]
        );
        const exercises = exercisesResult.rows;

        if (exercises.length === 0) {
            const result = logs.map(l => ({ ...l, exercises: [] }));
            return res.json(result);
        }

        const exerciseIds = exercises.map(e => e.id);

        // 3. Get Sets
        const setsResult = await db.query(
            `SELECT * FROM exercise_sets WHERE exercise_id = ANY($1::uuid[]) ORDER BY set_number`,
            [exerciseIds]
        );
        const sets = setsResult.rows;

        // Reconstruct hierarchy
        const setsByExercise = {};
        sets.forEach(s => {
            if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
            setsByExercise[s.exercise_id].push(s);
        });

        const exercisesByLog = {};
        exercises.forEach(e => {
            e.sets = setsByExercise[e.id] || [];
            if (!exercisesByLog[e.workout_log_id]) exercisesByLog[e.workout_log_id] = [];
            exercisesByLog[e.workout_log_id].push(e);
        });

        const result = logs.map(l => ({
            ...l,
            exercises: exercisesByLog[l.id] || []
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.createWorkoutLog = async (req, res) => {
    const { date, dayOfWeek, muscleGroup, exercises } = req.body;
    const userId = req.user.id;

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Insert Log
        const logResult = await client.query(
            `INSERT INTO workout_logs (user_id, date, day_of_week, muscle_group) VALUES ($1, $2, $3, $4) RETURNING id`,
            [userId, date, dayOfWeek, muscleGroup]
        );
        const logId = logResult.rows[0].id;

        if (exercises && exercises.length > 0) {
            for (const ex of exercises) {
                const totalSets = ex.sets.length;
                const totalReps = ex.sets.reduce((sum, set) => sum + (Number(set.reps) || 0), 0);
                const totalWeight = ex.sets.reduce((sum, set) => sum + (Number(set.weight) || 0), 0);
                const avgWeight = totalSets > 0 ? totalWeight / totalSets : 0;

                const exResult = await client.query(
                    `INSERT INTO exercises (workout_log_id, user_id, name, weight, sets, reps) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [logId, userId, ex.name, avgWeight, totalSets, totalReps]
                );
                const exId = exResult.rows[0].id;

                for (const s of ex.sets) {
                    await client.query(
                        `INSERT INTO exercise_sets (exercise_id, user_id, set_number, weight, reps) VALUES ($1, $2, $3, $4, $5)`,
                        [exId, userId, s.setNumber, s.weight, s.reps]
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json({ id: logId, message: 'Workout logged successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Log creation error:", err);
        res.status(500).json({ error: 'Failed to create log' });
    } finally {
        client.release();
    }
};

exports.deleteWorkoutLog = async (req, res) => {
    try {
        await db.query(`DELETE FROM workout_logs WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
