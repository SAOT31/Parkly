/**
 * ARCHIVO: js/detail.js
 * DESCRIPCIÓN: Llena el HTML estático de detail.html con datos del spot.
 * El HTML vive en detail.html — este archivo solo rellena valores y maneja eventos.
 */

let currentSpot   = null;
let currentImgIdx = 0;

document.addEventListener('DOMContentLoaded', () => {

    // ── 1. CARGAR SPOT ───────────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const id     = params.get('id');
    const spots  = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    currentSpot  = spots.find(s => s.id == id);

    if (!currentSpot) {
        window.location.href = 'search.html';
        return;
    }

    fillPage();
});

// ── 2. LLENAR PÁGINA ─────────────────────────────────────────────────
function fillPage() {
    const p   = currentSpot;
    const avg = calcAvgRating(p);
    const displayRating = (p.reviews && p.reviews.length > 0) ? avg : (p.rating || 0);

    document.title = `${p.name} – PARKLY`;

    // ── Navbar usuario ───────────────────────────────────────────────
    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (session) {
        const navUser = document.getElementById('nav-username');
        const navRole = document.getElementById('nav-role');
        if (navUser) navUser.textContent = session.name || session.email;
        if (navRole) navRole.textContent = session.role || 'Driver';
    }

    // ── Galería ──────────────────────────────────────────────────────
    const images  = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
    const mainImg = document.getElementById('gallery-main-img');
    if (mainImg) {
        mainImg.src = images[0] || '';
        mainImg.alt = `Main photo of ${p.name}`;
    }

    // Miniaturas — lista dinámica necesaria por número variable
    const thumbsContainer = document.getElementById('gallery-thumbs');
    if (thumbsContainer && images.length > 1) {
        thumbsContainer.innerHTML = images.map((src, i) => `
            <button type="button" role="listitem"
                onclick="changeImage(${i}, this)"
                aria-label="Photo ${i + 1}" aria-pressed="${i === 0}"
                class="h-16 w-20 rounded-xl overflow-hidden border-2 ${i === 0 ? 'border-primary' : 'border-transparent opacity-50 hover:opacity-100'} transition-all shrink-0 focus:outline-none">
                <img src="${src}" alt="Photo ${i + 1} of ${p.name}" class="w-full h-full object-cover">
            </button>`).join('');
    } else if (thumbsContainer) {
        thumbsContainer.classList.add('hidden');
    }

    // ── Nombre y dirección ───────────────────────────────────────────
    setText('spot-name', p.name);
    setText('spot-address-text', p.address);

    // ── Feature badges ───────────────────────────────────────────────
    const badgesContainer = document.getElementById('features-badges');
    if (badgesContainer) {
        const badges = [
            p.verified      && `<span class="inline-flex items-center gap-1 bg-primary/20 text-primary border border-primary/40 px-2.5 py-1 rounded-full text-[11px] font-bold"><i data-lucide="shield-check" class="w-3 h-3" aria-hidden="true"></i> Verified</span>`,
            p.available
                ? `<span class="inline-flex items-center gap-1 bg-green-900/30 text-green-400 border border-green-700/30 px-2.5 py-1 rounded-full text-[11px] font-bold"><i data-lucide="check-circle" class="w-3 h-3" aria-hidden="true"></i> Available</span>`
                : `<span class="inline-flex items-center gap-1 bg-red-900/30 text-red-400 border border-red-700/30 px-2.5 py-1 rounded-full text-[11px] font-bold"><i data-lucide="x-circle" class="w-3 h-3" aria-hidden="true"></i> Full</span>`,
            p.is24h         && `<span class="inline-flex items-center gap-1 bg-slate-800 border border-border px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-300"><i data-lucide="clock" class="w-3 h-3" aria-hidden="true"></i> Open 24h</span>`,
            p.hasSecurity   && `<span class="inline-flex items-center gap-1 bg-slate-800 border border-border px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-300"><i data-lucide="lock" class="w-3 h-3" aria-hidden="true"></i> Security</span>`,
            p.isIlluminated && `<span class="inline-flex items-center gap-1 bg-slate-800 border border-border px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-300"><i data-lucide="sun" class="w-3 h-3" aria-hidden="true"></i> Illuminated</span>`,
            p.evCharging    && `<span class="inline-flex items-center gap-1 bg-slate-800 border border-border px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-300"><i data-lucide="zap" class="w-3 h-3" aria-hidden="true"></i> EV Charging</span>`,
        ].filter(Boolean).join('');
        badgesContainer.innerHTML = badges;
    }

    // ── Rating ───────────────────────────────────────────────────────
    setText('spot-rating', displayRating.toFixed(1));
    setText('spot-review-count', `(${(p.reviews && p.reviews.length) || p.reviewCount || 0} reviews)`);

    // ── Precios ──────────────────────────────────────────────────────
    setText('price-hour',  p.price     ? `$ ${p.price.toLocaleString('es-CO')}`     : '—');
    setText('price-day',   p.priceDay  ? `$ ${p.priceDay.toLocaleString('es-CO')}`  : '—');
    setText('price-month', p.priceMonth ? `$ ${p.priceMonth.toLocaleString('es-CO')}` : '—');

    // ── Booking panel price ──────────────────────────────────────────
    setText('booking-price', p.price ? `$ ${p.price.toLocaleString('es-CO')}` : '—');

    // ── Ocupación ────────────────────────────────────────────────────
    if (p.occupiedSpots != null && p.totalSpots) {
        const occupancy = Math.round((p.occupiedSpots / p.totalSpots) * 100);
        const spotsLeft = p.totalSpots - p.occupiedSpots;

        setText('occupancy-pct', `${occupancy}%`);

        const spotsLeftEl = document.getElementById('spots-left');
        if (spotsLeftEl) {
            spotsLeftEl.textContent = `${spotsLeft} spots free`;
            spotsLeftEl.className   = `font-bold ${spotsLeft > 0 ? 'text-green-400' : 'text-red-400'}`;
        }

        const bar     = document.getElementById('occupancy-bar');
        const barWrap = document.getElementById('occupancy-bar-wrap');
        if (bar) {
            bar.style.width = `${occupancy}%`;
            bar.className   = `h-full rounded-full transition-all duration-700 ${occupancy > 80 ? 'bg-red-500' : occupancy > 50 ? 'bg-yellow-500' : 'bg-primary'}`;
        }
        if (barWrap) barWrap.setAttribute('aria-valuenow', occupancy);

        show('occupancy-section');
    }

    // ── Servicios ────────────────────────────────────────────────────
    if (p.services && p.services.length) {
        const serviceIcons = { vacuum:'wind', security:'shield', cctv:'video', ev:'zap', wash:'droplets', wifi:'wifi', valet:'briefcase', shuttle:'bus' };
        const list = document.getElementById('services-list');
        if (list) {
            list.innerHTML = p.services.map(s => `
                <li class="inline-flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-full text-xs text-slate-300 font-medium">
                    <i data-lucide="${serviceIcons[s.toLowerCase()] || 'check'}" class="w-3 h-3 text-primary" aria-hidden="true"></i>
                    ${s}
                </li>`).join('');
        }
        show('services-section');
    }

    // ── Contacto ─────────────────────────────────────────────────────
    if (p.phone) {
        const phoneEl = document.getElementById('spot-phone');
        if (phoneEl) {
            phoneEl.textContent = p.phone;
            phoneEl.href        = `tel:${p.phone}`;
        }
        show('contact-section');
    }

    // ── Mapa embed ───────────────────────────────────────────────────
    initMap('map-embed', p.lat, p.lng, p.name);

    // ── Reseñas ──────────────────────────────────────────────────────
    fillReviews(p);

    // ── Panel booking disponible / lleno ─────────────────────────────
    if (p.available) {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('book-date');
        if (dateInput) { dateInput.min = today; dateInput.value = today; }

        document.getElementById('book-start').addEventListener('change', calcPrice);
        document.getElementById('book-end').addEventListener('change',   calcPrice);
        document.getElementById('book-date').addEventListener('change',  calcPrice);
        document.getElementById('booking-form').addEventListener('submit', goToBooking);
        calcPrice();
    } else {
        hide('booking-available');
        show('booking-full');
    }

    lucide.createIcons();
}

