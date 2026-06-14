import express from 'express';
import { supabase } from '../config/supabase.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ==================== TERMS ====================

// Get all terms with subjects (for students and admin)
router.get('/terms', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('terms')
      .select('*, subjects(*)')
      .order('order_index', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single term with subjects
router.get('/terms/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('terms')
      .select('*, subjects(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Term not found.' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create term (admin only)
router.post('/terms', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, year, order_index } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Term name is required.' });
    }

    const { data, error } = await supabase
      .from('terms')
      .insert({ name, year, order_index: order_index || 0 })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update term (admin only)
router.put('/terms/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, year, order_index } = req.body;

    const { data, error } = await supabase
      .from('terms')
      .update({ name, year, order_index })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Term not found.' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete term (admin only) - cascades to subjects and materials
router.delete('/terms/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('terms')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Term deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SUBJECTS ====================

// Get all subjects (optionally filtered by term)
router.get('/subjects', verifyToken, async (req, res) => {
  try {
    let query = supabase
      .from('subjects')
      .select('*, terms(name, year)')
      .order('order_index', { ascending: true });

    if (req.query.term_id) {
      query = query.eq('term_id', req.query.term_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single subject with materials count
router.get('/subjects/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, terms(name, year), materials(count)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Subject not found.' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create subject (admin only)
router.post('/subjects', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { term_id, name, description, order_index } = req.body;

    if (!term_id || !name) {
      return res.status(400).json({ error: 'Term ID and subject name are required.' });
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({ term_id, name, description, order_index: order_index || 0 })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update subject (admin only)
router.put('/subjects/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { term_id, name, description, order_index } = req.body;

    const { data, error } = await supabase
      .from('subjects')
      .update({ term_id, name, description, order_index })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Subject not found.' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete subject (admin only)
router.delete('/subjects/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Subject deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
