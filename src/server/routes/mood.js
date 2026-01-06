import express from 'express';
import { submitMood, getDistrictMoods, getMoodStats, getMoodHistory, getMoodReasons } from '../controllers/mood.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, submitMood);
router.get('/history', getMoodHistory);
router.get('/stats', getMoodStats);
router.get('/reasons', getMoodReasons);
router.get('/', getDistrictMoods); // Public read

export default router;
