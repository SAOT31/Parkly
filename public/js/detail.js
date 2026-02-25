/**
 * ARCHIVO: js/detail.js
 * DESCRIPCIÓN: 100% Lógica. Sin HTML inyectado por strings.
 */

let currentSpot   = null;
let currentImgIdx = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id     = params.get('id');
    const spots  = await DB.getSpots(); 
    currentSpot  = spots.find(s => s.id == id);

    if (!currentSpot) {
        window.location.href = 'search.html';
        return;
    }

    fillPage();
    setupModals();
});

function setupModals() {
    const btnOpenMap = document.getElementById('btn-open-map');
    const btnCloseMap = document.getElementById('btn-close-map');
    
    if (btnOpenMap) btnOpenMap.addEventListener('click', openMapModal);
    if (btnCloseMap) btnCloseMap.addEventListener('click', closeMapModal);
}

function fillPage() {
    const p   = currentSpot;
    const avg = calcAvgRating(p);
    const displayRating = (p.reviews && p.reviews.length > 0) ? avg : (p.rating || 0);
    document.title = `${p.name} – PARKLY`;

    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (session) {
        setText('nav-username', session.name || session.email);
        setText('nav-role', session.role || 'Driver');
    }

    const images  = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
    const mainImg = document.getElementById('gallery-main-img');
    if (mainImg) {
        mainImg.src = images[0] || '';
        mainImg.alt = `Main photo of ${p.name}`;
    }

    const thumbsContainer = document.getElementById('gallery-thumbs');
    const thumbTpl = document.getElementById('tpl-gallery-thumb');
    
    if (thumbsContainer && thumbTpl && images.length > 1) {
        thumbsContainer.innerHTML = ''; 
        images.forEach((src, i) => {
            const clone = thumbTpl.content.cloneNode(true);
            const btn = clone.querySelector('button');
            const img = clone.querySelector('img');
            
            img.src = src;
            img.alt = `Photo ${i + 1} of ${p.name}`;
            btn.setAttribute('aria-label', `Photo ${i + 1}`);
            btn.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
            
            if (i === 0) {
                btn.classList.replace('border-transparent', 'border-primary');
                btn.classList.remove('opacity-50');
            }
            
            btn.addEventListener('click', (e) => changeImage(i, e.currentTarget));
            thumbsContainer.appendChild(clone);
        });
    } else if (thumbsContainer) {
        hide('gallery-thumbs');
    }

    setText('spot-name', p.name);
    setText('spot-address-text', p.address);
    setText('spot-rating', displayRating.toFixed(1));
    setText('spot-review-count', `(${(p.reviews && p.reviews.length) || p.reviewCount || 0} reviews)`);

    setText('price-hour',  p.price ? `$ ${p.price.toLocaleString('es-CO')}` : '—');
    setText('price-day',   p.priceDay ? `$ ${p.priceDay.toLocaleString('es-CO')}` : '—');
    setText('price-month', p.priceMonth ? `$ ${p.priceMonth.toLocaleString('es-CO')}` : '—');
    setText('booking-price', p.price ? `$ ${p.price.toLocaleString('es-CO')}` : '—');

    if (p.occupiedSpots != null && p.totalSpots) {
        const occupancy = Math.round((p.occupiedSpots / p.totalSpots) * 100);
        setText('occupancy-pct', `${occupancy}%`);
        const spotsLeftEl = document.getElementById('spots-left');
        if (spotsLeftEl) {
            spotsLeftEl.textContent = `${p.totalSpots - p.occupiedSpots} spots free`;
            spotsLeftEl.className = `font-bold ${p.totalSpots - p.occupiedSpots > 0 ? 'text-green-400' : 'text-red-400'}`;
        }
        const bar = document.getElementById('occupancy-bar');
        if (bar) {
            bar.style.width = `${occupancy}%`;
            bar.className = `h-full rounded-full transition-all duration-700 ${occupancy > 80 ? 'bg-red-500' : occupancy > 50 ? 'bg-yellow-500' : 'bg-primary'}`;
        }
        show('occupancy-section');
    }

    if (p.phone) {
        const phoneEl = document.getElementById('spot-phone');
        if (phoneEl) {
            phoneEl.textContent = p.phone;
            phoneEl.href = `tel:${p.phone}`;
        }
        show('contact-section');
    }

    fillReviews(p);

    if (p.available !== false) {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('book-date');
        if (dateInput) { dateInput.min = today; dateInput.value = today; }

        document.getElementById('book-start').addEventListener('change', calcPrice);
        document.getElementById('book-end').addEventListener('change', calcPrice);
        document.getElementById('book-date').addEventListener('change', calcPrice);
        document.getElementById('booking-form').addEventListener('submit', goToBooking);
        calcPrice();
    } else {
        hide('booking-available');
        show('booking-full');
    }

    if (window.lucide) lucide.createIcons();
}

