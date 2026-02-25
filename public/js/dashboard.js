/**
 * ARCHIVO: js/dashboard.js
 * Dashboard del cliente conectado a la Base de Datos real.
 *
 */

let currentTab     = 'all';
let activeReviewId = null;
let reviewRating   = 0;

document.addEventListener('DOMContentLoaded', () => {

    // 1. Validación de Sesión
    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (!session) { 
        window.location.href = 'login.html'; 
        return; 
    }

    // Inicialización de la Interfaz
    const navUser = document.getElementById('nav-username');
    if (navUser) navUser.textContent = session.name || session.email;

    const subtitle = document.getElementById('dash-subtitle');
    if (subtitle) subtitle.textContent = `Welcome back, ${session.name || session.email} 👋`;

    // Navegación por Pestañas
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab, btn));
    });

    // Control del formulario de reseñas
    document.getElementById('review-form')?.addEventListener('submit', e => e.preventDefault());

    // Listeners del Modal de Reseña
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

    // 2. CARGA DESDE EL SERVIDOR (Reemplaza DB.getReservations)
    let reservations = [];
    try {
        const response = await fetch('/api/reservations');
        const allData  = await response.json();
        // Filtramos solo las reservas de este usuario por email
        reservations = allData.filter(r => r.userEmail === session.email);
    } catch (error) {
        console.error("Dashboard Error: Could not fetch from TiDB.", error);
    }

    // Filtrado por pestaña actual
    if (currentTab !== 'all') reservations = reservations.filter(r => r.status === currentTab);
    
    // Ordenar por fecha (más reciente primero)
    reservations.sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = '';

    // Estado vacío
    if (reservations.length === 0) {
        const emptyTpl = document.getElementById('res-empty-tpl');
        const clone    = emptyTpl.content.cloneNode(true);
        const isAll    = currentTab === 'all';
        clone.querySelector('[data-field=\"title\"]').textContent    = isAll ? 'No bookings yet.' : `No ${currentTab} reservations.`;
        clone.querySelector('[data-field=\"subtitle\"]').textContent = isAll ? 'Find your first parking spot and get started.' : 'Switch tabs to see other bookings.';
        if (isAll) clone.querySelector('[data-field=\"cta\"]').classList.remove('hidden');
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
    article.id = `res-${r.id}`;

    // Pintar imagen si existe
    if (r.image) {
        const img = clone.querySelector('[data-field=\"thumb-img\"]');
        img.src   = r.image;
        img.classList.remove('hidden');
        clone.querySelector('[data-field=\"thumb-placeholder\"]').classList.add('hidden');
    }

    // Mapeo de datos de la Reserva
    clone.querySelector('[data-field=\"name\"]').textContent       = r.spotName || `Spot #${r.spotId}`;
    clone.querySelector('[data-field=\"address\"]').textContent    = r.address || 'Address not registered';
    clone.querySelector('[data-field=\"date\"]').textContent       = r.date || '—';
    clone.querySelector('[data-field=\"time\"]').textContent       = `${r.startTime} – ${r.endTime}`;
    clone.querySelector('[data-field=\"duration\"]').textContent   = `${r.hours || 1} hrs`;
    clone.querySelector('[data-field=\"total\"]').textContent      = `$ ${Number(r.amount).toLocaleString('es-CO')}`;
    clone.querySelector('[data-field=\"booking-id\"]').textContent = r.id;

    // Estilos de estado
    const statusStyles = {
        active:    'bg-green-900/30 text-green-400 border border-green-800/50',
        completed: 'bg-blue-900/30 text-blue-400 border border-blue-800/50',
        cancelled: 'bg-red-900/30 text-red-400 border border-red-800/50',
        pending:   'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50',
    };
    
    const badge = clone.querySelector('[data-field=\"status-badge\"]');
    badge.className += ` ${statusStyles[r.status] || ''}`;
    clone.querySelector('[data-field=\"status-label\"]').textContent = r.status.toUpperCase();

    // Lógica de botones de acción
    if (r.status === 'active') {
        const block = clone.querySelector('[data-field=\"progress-block\"]');
        block.classList.remove('hidden');
        clone.querySelector('[data-field=\"end-time\"]').textContent = r.endTime || '—';
        clone.querySelector('[data-action=\"finish\"]').addEventListener('click', () => updateReservationStatus(r.id, 'completed'));
        clone.querySelector('[data-action=\"cancel\"]').classList.remove('hidden');
        clone.querySelector('[data-action=\"cancel\"]').addEventListener('click', () => updateReservationStatus(r.id, 'cancelled'));
    }

    if (r.status === 'completed' && !r.reviewSubmitted) {
        const btn = clone.querySelector('[data-action=\"review\"]');
        btn.classList.remove('hidden');
        btn.addEventListener('click', () => openReviewModal(r.id));
    } else if (r.status === 'completed' && r.reviewSubmitted) {
        clone.querySelector('[data-field=\"review-done\"]').classList.replace('hidden', 'flex');
    }

    return clone;
}

// 3. ACTUALIZACIÓN EN SERVIDOR (PATCH)
async function updateReservationStatus(id, newStatus) {
    if (newStatus === 'cancelled' && !confirm('Are you sure you want to cancel?')) return;

    try {
        await fetch(`/api/reservations/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        renderReservations();
    } catch (e) {
        console.error("Update failed:", e);
    }
}

// --- Lógica del Modal de Reseñas (Tu código original íntegro) ---
async function openReviewModal(id) {
    const response = await fetch('/api/reservations');
    const reservations = await response.json();
    const res = reservations.find(r => r.id === id);
    
    if (!res || res.status !== 'completed') return;

    activeReviewId = id;
    reviewRating   = 0;

    document.getElementById('review-parking-name').textContent = res.spotName || `Spot #${res.spotId}`;
    document.getElementById('review-comment').value = '';
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
        btn.textContent    = '★';
        btn.style.fontSize = '2rem';
        btn.style.color    = i <= selected ? '#facc15' : '#334155';
        btn.style.cursor   = 'pointer';
        btn.style.background = 'none';
        btn.style.border = 'none';

        btn.addEventListener('click', () => { reviewRating = i; renderStars(i); });
        container.appendChild(btn);
    }
}

async function submitReview() {
    if (!activeReviewId || reviewRating === 0) return;

    const session = JSON.parse(localStorage.getItem('parkly_session'));
    const reviewData = {
        reservationId: activeReviewId,
        rating: reviewRating,
        comment: document.getElementById('review-comment').value.trim()
    };

    try {
        await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reviewData)
        });
        closeReviewModal();
        renderReservations();
    } catch (e) {
        console.error("Failed to submit review", e);
    }
}