// ── 3. RESEÑAS ───────────────────────────────────────────────────────
function fillReviews(p) {
    const reviews = p.reviews || [];
    const avg     = reviews.length > 0 ? calcAvgRating(p) : (p.rating || 0);

    setText('reviews-score', avg.toFixed(1));
    setText('reviews-count', `(${reviews.length})`);

    const list = document.getElementById('reviews-list');
    if (!list) return;

    if (reviews.length === 0) {
        list.innerHTML = '<p class="text-slate-500 text-sm">No reviews yet. Be the first to review!</p>';
        return;
    }

    list.innerHTML = reviews.map(r => `
        <article class="border-b border-border pb-4 last:border-0">
            <header class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary"
                         aria-hidden="true">
                        ${r.userInitial || r.userName?.[0] || '?'}
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-white">${r.userName || 'Anonymous'}</p>
                        <time class="text-[11px] text-slate-500" datetime="${r.date || ''}">${r.date || ''}</time>
                    </div>
                </div>
                <div class="text-yellow-400 text-sm" aria-label="${r.rating} out of 5 stars">
                    ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                </div>
            </header>
            ${r.comment ? `<p class="text-sm text-slate-400">${r.comment}</p>` : ''}
        </article>`).join('');
}

// ── 4. CALCULADORA ───────────────────────────────────────────────────
function calcPrice() {
    const start   = document.getElementById('book-start').value;
    const end     = document.getElementById('book-end').value;
    const calc    = document.getElementById('price-calc');
    const btnBook = document.getElementById('btn-book');
    if (!start || !end || !calc) return;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const hours    = (eh + em / 60) - (sh + sm / 60);

    if (hours <= 0) {
        calc.innerHTML = `
            <p role="alert" class="text-xs text-red-400 flex items-center gap-1.5 py-2">
                <i data-lucide="alert-circle" class="w-3.5 h-3.5" aria-hidden="true"></i>
                End time must be after start time.
            </p>`;
        if (btnBook) btnBook.disabled = true;
        lucide.createIcons();
        return;
    }

    const subtotal = Math.ceil(hours) * currentSpot.price;
    const fee      = Math.round(subtotal * 0.05);
    const total    = subtotal + fee;

    calc.innerHTML = `
        <dl class="bg-background border border-border rounded-xl p-4 space-y-2 text-sm">
            <div class="flex justify-between">
                <dt class="text-slate-400">Duration</dt>
                <dd class="text-white font-medium">${hours.toFixed(1)} hrs</dd>
            </div>
            <div class="flex justify-between">
                <dt class="text-slate-400">Subtotal</dt>
                <dd class="text-white font-medium">$ ${subtotal.toLocaleString('es-CO')}</dd>
            </div>
            <div class="flex justify-between">
                <dt class="text-slate-400">Service fee (5%)</dt>
                <dd class="text-white font-medium">$ ${fee.toLocaleString('es-CO')}</dd>
            </div>
            <div class="flex justify-between pt-2 border-t border-border">
                <dt class="font-bold text-white">Total</dt>
                <dd class="text-xl font-black text-primary">$ ${total.toLocaleString('es-CO')}</dd>
            </div>
        </dl>`;

    if (btnBook) btnBook.disabled = false;
    lucide.createIcons();

    localStorage.setItem('parkly_booking', JSON.stringify({
        spotId:    currentSpot.id,
        date:      document.getElementById('book-date').value,
        startTime: start,
        endTime:   end,
        hours:     parseFloat(hours.toFixed(2)),
        subtotal, fee, total,
    }));
}

