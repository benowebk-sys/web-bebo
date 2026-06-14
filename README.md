# Beno Group - Educational Platform

منصة تعليمية بسيطة ومرنة لإدارة المنهج الدراسي والمحتوى التعليمي.

## Features

- تسجيل دخول الطالب برقم ثابت (بدون تسجيل)
- تسجيل دخول الأدمن ببريد إلكتروني وكلمة مرور
- إدارة الترمات الدراسية
- إدارة المواد الدراسية
- رفع ملفات (محاضرات، تكليفات، مستندات، فيديو، صوت)
- إضافة روابط (اختبارات، محاضرات خارجية)
- الطالب يشاهد ويحمل فقط (لا يضيف أو يعدل)
- لوحة تحكم للأدمن مع إحصائيات

## Tech Stack

- **Backend**: Node.js 20 + Express
- **Database**: Supabase (PostgreSQL + Storage)
- **Frontend**: HTML + CSS + Vanilla JS
- **Deployment**: Vercel

## Setup

### 1. Supabase Setup

1. أنشئ مشروع على [Supabase](https://supabase.com)
2. شغل الـ SQL Migration في SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Terms table
CREATE TABLE terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  year TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects table
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materials table
CREATE TABLE materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lecture', 'assignment', 'link', 'exam', 'quiz', 'file', 'document', 'video', 'audio', 'external')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_path TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON materials FOR ALL USING (true) WITH CHECK (true);
```

3. أنشئ Storage Bucket:
   - اذهب إلى Storage → New bucket
   - اسم: `beno-files`
   - اجعله Public
   - في Policies:
     - `SELECT`: `bucket_id = 'beno-files'`
     - `INSERT`: `bucket_id = 'beno-files'`

### 2. Environment Variables

انسخ `.env.example` إلى `.env` واملأ القيم:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-random-secret-min-32-chars
ADMIN_EMAIL=admin@benogroup.com
ADMIN_PASSWORD=your-secure-password
PORT=3000
FRONTEND_URL=https://your-frontend.vercel.app
```

### 3. Update Frontend API URL

في جميع ملفات `frontend/js/*.js`، غير:
```javascript
const API_URL = 'https://your-api.vercel.app/api';
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 5. Add Environment Variables in Vercel Dashboard

1. اذهب إلى Project Settings → Environment Variables
2. أضف كل المتغيرات من `.env`

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Student login |
| POST | `/api/auth/admin-login` | Public | Admin login |
| GET | `/api/auth/verify` | Token | Verify token |
| GET | `/api/curriculum/terms` | Token | List terms |
| POST | `/api/curriculum/terms` | Admin | Create term |
| DELETE | `/api/curriculum/terms/:id` | Admin | Delete term |
| GET | `/api/curriculum/subjects` | Token | List subjects |
| POST | `/api/curriculum/subjects` | Admin | Create subject |
| GET | `/api/materials/subject/:id` | Token | View materials |
| POST | `/api/materials/upload` | Admin | Upload file |
| POST | `/api/materials/link` | Admin | Add link |
| DELETE | `/api/materials/:id` | Admin | Delete material |
| GET | `/api/admin/stats` | Admin | Dashboard stats |
| GET | `/api/admin/users` | Admin | List students |

## License

MIT
