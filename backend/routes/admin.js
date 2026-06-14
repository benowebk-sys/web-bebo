import express from 'express';
import { supabase } from '../config/supabase.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard stats
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get counts
    const [usersCount, termsCount, subjectsCount, materialsCount] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('terms').select('*', { count: 'exact', head: true }),
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
      supabase.from('materials').select('*', { count: 'exact', head: true })
    ]);

    // Get recent materials
    const { data: recentMaterials } = await supabase
      .from('materials')
      .select('*, subjects(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      stats: {
        users: usersCount.count || 0,
        terms: termsCount.count || 0,
        subjects: subjectsCount.count || 0,
        materials: materialsCount.count || 0
      },
      recentMaterials: recentMaterials || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (students)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, phone, name, role, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id)
      .eq('role', 'student'); // Prevent deleting admin

    if (error) throw error;
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
