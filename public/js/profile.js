/**
 * ARCHIVO: js/profile.js
 * Perfil del usuario — conectado a la DB via API
 */

document.addEventListener('DOMContentLoaded', async () => {

    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (!session) { window.location.href = 'login.html'; return; }

    // --- Logout ---
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('parkly_session');
            window.location.href = 'index.html';
        }
    });

    // ── Avatar helpers ──────────────────────────────────────────
    const avatarKey = `parkly_avatar_${session.id}`;

    function getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    function renderAvatar(name) {
        const photo = localStorage.getItem(avatarKey);
        const initialsEl = document.getElementById('profile-initials');
        const imgEl = document.getElementById('profile-avatar-img');
        if (photo) {
            imgEl.src = photo;
            imgEl.classList.remove('hidden');
            initialsEl.classList.add('hidden');
        } else {
            initialsEl.textContent = getInitials(name);
            initialsEl.classList.remove('hidden');
            imgEl.classList.add('hidden');
        }
    }

    // ── Avatar upload ───────────────────────────────────────────
    document.getElementById('avatar-btn').addEventListener('click', () => {
        document.getElementById('avatar-input').click();
    });

    document.getElementById('avatar-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            localStorage.setItem(avatarKey, ev.target.result);
            renderAvatar(session.name);
            // Refresh nav avatar if present
            const navImg = document.getElementById('nav-avatar-img');
            const navTxt = document.getElementById('nav-avatar-text');
            if (navImg && navTxt) {
                navImg.src = ev.target.result;
                navImg.classList.remove('hidden');
                navTxt.classList.add('hidden');
            }
        };
        reader.readAsDataURL(file);
    });

    // ── Load user profile from DB ────────────────────────────────
    async function loadUserProfile() {
        try {
            const res = await fetch(`/api/users/${session.id}`);
            if (!res.ok) throw new Error();
            const user = await res.json();

            // Sync session with DB data
            session.name  = user.name;
            session.phone = user.phone;
            localStorage.setItem('parkly_session', JSON.stringify(session));

            renderProfileInfo(user);
            renderAvatar(user.name);
        } catch {
            // Fallback to localStorage session
            renderProfileInfo(session);
            renderAvatar(session.name);
        }
    }

    function renderProfileInfo(user) {
        document.getElementById('profile-name').textContent        = user.name  || 'Unknown';
        document.getElementById('profile-email-text').textContent  = user.email || '—';
        document.getElementById('profile-phone-text').textContent  = user.phone || 'Not provided';

        const roleMap = { client: 'Driver', owner: 'Owner', admin: 'Admin' };
        document.getElementById('profile-role-badge').textContent  = roleMap[user.role] || user.role;

        const sinceKey = `parkly_since_${session.id}`;
        if (!localStorage.getItem(sinceKey)) {
            localStorage.setItem(sinceKey, new Date().toISOString().slice(0, 10));
        }
        const since = localStorage.getItem(sinceKey).slice(0, 4);
        document.getElementById('profile-member-since').textContent = `Member since ${since}`;
    }

    // ── Edit profile ──────────────────────────────────────────────
    document.getElementById('btn-edit').addEventListener('click', () => {
        document.getElementById('display-mode').classList.add('hidden');
        document.getElementById('btn-edit').classList.add('hidden');
        document.getElementById('edit-mode').classList.remove('hidden');
        document.getElementById('edit-name').value  = session.name  || '';
        document.getElementById('edit-phone').value = session.phone || '';
    });

    document.getElementById('btn-cancel').addEventListener('click', cancelEdit);

    function cancelEdit() {
        document.getElementById('edit-mode').classList.add('hidden');
        document.getElementById('display-mode').classList.remove('hidden');
        document.getElementById('btn-edit').classList.remove('hidden');
        document.getElementById('edit-error').classList.add('hidden');
    }

    document.getElementById('btn-save').addEventListener('click', async () => {
        const newName  = document.getElementById('edit-name').value.trim();
        const newPhone = document.getElementById('edit-phone').value.trim();
        const errEl    = document.getElementById('edit-error');

        if (!newName) {
            errEl.textContent = 'Name cannot be empty.';
            errEl.classList.remove('hidden');
            return;
        }

        try {
            const res = await fetch(`/api/users/${session.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, phone: newPhone }),
            });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            session.name  = updated.name;
            session.phone = updated.phone;
            localStorage.setItem('parkly_session', JSON.stringify(session));
            renderProfileInfo(updated);
            renderAvatar(updated.name);
            cancelEdit();
            // Update nav username too
            const navUser = document.getElementById('nav-username');
            if (navUser) navUser.textContent = updated.name;
        } catch {
            errEl.textContent = 'Could not save changes. Try again.';
            errEl.classList.remove('hidden');
        }
    });

    // ── Load reservations + stats ─────────────────────────────────
    async function loadStats() {
        try {
            const res  = await fetch('/api/reservations');
            const all  = await res.json();
            const mine = all.filter(r => r.userEmail === session.email);

            const completed    = mine.filter(r => r.status === 'completed').length;
            const uniquePlaces = new Set(mine.map(r => r.spotId)).size;

            document.getElementById('stat-total').textContent     = mine.length;
            document.getElementById('stat-completed').textContent = completed;
            document.getElementById('stat-places').textContent    = uniquePlaces;

            renderRecentActivity(mine);
        } catch (err) {
            console.error('Profile stats error:', err);
        }
    }

    // ── Recent Activity ───────────────────────────────────────────
    function renderRecentActivity(reservations) {
        const list   = document.getElementById('recent-list');
        const recent = [...reservations]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        if (recent.length === 0) {
            list.innerHTML = `<li class="text-sm text-slate-500 text-center py-6">
                No bookings yet.
                <a href="search.html" class="text-primary hover:underline ml-1">Find a spot →</a>
            </li>`;
            return;
        }

        const statusColors = {
            active:    'text-green-400 bg-green-900/30',
            completed: 'text-blue-400 bg-blue-900/30',
            cancelled: 'text-red-400 bg-red-900/30',
            pending:   'text-yellow-400 bg-yellow-900/30',
        };

        list.innerHTML = '';
        recent.forEach(r => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between gap-3 py-3 border-b border-border last:border-0';
            li.innerHTML = `
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-lg flex-shrink-0"
                         aria-hidden="true">🅿</div>
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-white truncate">${r.spotName || `Spot #${r.spotId}`}</p>
                        <p class="text-xs text-slate-500">${r.date || '—'} · ${r.startTime || ''} – ${r.endTime || ''}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-xs font-bold text-primary">$${Number(r.amount).toLocaleString('es-CO')}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[r.status] || ''}">
                        ${r.status.toUpperCase()}
                    </span>
                </div>
            `;
            list.appendChild(li);
        });
    }

    // ── Reviews from DB ───────────────────────────────────────────
    async function loadReviews() {
        const container = document.getElementById('reviews-list');
        try {
            const res     = await fetch(`/api/reviews/user/${session.id}`);
            const reviews = await res.json();

            if (!reviews.length) {
                container.innerHTML = `<p class="text-sm text-slate-500 text-center py-6">
                    You haven't submitted any reviews yet.<br>
                    <a href="dashboard.html" class="text-primary hover:underline">Go to My Bookings →</a>
                </p>`;
                return;
            }

            container.innerHTML = '';
            reviews.forEach(rv => {
                const div = document.createElement('div');
                div.className = 'flex flex-col gap-1 py-3 border-b border-border last:border-0';
                div.setAttribute('role', 'listitem');
                div.innerHTML = `
                    <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-semibold text-white">${rv.spotName || 'Parking'}</p>
                        <span class="text-yellow-400 text-sm" aria-label="${rv.rating} stars">
                            ${'★'.repeat(rv.rating)}${'☆'.repeat(5 - rv.rating)}
                        </span>
                    </div>
                    ${rv.comment ? `<p class="text-xs text-slate-400 italic">"${rv.comment}"</p>` : ''}
                    <p class="text-[10px] text-slate-600">${rv.date ? rv.date.slice(0, 10) : ''}</p>
                `;
                container.appendChild(div);
            });
        } catch {
            container.innerHTML = `<p class="text-sm text-slate-500 text-center py-4">Could not load reviews.</p>`;
        }
    }

    // ── Init ──────────────────────────────────────────────────────
    await loadUserProfile();
    await Promise.all([loadStats(), loadReviews()]);
    if (window.lucide) lucide.createIcons();
});
