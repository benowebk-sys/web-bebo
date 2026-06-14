import { supabase } from '../config/supabase.js';
import path from 'path';

export const uploadFile = async (file, folder = 'materials') => {
  try {
    const timestamp = Date.now();
    // Build a safe filename: timestamp + random token + original extension
    const ext = path.extname(file.originalname) || '';
    const safeName = `${timestamp}-${Math.random().toString(36).slice(2,8)}${ext}`;
    const filePath = `${folder}/${safeName}`;

    const { data, error: uploadError } = await supabase.storage
      .from('beno-files')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw new Error(uploadError.message || JSON.stringify(uploadError));
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from('beno-files')
      .getPublicUrl(filePath);

    if (urlError) {
      console.error('Supabase getPublicUrl error:', urlError);
      throw new Error(urlError.message || JSON.stringify(urlError));
    }

    return {
      fileUrl: urlData?.publicUrl || urlData?.publicURL || '',
      filePath: filePath,
      fileName: file.originalname
    };
  } catch (err) {
    console.error('uploadFile failed:', err);
    throw err;
  }
};

export const deleteFile = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('beno-files')
      .remove([filePath]);

    if (error) {
      console.error('Supabase remove error:', error);
      throw new Error(error.message || JSON.stringify(error));
    }

    return true;
  } catch (err) {
    console.error('deleteFile failed:', err);
    throw err;
  }
};
