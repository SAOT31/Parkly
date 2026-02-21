/**
 * ARCHIVO: js/dashboard.js
 * Dashboard del cliente: tabs, reservas, terminar servicio, cancelar, reseñas.
 * Todo el HTML vive en dashboard.html — este archivo clona templates y llena valores.
 */

let currentTab     = 'all';
let activeReviewId = null;
let reviewRating   = 0;

document.addEventListener('DOMContentLoaded', () => {

    // ── 1. AUTENTICACIÓN ─────────────────────────────────────────────
    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (!session) { window.location.href = 'login.html'; return; }

    // ── 2. NAVBAR ────────────────────────────────────────────────────
    const navUser = document.getElementById('nav-username');
    if (navUser) navUser.textContent = session.name || session.email;

    // ── 3. SALUDO ────────────────────────────────────────────────────
    const subtitle = document.getElementById('dash-subtitle');
    if (subtitle) subtitle.textContent = `Welcome back, ${session.name || session.email} 👋`;

    // ── 4. TABS — event listeners sin onclick en HTML ─────────────────
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab, btn));
    });

    // ── 5. MODAL REVIEW ──────────────────────────────────────────────
    document.getElementById('review-cancel-btn')?.addEventListener('click', closeReviewModal);
    document.getElementById('review-submit-btn')?.addEventListener('click', submitReview);
    document.getElementById('review-dialog')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeReviewModal();
    });

    renderReservations();
});

// ── CAMBIAR TAB ───────────────────────────────────────────────────────
function switchTab(tab, btn) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.setAttribute('aria-selected', 'false');
        b.classList.remove('bg-primary', 'text-white');
        b.classList.add('text-slate-400');
    });
    btn.setAttribute('aria-selected', 'true');
    btn.classList.add('bg-primary', 'text-white');
    btn.classList.remove('text-slate-400');
    renderReservations();
}

// ── RENDERIZAR LISTA ──────────────────────────────────────────────────
function renderReservations() {
    const list    = document.getElementById('reservations-list');
    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (!list || !session) return;

    let reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
    reservations = reservations.filter(r => r.userEmail === session.email);
    if (currentTab !== 'all') reservations = reservations.filter(r => r.status === currentTab);
    reservations.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    list.innerHTML = '';

    if (reservations.length === 0) {
        const emptyTpl = document.getElementById('res-empty-tpl');
        const clone    = emptyTpl.content.cloneNode(true);
        const isAll    = currentTab === 'all';
        clone.querySelector('[data-field="title"]').textContent    = isAll ? 'No bookings yet.' : `No ${currentTab} reservations.`;
        clone.querySelector('[data-field="subtitle"]').textContent = isAll ? 'Find your first parking spot and get started.' : 'Switch tabs to see other bookings.';
        if (isAll) clone.querySelector('[data-field="cta"]').classList.remove('hidden');
        list.appendChild(clone);
        return;
    }

    reservations.forEach(r => list.appendChild(buildCard(r)));
    lucide.createIcons();
}

// ── CONSTRUIR CARD DESDE TEMPLATE ────────────────────────────────────
function buildCard(r) {
    const tpl   = document.getElementById('res-card-tpl');
    const clone = tpl.content.cloneNode(true);
    const article = clone.querySelector('article');
    article.id            = `res-${r.id}`;
    article.setAttribute('aria-label', `Booking: ${r.spotName}`);

    // Thumb
    if (r.image) {
        const img = clone.querySelector('[data-field="thumb-img"]');
        img.src   = r.image;
        img.alt   = r.spotName;
        img.classList.remove('hidden');
        clone.querySelector('[data-field="thumb-placeholder"]').classList.add('hidden');
    }

    // Datos básicos
    clone.querySelector('[data-field="name"]').textContent       = r.spotName;
    clone.querySelector('[data-field="address"]').textContent    = r.address;
    clone.querySelector('[data-field="date"]').textContent       = r.date || '—';
    clone.querySelector('[data-field="time"]').textContent       = `${r.startTime} – ${r.endTime}`;
    clone.querySelector('[data-field="duration"]').textContent   = `${r.hours} hrs`;
    clone.querySelector('[data-field="total"]').textContent      = `$ ${Number(r.amount).toLocaleString('es-CO')}`;
    clone.querySelector('[data-field="booking-id"]').textContent = r.id;

    // Status badge
    const statusStyles = {
        active:    'bg-green-900/30 text-green-400 border border-green-800/50',
        completed: 'bg-blue-900/30 text-blue-400 border border-blue-800/50',
        cancelled: 'bg-red-900/30 text-red-400 border border-red-800/50',
        pending:   'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50',
    };
    const statusLabels = { active: 'Active', completed: 'Completed', cancelled: 'Cancelled', pending: 'Pending' };
    const badge = clone.querySelector('[data-field="status-badge"]');
    badge.className += ` ${statusStyles[r.status] || ''}`;
    clone.querySelector('[data-field="status-label"]').textContent = statusLabels[r.status] || r.status;

    // Bloque de progreso (solo activo)
    if (r.status === 'active') {
        const block = clone.querySelector('[data-field="progress-block"]');
        block.classList.remove('hidden');
        clone.querySelector('[data-field="end-time"]').textContent = r.endTime || '—';
        clone.querySelector('[data-action="finish"]').addEventListener('click', () => finishService(r.id));
        clone.querySelector('[data-action="cancel"]').classList.remove('hidden');
        clone.querySelector('[data-action="cancel"]').addEventListener('click', () => cancelReservation(r.id));
    }

    // Acciones de reseña (solo completed)
    if (r.status === 'completed' && !r.reviewSubmitted) {
        const btn = clone.querySelector('[data-action="review"]');
        btn.classList.remove('hidden');
        btn.addEventListener('click', () => openReviewModal(r.id));
    } else if (r.status === 'completed' && r.reviewSubmitted) {
        clone.querySelector('[data-field="review-done"]').classList.replace('hidden', 'flex');
    }

    // Ver parking — siempre disponible
    clone.querySelector('[data-action="view"]').addEventListener('click', () => goToParking(r.spotId));

    return clone;
}

