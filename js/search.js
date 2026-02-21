/**
 * ARCHIVO: js/search.js
 * DESCRIPCIÓN: Lógica de búsqueda con sidebar de filtros.
 * Todo el HTML vive en search.html — este archivo solo llena datos y maneja eventos.
 */

// ── Estado ───────────────────────────────────────────────────────────
const filters = {
    sortBy:        'name',
    zone:          '',
    priceMax:      20000,
    verified:      false,
    available:     false,
    is24h:         false,
    evCharging:    false,
    hasSecurity:   false,
    isIlluminated: false,
};

document.addEventListener('DOMContentLoaded', () => {

    // ── Navbar usuario ───────────────────────────────────────────────
    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (session) {
        const navUser = document.getElementById('nav-username');
        const navRole = document.getElementById('nav-role');
        if (navUser) navUser.textContent = session.name || session.email;
        if (navRole) navRole.textContent = session.role || 'Driver';
    }

    // ── Poblar zonas ─────────────────────────────────────────────────
    const allSpots  = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    const zoneSelect = document.getElementById('zone-filter');
    const zones = [...new Set(allSpots.map(s => s.zone).filter(Boolean))].sort();
    zones.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z;
        opt.textContent = z;
        zoneSelect.appendChild(opt);
    });

    // ── Query desde URL ──────────────────────────────────────────────
    const params     = new URLSearchParams(window.location.search);
    const urlQuery   = params.get('q');
    const searchInput = document.getElementById('search-input');
    if (urlQuery && searchInput) searchInput.value = urlQuery;

    // ── Event listeners — sin onclick en HTML ────────────────────────
    searchInput?.addEventListener('input', renderParkings);
    zoneSelect.addEventListener('change', filterParkings);
    document.getElementById('price-slider').addEventListener('input', updatePriceLabel);
    document.getElementById('clear-all-btn').addEventListener('click', resetAll);
    document.getElementById('reset-btn').addEventListener('click', resetAll);
    document.getElementById('empty-reset-btn').addEventListener('click', resetAll);

    document.querySelectorAll('[data-sort]').forEach(btn => {
        btn.addEventListener('click', () => setSortBy(btn, btn.dataset.sort));
    });

    document.querySelectorAll('[data-toggle]').forEach(el => {
        // Clic en el track del toggle
        el.addEventListener('click',   () => toggleFilter(el.dataset.toggle));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleFilter(el.dataset.toggle); });

        // Clic en cualquier parte del <label> padre también activa el toggle
        const parentLabel = el.closest('label');
        if (parentLabel) {
            parentLabel.addEventListener('click', e => {
                // Evitar doble disparo si el clic fue directo sobre el track
                if (!el.contains(e.target)) toggleFilter(el.dataset.toggle);
            });
        }
    });

    renderParkings();
});

// ── Renderizar cards ─────────────────────────────────────────────────
function renderParkings() {
    const grid       = document.getElementById('spots-grid');
    const counter    = document.getElementById('spot-count');
    const emptyState = document.getElementById('empty-state');
    const spots      = getFilteredParkings();
    const tpl        = document.getElementById('spot-card-tpl');

    if (counter) counter.textContent = spots.length;
    if (emptyState) emptyState.classList.toggle('hidden', spots.length > 0);
    if (!grid || !tpl) return;

    grid.innerHTML = '';

    spots.forEach(spot => {
        const clone = tpl.content.cloneNode(true);
        const article = clone.querySelector('article');

        // Navegar al detalle al hacer click
        article.addEventListener('click', () => {
            window.location.href = `detail.html?id=${spot.id}`;
        });

        // Imagen
        const img = clone.querySelector('[data-field="image"]');
        img.src = spot.image || '';
        img.alt = spot.name;
        img.onerror = () => {
            img.parentElement.innerHTML = '<div class="w-full h-full bg-slate-800 flex items-center justify-center text-5xl">🅿️</div>';
        };

        // Badge verified
        const badgeVerified = clone.querySelector('[data-field="badge-verified"]');
        if (spot.verified) badgeVerified.classList.replace('hidden', 'flex');

        // Badge disponibilidad
        const badgeStatus = clone.querySelector('[data-field="badge-status"]');
        const badgeIcon   = clone.querySelector('[data-field="badge-icon"]');
        const badgeLabel  = clone.querySelector('[data-field="badge-label"]');
        if (spot.available) {
            badgeStatus.classList.add('bg-green-600');
            badgeIcon.setAttribute('data-lucide', 'check-circle');
            badgeLabel.textContent = 'Available';
        } else {
            badgeStatus.classList.add('bg-red-600');
            badgeIcon.setAttribute('data-lucide', 'x-circle');
            badgeLabel.textContent = 'Occupied';
        }

        // Precio, nombre, rating, dirección
        clone.querySelector('[data-field="price"]').textContent   = spot.price.toLocaleString('es-CO');
        clone.querySelector('[data-field="name"]').textContent    = spot.name;
        clone.querySelector('[data-field="rating"]').textContent  = spot.rating;
        clone.querySelector('[data-field="address"]').textContent = spot.address;
        clone.querySelector('[data-field="zone"]').textContent    = spot.zone || '';

        // Feature icons — primary si activo, slate si no
        clone.querySelectorAll('[data-feat]').forEach(icon => {
            const key = icon.dataset.feat;
            icon.classList.add(spot[key] ? 'text-primary' : 'text-slate-600');
        });

        grid.appendChild(clone);
    });

    lucide.createIcons();
    updateFilterCount();
}