// ── 5. IR A PAGO ─────────────────────────────────────────────────────
function goToBooking(e) {
    if (e) e.preventDefault();

    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (!session) {
        alert('You need to log in to book a spot.');
        window.location.href = 'login.html';
        return;
    }

    const booking = JSON.parse(localStorage.getItem('parkly_booking') || '{}');
    if (!booking.total) {
        alert('Please select a valid time range first.');
        return;
    }

    window.location.href = `payment.html?id=${currentSpot.id}`;
}

// ── 6. GALERÍA ───────────────────────────────────────────────────────
function changeImage(index, btn) {
    currentImgIdx = index;
    const mainImg = document.getElementById('gallery-main-img');
    if (mainImg && currentSpot) {
        const images = (currentSpot.images && currentSpot.images.length) ? currentSpot.images : [currentSpot.image];
        mainImg.src  = images[index];
    }
    document.querySelectorAll('#gallery-thumbs button').forEach((b, i) => {
        const active = i === index;
        b.setAttribute('aria-pressed', active);
        b.classList.toggle('border-primary', active);
        b.classList.toggle('border-transparent', !active);
        b.classList.toggle('opacity-50', !active);
    });
}

// ── 7. MAPA ──────────────────────────────────────────────────────────
function openMapModal() {
    const modal = document.getElementById('map-modal');
    if (!modal) return;
    setText('map-modal-title', currentSpot.name);
    modal.showModal();
    setTimeout(() => initMap('map-modal-content', currentSpot.lat, currentSpot.lng, currentSpot.name), 50);
}

function closeMapModal() {
    document.getElementById('map-modal')?.close();
}

function initMap(containerId, lat, lng, name) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (lat && lng) {
        el.innerHTML = `<iframe
            src="https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed"
            width="100%" height="100%" style="border:0" allowfullscreen loading="lazy"
            title="Map location of ${name}"></iframe>`;
    }
}

// ── 8. HELPERS ───────────────────────────────────────────────────────
function calcAvgRating(p) {
    if (!p.reviews || p.reviews.length === 0) return p.rating || 0;
    return p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function show(id) {
    document.getElementById(id)?.classList.remove('hidden');
}

function hide(id) {
    document.getElementById(id)?.classList.add('hidden');
}