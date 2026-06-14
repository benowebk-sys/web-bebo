const API_URL = 'http://localhost:3200/api'; // Local development
// For production: 'https://your-api.vercel.app/api'
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'index.html';
}

const user = JSON.parse(localStorage.getItem('user') || '{}');
document.getElementById('user-name').textContent = user.name || 'طالب';

async function loadTerms() {
    try {
        const res = await fetch(`${API_URL}/curriculum/terms`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await res.json();

        document.getElementById('loading').style.display = 'none';
        const container = document.getElementById('terms-container');
        container.classList.remove('hidden');
        container.style.display = 'grid';

        if (!result.data?.length) {
            container.innerHTML = '<div class="empty-state"><p>لا يوجد محتوى دراسي حالياً</p></div>';
            return;
        }

        container.innerHTML = result.data.map(term => `
            <div class="term-card">
                <h3>${escapeHtml(term.name)}</h3>
                <div class="term-year">${escapeHtml(term.year || '')}</div>
                <ul class="subject-list">
                    ${term.subjects?.map(sub => `
                        <li onclick="showMaterials('${sub.id}', '${escapeHtml(sub.name)}')">
                            ${escapeHtml(sub.name)}
                        </li>
                    `).join('') || '<li class="inactive-item">لا يوجد مواد</li>'}
                </ul>
            </div>
        `).join('');

    } catch (err) {
        document.getElementById('loading').innerHTML = '<p>خطأ في تحميل البيانات</p>';
    }
}

async function showMaterials(subjectId, subjectName) {
    const modal = document.getElementById('materials-modal');
    const list = document.getElementById('materials-list');

    document.getElementById('modal-title').textContent = subjectName;
    list.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    modal.classList.add('active');

    try {
        const res = await fetch(`${API_URL}/materials/subject/${subjectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await res.json();

        if (!result.data?.length) {
            list.innerHTML = '<div class="empty-state"><p>لا يوجد محتوى لهذه المادة بعد</p></div>';
            return;
        }

        list.innerHTML = result.data.map(m => {
            const isLink = ['link', 'exam', 'quiz', 'external'].includes(m.type);

            return `
                <div class="material-item">
                    <div class="material-info">
                        <strong>${escapeHtml(m.title)}</strong>
                        <span class="type-badge ${m.type}">${translateType(m.type)}</span>
                    </div>
                    <div class="material-actions">
                        ${isLink 
                            ? `<a href="${escapeHtml(m.content)}" target="_blank" class="btn-open">فتح الرابط</a>`
                            : m.file_url 
                                ? `<a href="${escapeHtml(m.file_url)}" download class="btn-download">تحميل</a>`
                                : '<span class="text-muted small">غير متوفر</span>'
                        }
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        list.innerHTML = '<div class="empty-state"><p>خطأ في تحميل المحتوى</p></div>';
    }
}

function closeModal() {
    document.getElementById('materials-modal').classList.remove('active');
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

// Close modal on overlay click
document.getElementById('materials-modal')?.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});

loadTerms();
