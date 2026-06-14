const API_URL = 'http://localhost:3200/api'; // Local development
// For production: 'https://your-api.vercel.app/api'

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        clearError();
    });
});

function showError(msg) {
    const el = document.getElementById('error-msg');
    el.textContent = msg;
    el.classList.add('show');
}

function clearError() {
    document.getElementById('error-msg').classList.remove('show');
}

async function studentLogin(event) {
    if (event) event.preventDefault();
    clearError();
    const phone = document.getElementById('student-phone').value.trim();

    if (!phone || phone.length < 3) {
        showError('أدخل رقم صحيح (3 أرقام على الأقل)');
        return;
    }

    const btn = document.querySelector('#student-tab .btn-primary');
    const originalText = btn.textContent;
    btn.textContent = 'جاري الدخول...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });

        const data = await res.json();

        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } else {
            showError(data.error || 'خطأ في الدخول');
        }
    } catch (err) {
        showError('خطأ في الاتصال بالسيرفر');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function adminLogin(event) {
    if (event) event.preventDefault();
    clearError();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    if (!email || !password) {
        showError('أدخل البريد وكلمة المرور');
        return;
    }

    const btn = document.querySelector('#admin-tab .btn-primary');
    const originalText = btn.textContent;
    btn.textContent = 'جاري الدخول...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'admin-dashboard.html';
        } else {
            showError(data.error || 'بيانات الأدمن غير صحيحة');
        }
    } catch (err) {
        showError('خطأ في الاتصال بالسيرفر');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Enter key support
document.getElementById('student-phone')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') studentLogin();
});

document.getElementById('admin-password')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') adminLogin();
});