function fillReviews(p) {
    const reviews = p.reviews || [];
    const list = document.getElementById('reviews-list');
    const tpl = document.getElementById('tpl-review');
    
    if (!list || !tpl) return;
    if (reviews.length === 0) return;

    hide('no-reviews-msg');
    
    reviews.forEach(r => {
        const clone = tpl.content.cloneNode(true);
        clone.querySelector('.user-initial').textContent = r.userInitial || r.userName?.[0] || '?';
        clone.querySelector('.user-name').textContent = r.userName || 'Anonymous';
        clone.querySelector('.review-date').textContent = r.date || '';
        clone.querySelector('.review-stars').textContent = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        clone.querySelector('.review-comment').textContent = r.comment || '';
        list.appendChild(clone);
    });
}

function calcPrice() {
    const start = document.getElementById('book-start').value;
    const end = document.getElementById('book-end').value;
    const btnBook = document.getElementById('btn-book');
    const errEl = document.getElementById('calc-error');
    const breakEl = document.getElementById('calc-breakdown');
    
    if (!start || !end || !errEl || !breakEl) return;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const hours = (eh + em / 60) - (sh + sm / 60);

    if (hours <= 0) {
        errEl.classList.remove('hidden');
        breakEl.classList.add('hidden');
        if (btnBook) btnBook.disabled = true;
        return;
    }

    const subtotal = Math.ceil(hours) * currentSpot.price;
    const fee = Math.round(subtotal * 0.05);
    
    errEl.classList.add('hidden');
    breakEl.classList.remove('hidden');
    
    setText('val-duration', `${hours.toFixed(1)} hrs`);
    setText('val-subtotal', `$ ${subtotal.toLocaleString('es-CO')}`);
    setText('val-fee', `$ ${fee.toLocaleString('es-CO')}`);
    setText('val-total', `$ ${(subtotal + fee).toLocaleString('es-CO')}`);

    if (btnBook) btnBook.disabled = false;

    localStorage.setItem('parkly_booking', JSON.stringify({
        spotId: currentSpot.id,
        date: document.getElementById('book-date').value,
        startTime: start,
        endTime: end,
        hours: parseFloat(hours.toFixed(2)),
        subtotal, fee, total: subtotal + fee,
    }));
}

function goToBooking(e) {
    if (e) e.preventDefault();
    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (!session) {
        alert('You need to log in to book a spot.');
        window.location.href = 'login.html';
        return;
    }
    const booking = JSON.parse(localStorage.getItem('parkly_booking') || '{}');
    if (!booking.total) return alert('Please select a valid time range first.');
    window.location.href = `payment.html?id=${currentSpot.id}`;
}

function changeImage(index, btn) {
    currentImgIdx = index;
    const mainImg = document.getElementById('gallery-main-img');
    if (mainImg && currentSpot) {
        const images = (currentSpot.images && currentSpot.images.length) ? currentSpot.images : [currentSpot.image];
        mainImg.src = images[index];
    }
    document.querySelectorAll('#gallery-thumbs button').forEach((b, i) => {
        const active = i === index;
        b.setAttribute('aria-pressed', active);
        b.classList.toggle('border-primary', active);
        b.classList.toggle('border-transparent', !active);
        b.classList.toggle('opacity-50', !active);
    });
}

function openMapModal() {
    const modal = document.getElementById('map-modal');
    const iframe = document.getElementById('map-iframe');
    if (!modal || !iframe) return;
    setText('map-modal-title', currentSpot.name);
    modal.showModal();
    // En lugar de innerHTML, manipulamos el src del iframe
    iframe.src = `https://maps.google.com/maps?q=${currentSpot.lat},${currentSpot.lng}&z=16&output=embed`;
}

function closeMapModal() {
    document.getElementById('map-modal')?.close();
}

function calcAvgRating(p) {
    if (!p.reviews || p.reviews.length === 0) return p.rating || 0;
    return p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }