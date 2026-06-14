import express from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { supabase } from '../config/supabase.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { uploadFile, deleteFile } from '../utils/storage.js';

const router = express.Router();
// Keep files in memory briefly for validation, but limit size at multer layer
// Global maximum per-file: 50 MB
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } }); // 50MB global cap

// ==================== STUDENT ROUTES ====================

// Get materials by subject (student view - read only)
router.get('/subject/:subjectId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('subject_id', req.params.subjectId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single material (for download/view)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*, subjects(name, terms(name))')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Material not found.' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Upload file material (lecture, assignment, etc.)
router.post('/upload', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { subject_id, title, type, order_index } = req.body;
    const file = req.file;

    if (!subject_id || !title || !type) {
      return res.status(400).json({ error: 'Subject ID, title, and type are required.' });
    }

    if (!file) {
      return res.status(400).json({ error: 'File is required for upload.' });
    }

    // Validate logical type
    const allowedTypes = ['lecture', 'assignment', 'file', 'document', 'video', 'audio'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Allowed: ${allowedTypes.join(', ')}` });
    }

    // Per-type size limits (bytes) — enforce the platform maximum 50MB per file
    const MAX_SIZES = {
      video: MAX_FILE_BYTES,
      audio: MAX_FILE_BYTES,
      document: MAX_FILE_BYTES,
      file: MAX_FILE_BYTES,
      lecture: MAX_FILE_BYTES,
      assignment: MAX_FILE_BYTES
    };

    const maxAllowed = MAX_SIZES[type] || MAX_FILE_BYTES;
    if (file.size > maxAllowed) {
      return res.status(400).json({ error: `File too large for type '${type}'. Max allowed ${(maxAllowed/1024/1024).toFixed(0)} MB.` });
    }

    // Basic mime detection using file signature
    const detected = await fileTypeFromBuffer(file.buffer).catch(() => null);
    const detectedMime = detected?.mime || file.mimetype;

    const allowedMimes = {
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      file: ['application/pdf', 'application/zip', 'text/plain'],
      lecture: ['application/pdf', 'application/zip', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      video: ['video/mp4', 'video/webm', 'video/ogg'],
      audio: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'],
      assignment: ['application/pdf', 'application/msword', 'text/plain']
    };

    const allowedForType = allowedMimes[type] || [];
    if (allowedForType.length && !allowedForType.includes(detectedMime)) {
      return res.status(400).json({ error: `Invalid file type. Detected: ${detectedMime}. Allowed for '${type}': ${allowedForType.join(', ')}` });
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadFile(file, 'materials');

    // Save to database
    const { data, error } = await supabase
      .from('materials')
      .insert({
        subject_id,
        title,
        type,
        file_url: uploadResult.fileUrl,
        file_name: uploadResult.fileName,
        file_path: uploadResult.filePath,
        order_index: order_index || 0
      })
      .select()
      .single();

    if (error) {
      // Cleanup uploaded file if DB insert fails
      await deleteFile(uploadResult.filePath).catch(() => {});
      throw error;
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error in /api/materials/upload:', error);
    console.error('Request body:', req.body);
    if (req.file) {
      console.error('Uploaded file info:', { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype });
    } else {
      console.error('No file received in request');
    }
    res.status(500).json({ error: error.message });
  }
});

// Add link material (exam link, external lecture, etc.)
router.post('/link', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { subject_id, title, content, type, order_index } = req.body;

    if (!subject_id || !title || !content || !type) {
      return res.status(400).json({ error: 'Subject ID, title, content, and type are required.' });
    }

    // Validate type
    const allowedTypes = ['link', 'exam', 'quiz', 'external'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Allowed: ${allowedTypes.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('materials')
      .insert({
        subject_id,
        title,
        type,
        content,
        order_index: order_index || 0
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update material (admin only)
router.put('/:id', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, type, content, is_active, order_index } = req.body;
    const file = req.file;

    // Get existing material
    const { data: existing, error: fetchError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    const updateData = { title, type, content, is_active, order_index };

    // If new file uploaded, replace old one
    if (file) {
      const uploadResult = await uploadFile(file, 'materials');
      updateData.file_url = uploadResult.fileUrl;
      updateData.file_name = uploadResult.fileName;
      updateData.file_path = uploadResult.filePath;

      // Delete old file
      if (existing.file_path) {
        await deleteFile(existing.file_path).catch(() => {});
      }
    }

    const { data, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete material (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get material to delete file from storage
    const { data: material, error: fetchError } = await supabase
      .from('materials')
      .select('file_path')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    // Delete file from storage if exists
    if (material?.file_path) {
      await deleteFile(material.file_path).catch(() => {});
    }

    // Delete from database
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Material deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all materials (admin view - includes inactive)
router.get('/admin/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    let query = supabase
      .from('materials')
      .select('*, subjects(name, terms(name))')
      .order('created_at', { ascending: false });

    if (req.query.subject_id) {
      query = query.eq('subject_id', req.query.subject_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