// ── Filtrar y ordenar ────────────────────────────────────────────────
function getFilteredParkings() {
    const allSpots   = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    const searchEl   = document.getElementById('search-input');
    const query      = searchEl ? searchEl.value.toLowerCase().trim() : '';

    let spots = allSpots.filter(spot => {
        if (query && !(
            spot.name.toLowerCase().includes(query) ||
            spot.address.toLowerCase().includes(query) ||
            (spot.zone && spot.zone.toLowerCase().includes(query))
        )) return false;

        if (filters.zone          && spot.zone         !== filters.zone)      return false;
        if (filters.priceMax < 20000 && spot.price     >  filters.priceMax)  return false;
        if (filters.verified      && !spot.verified)                           return false;
        if (filters.available     && !spot.available)                          return false;
        if (filters.is24h         && !spot.is24h)                              return false;
        if (filters.evCharging    && !spot.evCharging)                         return false;
        if (filters.hasSecurity   && !spot.hasSecurity)                        return false;
        if (filters.isIlluminated && !spot.isIlluminated)                      return false;

        return true;
    });

    if (filters.sortBy === 'price')       spots.sort((a, b) => a.price - b.price);
    else if (filters.sortBy === 'rating') spots.sort((a, b) => b.rating - a.rating);
    else                                  spots.sort((a, b) => a.name.localeCompare(b.name));

    return spots;
}

// ── Helpers de UI ────────────────────────────────────────────────────
function filterParkings() {
    filters.zone = document.getElementById('zone-filter').value;
    renderParkings();
}

function setSortBy(el, val) {
    filters.sortBy = val;
    document.querySelectorAll('.sort-opt').forEach(s => {
        s.classList.remove('active');
        s.setAttribute('aria-checked', 'false');
    });
    el.classList.add('active');
    el.setAttribute('aria-checked', 'true');
    renderParkings();
}

function updatePriceLabel() {
    const val   = parseInt(document.getElementById('price-slider').value);
    filters.priceMax = val;
    const label = document.getElementById('price-label');
    if (label) label.textContent = val >= 20000 ? 'Any' : val.toLocaleString('es-CO');
    renderParkings();
}

function toggleFilter(key) {
    filters[key] = !filters[key];
    const track = document.getElementById('toggle-' + key);
    if (track) {
        track.classList.toggle('on', filters[key]);
        track.setAttribute('aria-checked', filters[key]);
    }
    renderParkings();
}

function updateFilterCount() {
    const active = [
        filters.zone,
        filters.priceMax < 20000,
        filters.verified,
        filters.available,
        filters.is24h,
        filters.evCharging,
        filters.hasSecurity,
        filters.isIlluminated,
    ].filter(Boolean).length;

    const badge    = document.getElementById('filter-count');
    const clearTop = document.getElementById('clear-all-btn');

    if (badge) {
        badge.textContent = active;
        badge.classList.toggle('hidden', active === 0);
        badge.classList.toggle('flex',   active > 0);
    }
    if (clearTop) clearTop.classList.toggle('hidden', active === 0);
}

function resetAll() {
    Object.assign(filters, {
        sortBy: 'name', zone: '', priceMax: 20000,
        verified: false, available: false, is24h: false,
        evCharging: false, hasSecurity: false, isIlluminated: false,
    });

    const searchEl = document.getElementById('search-input');
    if (searchEl) searchEl.value = '';

    document.getElementById('zone-filter').value  = '';
    document.getElementById('price-slider').value = 20000;
    document.getElementById('price-label').textContent = 'Any';

    ['verified','available','is24h','evCharging','hasSecurity','isIlluminated'].forEach(k => {
        const t = document.getElementById('toggle-' + k);
        if (t) { t.classList.remove('on'); t.setAttribute('aria-checked', 'false'); }
    });

    document.querySelectorAll('.sort-opt').forEach((el, i) => {
        el.classList.toggle('active', i === 0);
        el.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    });

    renderParkings();
}