// ── TERMINAR SERVICIO ─────────────────────────────────────────────────
function finishService(id) {
    const reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
    const idx          = reservations.findIndex(r => r.id === id);
    if (idx === -1) return;

    reservations[idx].status = 'completed';
    localStorage.setItem('parkly_reservations', JSON.stringify(reservations));

    const spots   = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    const spotIdx = spots.findIndex(s => s.id == reservations[idx].spotId);
    if (spotIdx !== -1) {
        spots[spotIdx].occupiedSpots = Math.max(0, (spots[spotIdx].occupiedSpots || 1) - 1);
        localStorage.setItem('parkly_spots', JSON.stringify(spots));
    }

    renderReservations();
    setTimeout(() => openReviewModal(id), 400);
}

// ── CANCELAR RESERVA ──────────────────────────────────────────────────
function cancelReservation(id) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    const reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
    const idx          = reservations.findIndex(r => r.id === id);
    if (idx === -1) return;

    if (reservations[idx].status === 'active') {
        const spots   = JSON.parse(localStorage.getItem('parkly_spots')) || [];
        const spotIdx = spots.findIndex(s => s.id == reservations[idx].spotId);
        if (spotIdx !== -1) {
            spots[spotIdx].occupiedSpots = Math.max(0, (spots[spotIdx].occupiedSpots || 1) - 1);
            localStorage.setItem('parkly_spots', JSON.stringify(spots));
        }
    }

    reservations[idx].status = 'cancelled';
    localStorage.setItem('parkly_reservations', JSON.stringify(reservations));
    renderReservations();
}

// ── MODAL DE RESEÑA ───────────────────────────────────────────────────
function openReviewModal(id) {
    const reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
    const res          = reservations.find(r => r.id === id);
    if (!res || res.status !== 'completed') return;
    if (res.reviewSubmitted) { alert('You already submitted a review for this booking.'); return; }

    activeReviewId = id;
    reviewRating   = 0;

    document.getElementById('review-parking-name').textContent = res.spotName;
    document.getElementById('review-comment').value = '';

    const errEl = document.getElementById('review-error');
    errEl.textContent = '';
    errEl.classList.add('hidden');

    renderStars(0);
    document.getElementById('review-dialog').showModal();
}

function closeReviewModal() {
    document.getElementById('review-dialog').close();
    activeReviewId = null;
    reviewRating   = 0;
}

// ── ESTRELLAS (DOM API, sin innerHTML) ────────────────────────────────
function renderStars(selected) {
    const container = document.getElementById('review-stars');
    container.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.type  = 'button';
        btn.setAttribute('role',       'radio');
        btn.setAttribute('aria-checked', i <= selected ? 'true' : 'false');
        btn.setAttribute('aria-label',   `${i} star${i > 1 ? 's' : ''}`);
        btn.textContent    = '★';
        btn.style.background = 'none';
        btn.style.border     = 'none';
        btn.style.fontSize   = '2rem';
        btn.style.cursor     = 'pointer';
        btn.style.lineHeight = '1';
        btn.style.color      = i <= selected ? '#facc15' : '#334155';
        btn.style.transition = 'transform 0.1s';

        btn.addEventListener('click',     () => { reviewRating = i; renderStars(i); });
        btn.addEventListener('mouseover', () => highlightStars(i));
        btn.addEventListener('mouseout',  () => highlightStars(reviewRating));

        container.appendChild(btn);
    }
}

function highlightStars(val) {
    document.querySelectorAll('#review-stars button').forEach((btn, i) => {
        btn.style.color = i < val ? '#facc15' : '#334155';
    });
}

// ── ENVIAR RESEÑA ─────────────────────────────────────────────────────
function submitReview() {
    if (!activeReviewId) return;

    if (reviewRating === 0) {
        const errEl = document.getElementById('review-error');
        errEl.textContent = 'Please select a star rating.';
        errEl.classList.remove('hidden');
        return;
    }

    const session      = JSON.parse(localStorage.getItem('parkly_session'));
    const comment      = document.getElementById('review-comment').value.trim();
    const spots        = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    const reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
    const res          = reservations.find(r => r.id === activeReviewId);
    const spotIdx      = spots.findIndex(s => s.id == res?.spotId);

    if (spotIdx !== -1) {
        if (!spots[spotIdx].reviews) spots[spotIdx].reviews = [];
        spots[spotIdx].reviews.push({
            id:          Date.now(),
            userName:    session.name || session.email,
            userInitial: (session.name || session.email).charAt(0).toUpperCase(),
            rating:      reviewRating,
            comment,
            date:        new Date().toISOString().split('T')[0],
        });
        const avg = spots[spotIdx].reviews.reduce((a, r) => a + r.rating, 0) / spots[spotIdx].reviews.length;
        spots[spotIdx].rating = Math.round(avg * 10) / 10;
        localStorage.setItem('parkly_spots', JSON.stringify(spots));
    }

    const resIdx = reservations.findIndex(r => r.id === activeReviewId);
    if (resIdx !== -1) {
        reservations[resIdx].reviewSubmitted = true;
        localStorage.setItem('parkly_reservations', JSON.stringify(reservations));
    }

    closeReviewModal();
    renderReservations();
}

// ── HELPERS ───────────────────────────────────────────────────────────
function goToParking(spotId) {
    window.location.href = `detail.html?id=${spotId}`;
}