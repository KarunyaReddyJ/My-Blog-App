import express from 'express';
import User from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-googleId');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, bio, avatar } = req.body;

    const user = await User.findById(req.user!._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.username = name;
    if (bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;

    await user.save();

    // Return user without sensitive data
    const updatedUser = await User.findById(user._id).select('-googleId');
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;