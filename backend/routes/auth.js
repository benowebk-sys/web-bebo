import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Student login (fixed number - auto-create if not exists)
router.post('/login', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.trim().length < 3) {
      return res.status(400).json({ error: 'Phone number is required (minimum 3 characters).' });
    }

    const cleanPhone = phone.trim();

    // Check if user exists
    let { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', cleanPhone)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ error: fetchError.message });
    }

    // Create new student if not exists
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ 
          phone: cleanPhone, 
          name: `Student ${cleanPhone}`, 
          role: 'student' 
        })
        .select()
        .single();

      if (createError) return res.status(500).json({ error: createError.message });
      user = newUser;
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        phone: user.phone, 
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true,
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        phone: user.phone,
        role: user.role 
      } 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Admin login (email + password)
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Verify admin credentials from env
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    // Generate JWT for admin
    const token = jwt.sign(
      { 
        email: adminEmail, 
        role: 'admin',
        name: 'Administrator' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true,
      token, 
      user: { 
        email: adminEmail, 
        role: 'admin',
        name: 'Administrator'
      } 
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, error: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({ 
      valid: true, 
      user: {
        id: decoded.id,
        email: decoded.email,
        phone: decoded.phone,
        role: decoded.role,
        name: decoded.name
      }
    });

  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token.' });
  }
});

export default router;
