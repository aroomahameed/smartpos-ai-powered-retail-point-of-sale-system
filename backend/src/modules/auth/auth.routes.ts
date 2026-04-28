import { Router } from 'express';
import { register, login, getMe } from './auth.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

// @route   POST /api/auth/register
router.post('/register', register);

// @route   POST /api/auth/login
router.post('/login', login);

// @route   GET /api/auth/me
router.get('/me', protect, getMe);

export default router;
