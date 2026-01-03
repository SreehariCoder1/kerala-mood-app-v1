import express from 'express';
import { submitMood, getDistrictMoods } from '../controllers/mood.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, submitMood);
router.get('/', getDistrictMoods); // Public read

export default router;
