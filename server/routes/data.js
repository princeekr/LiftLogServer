const express = require('express');
const dataController = require('../controllers/dataController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to ensure all routes here are protected
router.use(authenticateToken);

// --- Weekly Plans ---
router.get('/weekly-plan', dataController.getWeeklyPlan);
router.put('/weekly-plan', dataController.updateWeeklyPlan);

// --- Workout Logs ---
router.get('/workout-logs', dataController.getWorkoutLogs);
router.post('/workout-logs', dataController.createWorkoutLog);
router.delete('/workout-logs/:id', dataController.deleteWorkoutLog);

module.exports = router;
