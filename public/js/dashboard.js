/**
 * ARCHIVO: js/dashboard.js
 * Dashboard del cliente conectado a la Base de Datos.
 */

let currentTab     = 'all';
let activeReviewId = null;
let reviewRating   = 0;

document.addEventListener('DOMContentLoaded', () => {

    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (!session) { window.location.href = 'login.html'; return; }

    const navUser = document.getElementById('nav-username');
    if (navUser) navUser.textContent = session.name || session.email;

    const subtitle = document.getElementById('dash-subtitle');
    if (subtitle) subtitle.textContent = `Welcome back, ${session.name || session.email} 👋`;

    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab, btn));
    });

    // Control del formulario (Reemplaza el onsubmit inline)
    document.getElementById('review-form')?.addEventListener('submit', e => e.preventDefault());

    document.getElementById('review-cancel-btn')?.addEventListener('click', closeReviewModal);
    document.getElementById('review-submit-btn')?.addEventListener('click', submitReview);
    document.getElementById('review-dialog')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeReviewModal();
    });

    renderReservations();
});

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

async function renderReservations() {
    const list    = document.getElementById('reservations-list');
    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (!list || !session) return;

    // LECTURA DESDE BASE DE DATOS (Requiere tener DB.getReservations() en data.js)
    let reservations = [];
    if (typeof DB !== 'undefined' && DB.getReservations) {
        reservations = await DB.getReservations();
    } else {
        reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
    }

    reservations = reservations.filter(r => r.userEmail === session.email);
    if (currentTab !== 'all') reservations = reservations.filter(r => r.status === currentTab);
    reservations.sort((a, b) => new Date(b.bookedAt || b.date) - new Date(a.bookedAt || a.date));

    list.innerHTML = '';

    if (reservations.length === 0) {
        const emptyTpl = document.getElementById('res-empty-tpl');
        const clone    = emptyTpl.content.cloneNode(true);
        const isAll    = currentTab === 'all';
        clone.querySelector('[data-field="title"]').textContent    = isAll ? 'No bookings yet.' : `No ${currentTab} reservations.`;
        clone.querySelector('[data-field="subtitle"]').textContent = isAll ? 'Find your first parking spot and get started.' : 'Switch tabs to see other bookings.';
        if (isAll) clone.querySelector('[data-field="cta"]').classList.remove('hidden');
        list.appendChild(clone);
        if (window.lucide) lucide.createIcons();
        return;
    }

    reservations.forEach(r => list.appendChild(buildCard(r)));
    if (window.lucide) lucide.createIcons();
}

function buildCard(r) {
    const tpl   = document.getElementById('res-card-tpl');
    const clone = tpl.content.cloneNode(true);
    const article = clone.querySelector('article');
    article.id            = `res-${r.id}`;
    article.setAttribute('aria-label', `Booking: ${r.spotName || 'Spot'}`);

    if (r.image) {
        const img = clone.querySelector('[data-field="thumb-img"]');
        img.src   = r.image;
        img.alt   = r.spotName || 'Spot';
        img.classList.remove('hidden');
        clone.querySelector('[data-field="thumb-placeholder"]').classList.add('hidden');
    }

    clone.querySelector('[data-field="name"]').textContent       = r.spotName || `Spot #${r.spotId}`;
    clone.querySelector('[data-field="address"]').textContent    = r.address || '';
    clone.querySelector('[data-field="date"]').textContent       = r.date || '—';
    clone.querySelector('[data-field="time"]').textContent       = `${r.startTime} – ${r.endTime}`;
    clone.querySelector('[data-field="duration"]').textContent   = `${r.hours || 1} hrs`;
    clone.querySelector('[data-field="total"]').textContent      = `$ ${Number(r.amount).toLocaleString('es-CO')}`;
    clone.querySelector('[data-field="booking-id"]').textContent = r.id;

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

    if (r.status === 'active') {
        const block = clone.querySelector('[data-field="progress-block"]');
        block.classList.remove('hidden');
        clone.querySelector('[data-field="end-time"]').textContent = r.endTime || '—';
        clone.querySelector('[data-action="finish"]').addEventListener('click', () => finishService(r.id));
        clone.querySelector('[data-action="cancel"]').classList.remove('hidden');
        clone.querySelector('[data-action="cancel"]').addEventListener('click', () => cancelReservation(r.id));
    }

    if (r.status === 'completed' && !r.reviewSubmitted) {
        const btn = clone.querySelector('[data-action="review"]');
        btn.classList.remove('hidden');
        btn.addEventListener('click', () => openReviewModal(r.id));
    } else if (r.status === 'completed' && r.reviewSubmitted) {
        clone.querySelector('[data-field="review-done"]').classList.replace('hidden', 'flex');
    }

    clone.querySelector('[data-action="view"]').addEventListener('click', () => goToParking(r.spotId));

    return clone;
}

async function finishService(id) {
    if (typeof DB !== 'undefined' && DB.updateReservationStatus) {
        await DB.updateReservationStatus(id, 'completed');
    }
    renderReservations();
    setTimeout(() => openReviewModal(id), 400);
}

async function cancelReservation(id) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    if (typeof DB !== 'undefined' && DB.updateReservationStatus) {
        await DB.updateReservationStatus(id, 'cancelled');
    }
    renderReservations();
}

async function openReviewModal(id) {
    let reservations = [];
    if (typeof DB !== 'undefined' && DB.getReservations) reservations = await DB.getReservations();
    else reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];

    const res = reservations.find(r => r.id === id);
    if (!res || res.status !== 'completed') return;
    if (res.reviewSubmitted) { alert('You already submitted a review for this booking.'); return; }

    activeReviewId = id;
    reviewRating   = 0;

    document.getElementById('review-parking-name').textContent = res.spotName || `Spot #${res.spotId}`;
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

async function submitReview() {
    if (!activeReviewId) return;

    if (reviewRating === 0) {
        const errEl = document.getElementById('review-error');
        errEl.textContent = 'Please select a star rating.';
        errEl.classList.remove('hidden');
        return;
    }

    const session = JSON.parse(localStorage.getItem('parkly_session'));
    const comment = document.getElementById('review-comment').value.trim();
    
    const reviewData = {
        reservationId: activeReviewId,
        userName: session.name || session.email,
        rating: reviewRating,
        comment: comment,
        date: new Date().toISOString().split('T')[0]
    };

    if (typeof DB !== 'undefined' && DB.saveReview) {
        await DB.saveReview(reviewData);
        await DB.updateReservationStatus(activeReviewId, 'completed', true);
    }

    closeReviewModal();
    renderReservations();
}

function goToParking(spotId) {
    window.location.href = `detail.html?id=${spotId}`;
}