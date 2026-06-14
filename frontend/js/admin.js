const API_URL = '/api'; // Use relative path for production and deployment
// For production: 'https://your-api.vercel.app/api'
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'index.html';
}

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.role !== 'admin') {
    window.location.href = 'index.html';
}

let currentSection = 'stats';

function showSection(section) {
    currentSection = section;
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    const content = document.getElementById('admin-content');

    switch(section) {
        case 'stats': loadStats(content); break;
        case 'terms': loadTermsManager(content); break;
        case 'subjects': loadSubjectsManager(content); break;
        case 'materials': loadMaterialsManager(content); break;
        case 'users': loadUsersManager(content); break;
    }
}

// ========== STATS ==========
async function loadStats(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';

    try {
        const res = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();

        container.innerHTML = `
            <h3 class="section-title">إحصائيات المنصة</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>الطلاب</h4>
                    <div class="number">${result.stats?.users || 0}</div>
                </div>
                <div class="stat-card">
                    <h4>الترمات</h4>
                    <div class="number">${result.stats?.terms || 0}</div>
                </div>
                <div class="stat-card">
                    <h4>المواد</h4>
                    <div class="number">${result.stats?.subjects || 0}</div>
                </div>
                <div class="stat-card">
                    <h4>المحتوى</h4>
                    <div class="number">${result.stats?.materials || 0}</div>
                </div>
            </div>

            <h4 class="section-subtitle">آخر المحتوى المضاف</h4>
            <div class="materials-list">
                ${result.recentMaterials?.map(m => `
                    <div class="material-item">
                        <div class="material-info">
                            <strong>${escapeHtml(m.title)}</strong>
                            <span class="type-badge ${m.type}">${translateType(m.type)}</span>
                            <span class="text-muted small">${escapeHtml(m.subjects?.name || '')}</span>
                        </div>
                    </div>
                `).join('') || '<p class="text-muted">لا يوجد محتوى</p>'}
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<p class="text-danger">خطأ في تحميل الإحصائيات</p>';
    }
}

// ========== TERMS MANAGER ==========
async function loadTermsManager(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';

    const res = await fetch(`${API_URL}/curriculum/terms`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();

    container.innerHTML = `
        <h3 class="section-title">إدارة الترمات</h3>

        <div class="form-section">
            <h4>إضافة ترم جديد</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>اسم الترم</label>
                    <input type="text" id="term-name" placeholder="مثال: الترم الأول">
                </div>
                <div class="form-group">
                    <label>السنة الدراسية</label>
                    <input type="text" id="term-year" placeholder="مثال: 2025-2026">
                </div>
            </div>
            <div class="form-group">
                <label>الترتيب</label>
                <input type="number" id="term-order" placeholder="0" value="0">
            </div>
            <button onclick="addTerm()" class="btn-success">إضافة ترم</button>
        </div>

        <div class="form-section">
            <h4>الترمات الموجودة</h4>
            <table class="data-table">
                <thead>
                    <tr><th>الاسم</th><th>السنة</th><th>الترتيب</th><th>المواد</th><th>إجراءات</th></tr>
                </thead>
                <tbody>
                    ${result.data?.map(t => `
                        <tr>
                            <td><strong>${escapeHtml(t.name)}</strong></td>
                            <td>${escapeHtml(t.year || '-')}</td>
                            <td>${t.order_index}</td>
                            <td>${t.subjects?.length || 0}</td>
                            <td class="table-actions">
                                <button onclick="deleteTerm('${t.id}')" class="btn-icon btn-danger">حذف</button>
                            </td>
                        </tr>
                    `).join('') || '<tr><td colspan="5" class="empty-cell">لا يوجد ترمات</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

async function addTerm() {
    const name = document.getElementById('term-name').value.trim();
    const year = document.getElementById('term-year').value.trim();
    const order = parseInt(document.getElementById('term-order').value) || 0;

    if (!name) return alert('أدخل اسم الترم');

    try {
        const res = await fetch(`${API_URL}/curriculum/terms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, year, order_index: order })
        });

        if (res.ok) {
            showSection('terms');
        } else {
            const err = await res.json();
            alert(err.error || 'خطأ في الإضافة');
        }
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

async function deleteTerm(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الترم؟ سيتم حذف جميع المواد والمحتوى!')) return;

    try {
        const res = await fetch(`${API_URL}/curriculum/terms/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) showSection('terms');
        else alert('خطأ في الحذف');
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

// ========== SUBJECTS MANAGER ==========
async function loadSubjectsManager(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';

    const [termsRes, subjectsRes] = await Promise.all([
        fetch(`${API_URL}/curriculum/terms`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/curriculum/subjects`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const terms = await termsRes.json();
    const subjects = await subjectsRes.json();

    const termOptions = terms.data?.map(t => 
        `<option value="${t.id}">${escapeHtml(t.name)} (${escapeHtml(t.year || '')})</option>`
    ).join('') || '';

    container.innerHTML = `
        <h3 class="section-title">إدارة المواد</h3>

        <div class="form-section">
            <h4>إضافة مادة جديدة</h4>
            <div class="form-group">
                <label>الترم</label>
                <select id="subject-term">${termOptions}</select>
            </div>
            <div class="form-group">
                <label>اسم المادة</label>
                <input type="text" id="subject-name" placeholder="اسم المادة">
            </div>
            <div class="form-group">
                <label>وصف (اختياري)</label>
                <textarea id="subject-desc" placeholder="وصف المادة"></textarea>
            </div>
            <div class="form-group">
                <label>الترتيب</label>
                <input type="number" id="subject-order" value="0">
            </div>
            <button onclick="addSubject()" class="btn-success">إضافة مادة</button>
        </div>

        <div class="form-section">
            <h4>المواد الموجودة</h4>
            <table class="data-table">
                <thead>
                    <tr><th>الاسم</th><th>الترم</th><th>الترتيب</th><th>إجراءات</th></tr>
                </thead>
                <tbody>
                    ${subjects.data?.map(s => `
                        <tr>
                            <td><strong>${escapeHtml(s.name)}</strong></td>
                            <td>${escapeHtml(s.terms?.name || '-')}</td>
                            <td>${s.order_index}</td>
                            <td class="table-actions">
                                <button onclick="deleteSubject('${s.id}')" class="btn-icon btn-danger">حذف</button>
                            </td>
                        </tr>
                    `).join('') || '<tr><td colspan="4" class="empty-cell">لا يوجد مواد</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

async function addSubject() {
    const term_id = document.getElementById('subject-term').value;
    const name = document.getElementById('subject-name').value.trim();
    const description = document.getElementById('subject-desc').value.trim();
    const order_index = parseInt(document.getElementById('subject-order').value) || 0;

    if (!term_id || !name) return alert('أدخل الترم واسم المادة');

    try {
        const res = await fetch(`${API_URL}/curriculum/subjects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ term_id, name, description, order_index })
        });

        if (res.ok) showSection('subjects');
        else {
            const err = await res.json();
            alert(err.error || 'خطأ في الإضافة');
        }
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

async function deleteSubject(id) {
    if (!confirm('هل أنت متأكد من حذف هذه المادة؟ سيتم حذف جميع المحتوى!')) return;

    try {
        const res = await fetch(`${API_URL}/curriculum/subjects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) showSection('subjects');
        else alert('خطأ في الحذف');
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

// ========== MATERIALS MANAGER ==========
async function loadMaterialsManager(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';

    const [subjectsRes, materialsRes] = await Promise.all([
        fetch(`${API_URL}/curriculum/subjects`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/materials/admin/all`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const subjects = await subjectsRes.json();
    const materials = await materialsRes.json();

    const subjectOptions = subjects.data?.map(s => 
        `<option value="${s.id}">${escapeHtml(s.name)}</option>`
    ).join('') || '';

    container.innerHTML = `
        <h3 class="section-title">إدارة المحتوى</h3>

        <div class="form-section">
            <h4>رفع ملف (محاضرة، تكليف، ملف)</h4>
            <div class="form-group">
                <label>المادة</label>
                <select id="file-subject">${subjectOptions}</select>
            </div>
            <div class="form-group">
                <label>العنوان</label>
                <input type="text" id="file-title" placeholder="عنوان المحتوى">
            </div>
            <div class="form-group">
                <label>النوع</label>
                <select id="file-type">
                    <option value="lecture">محاضرة</option>
                    <option value="assignment">تكليف</option>
                    <option value="file">ملف عام</option>
                    <option value="document">مستند</option>
                    <option value="video">فيديو</option>
                    <option value="audio">صوت</option>
                </select>
            </div>
            <div class="form-group">
                <label>الملف</label>
                <input type="file" id="file-input" class="file-input">
            </div>
            <button onclick="uploadFile()" class="btn-success">رفع الملف</button>
        </div>

        <div class="form-section">
            <h4>إضافة رابط (اختبار، محاضرة خارجية)</h4>
            <div class="form-group">
                <label>المادة</label>
                <select id="link-subject">${subjectOptions}</select>
            </div>
            <div class="form-group">
                <label>العنوان</label>
                <input type="text" id="link-title" placeholder="عنوان الرابط">
            </div>
            <div class="form-group">
                <label>النوع</label>
                <select id="link-type">
                    <option value="link">رابط عام</option>
                    <option value="exam">اختبار</option>
                    <option value="quiz">اختبار قصير</option>
                    <option value="external">مصدر خارجي</option>
                </select>
            </div>
            <div class="form-group">
                <label>الرابط</label>
                <input type="url" id="link-url" placeholder="https://...">
            </div>
            <button onclick="addLink()" class="btn-success">إضافة رابط</button>
        </div>

        <div class="form-section">
            <h4>جميع المحتوى</h4>
            <table class="data-table">
                <thead>
                    <tr><th>العنوان</th><th>المادة</th><th>النوع</th><th>التاريخ</th><th>إجراءات</th></tr>
                </thead>
                <tbody>
                    ${materials.data?.map(m => `
                        <tr>
                            <td><strong>${escapeHtml(m.title)}</strong></td>
                            <td>${escapeHtml(m.subjects?.name || '-')}</td>
                            <td><span class="type-badge ${m.type}">${translateType(m.type)}</span></td>
                            <td>${new Date(m.created_at).toLocaleDateString('ar-EG')}</td>
                            <td class="table-actions">
                                <button onclick="deleteMaterial('${m.id}')" class="btn-icon btn-danger">حذف</button>
                            </td>
                        </tr>
                    `).join('') || '<tr><td colspan="5" class="empty-cell">لا يوجد محتوى</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

async function uploadFile() {
    const subject_id = document.getElementById('file-subject').value;
    const title = document.getElementById('file-title').value.trim();
    const type = document.getElementById('file-type').value;
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!subject_id || !title || !file) return alert('أكمل جميع الحقول واختر ملف');

    const formData = new FormData();
    formData.append('subject_id', subject_id);
    formData.append('title', title);
    formData.append('type', type);
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/materials/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            alert('تم رفع الملف بنجاح');
            showSection('materials');
        } else {
            const err = await res.json();
            alert(err.error || 'خطأ في الرفع');
        }
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

async function addLink() {
    const subject_id = document.getElementById('link-subject').value;
    const title = document.getElementById('link-title').value.trim();
    const type = document.getElementById('link-type').value;
    const content = document.getElementById('link-url').value.trim();

    if (!subject_id || !title || !content) return alert('أكمل جميع الحقول');

    try {
        const res = await fetch(`${API_URL}/materials/link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subject_id, title, type, content })
        });

        if (res.ok) {
            alert('تم إضافة الرابط بنجاح');
            showSection('materials');
        } else {
            const err = await res.json();
            alert(err.error || 'خطأ في الإضافة');
        }
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

async function deleteMaterial(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المحتوى؟')) return;

    try {
        const res = await fetch(`${API_URL}/materials/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) showSection('materials');
        else alert('خطأ في الحذف');
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

// ========== USERS MANAGER ==========
async function loadUsersManager(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';

    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();

        container.innerHTML = `
            <h3 class="section-title">الطلاب المسجلين</h3>

            <div class="form-section">
                <h4>قائمة الطلاب</h4>
                <table class="data-table">
                    <thead>
                        <tr><th>الرقم</th><th>الاسم</th><th>تاريخ التسجيل</th><th>إجراءات</th></tr>
                    </thead>
                    <tbody>
                        ${result.data?.map(u => `
                            <tr>
                                <td><strong>${escapeHtml(u.phone)}</strong></td>
                                <td>${escapeHtml(u.name)}</td>
                                <td>${new Date(u.created_at).toLocaleDateString('ar-EG')}</td>
                                <td class="table-actions">
                                    <button onclick="deleteUser('${u.id}')" class="btn-icon btn-danger">حذف</button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" class="empty-cell">لا يوجد طلاب مسجلين</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<p class="text-danger">خطأ في تحميل البيانات</p>';
    }
}

async function deleteUser(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;

    try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) showSection('users');
        else alert('خطأ في الحذف');
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function translateType(type) {
    const types = {
        lecture: 'محاضرة',
        assignment: 'تكليف',
        link: 'رابط',
        exam: 'اختبار',
        quiz: 'اختبار قصير',
        file: 'ملف',
        document: 'مستند',
        video: 'فيديو',
        audio: 'صوت',
        external: 'خارجي'
    };
    return types[type] || type;
}

// Initialize
showSection('stats');
