/**
 * ARCHIVO: js/search.js
 * DESCRIPCIÓN: Lógica de búsqueda con sidebar de filtros.
 * 100% conectado a la API de Node.js y TiDB Cloud.
 *
 */

// ── Estado de los Filtros ───────────────────────────────────────────
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

// Variable global para guardar los datos reales de TiDB Cloud
let globalSpots = []; 

document.addEventListener('DOMContentLoaded', async () => {

    // ── 1. Navbar: Usuario y Logout ─────────────────────────────────
    const session = JSON.parse(localStorage.getItem('parkly_session'));
    if (session) {
        const navUser = document.getElementById('nav-username');
        const navRole = document.getElementById('nav-role');
        if (navUser) navUser.textContent = session.name || session.email;
        if (navRole) navRole.textContent = session.role || 'Driver';
    }

    // Lógica de Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('parkly_session');
        window.location.href = 'login.html';
    });

    // ── 2. Carga de datos desde el Servidor (API) ───────────────────
    try {
        // Llamada real a tu backend de Node.js
        const response = await fetch('/api/spots');
        if (!response.ok) throw new Error('Failed to fetch data from server');
        
        globalSpots = await response.json(); 
        console.log(`Database Sync: ${globalSpots.length} spots loaded successfully.`);
        
        // Poblar el selector de zonas dinámicamente con datos de la DB
        const zoneSelect = document.getElementById('zone-filter');
        const zones = [...new Set(globalSpots.map(s => s.zone).filter(Boolean))].sort();
        
        zones.forEach(z => {
            const opt = document.createElement('option');
            opt.value = z;
            opt.textContent = z;
            zoneSelect?.appendChild(opt);
        });

        // Renderizado inicial
        renderParkings();
    } catch (error) {
        console.error("Critical Error: Search engine could not connect to API.", error);
        // Alerta al usuario en inglés
        alert("The parking data could not be loaded. Please check your connection.");
    }

    // ── 3. Gestión de URL ───────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    const searchInput = document.getElementById('search-input');
    if (urlQuery && searchInput) {
        searchInput.value = urlQuery;
        renderParkings();
    }

    // ── 4. Event Listeners de Filtros ───────────────────────────────
    searchInput?.addEventListener('input', renderParkings);
    
    document.getElementById('zone-filter')?.addEventListener('change', () => {
        filters.zone = document.getElementById('zone-filter').value;
        renderParkings();
    });
    
    document.getElementById('price-slider')?.addEventListener('input', updatePriceLabel);
    
    document.getElementById('clear-all-btn')?.addEventListener('click', resetAll);
    document.getElementById('reset-btn')?.addEventListener('click', resetAll);
    document.getElementById('empty-reset-btn')?.addEventListener('click', resetAll);

    document.querySelectorAll('[data-sort]').forEach(btn => {
        btn.addEventListener('click', () => {
            setSortBy(btn, btn.dataset.sort);
        });
    });

    document.querySelectorAll('[data-toggle]').forEach(el => {
        el.addEventListener('click', () => {
            toggleFilter(el.dataset.toggle);
        });
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFilter(el.dataset.toggle);
            }
        });
    });
});

// ── Renderizar cards (DOM Puro) ─────────────────────────────────────────────────
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

        // Navegación al detalle del parqueadero
        article.addEventListener('click', () => {
            window.location.href = `detail.html?id=${spot.id}`;
        });

        // Imagen y manejo de errores de carga
        const img = clone.querySelector('[data-field="image"]');
        img.src = spot.image || 'img/placeholder.jpg';
        img.alt = spot.name;
        
        img.onerror = () => { img.src = 'img/placeholder.jpg'; };

        // Lógica de Badges (Verified y Availability)
        const badgeVerified = clone.querySelector('[data-field="badge-verified"]');
        if (spot.verified) badgeVerified.classList.replace('hidden', 'flex');

        const badgeStatus = clone.querySelector('[data-field="badge-status"]');
        const badgeLabel  = clone.querySelector('[data-field="badge-label"]');
        
        if (spot.available !== false) {
            badgeStatus.classList.add('bg-green-600');
            badgeLabel.textContent = 'Available';
        } else {
            badgeStatus.classList.add('bg-red-600');
            badgeLabel.textContent = 'Occupied';
        }

        // Mapeo de datos (price y rating desde la DB)
        clone.querySelector('[data-field="price"]').textContent   = Number(spot.price).toLocaleString('es-CO');
        clone.querySelector('[data-field="name"]').textContent    = spot.name;
        clone.querySelector('[data-field="rating"]').textContent  = spot.rating || '5.0';
        clone.querySelector('[data-field="address"]').textContent = spot.address;
        clone.querySelector('[data-field="zone"]').textContent    = spot.zone || '';

        // Iconos de características dinámicos (Flexbox/Grid visual)
        ['isIlluminated', 'hasSecurity', 'evCharging', 'is24h'].forEach(f => {
            const icon = clone.querySelector(`[data-feat="${f}"]`);
            if (icon) {
                if (spot[f]) {
                    icon.classList.remove('text-slate-600');
                    icon.classList.add('text-primary');
                } else {
                    icon.classList.add('text-slate-600');
                    icon.classList.remove('text-primary');
                }
            }
        });

        grid.appendChild(clone);
    });

    if (window.lucide) lucide.createIcons();
    updateFilterCount();
}

// ── Lógica de filtrado y ordenamiento ────────────────────────────────────────────────
function getFilteredParkings() {
    const searchEl = document.getElementById('search-input');
    const query = searchEl ? searchEl.value.toLowerCase().trim() : '';

    let spots = globalSpots.filter(spot => {
        // Búsqueda por texto (Nombre, Dirección o Zona)
        if (query && !(
            spot.name.toLowerCase().includes(query) ||
            spot.address.toLowerCase().includes(query) ||
            (spot.zone && spot.zone.toLowerCase().includes(query))
        )) return false;

        // Filtros laterales
        if (filters.zone          && spot.zone     !== filters.zone)      return false;
        if (filters.priceMax < 20000 && spot.price >   filters.priceMax)  return false;
        if (filters.verified      && !spot.verified)                      return false;
        if (filters.available     && spot.available === false)            return false;
        if (filters.is24h         && !spot.is24h)                         return false;
        if (filters.evCharging    && !spot.evCharging)                    return false;
        if (filters.hasSecurity   && !spot.hasSecurity)                   return false;
        if (filters.isIlluminated && !spot.isIlluminated)                 return false;

        return true;
    });

    // Lógica de ordenamiento
    if (filters.sortBy === 'price') {
        spots.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'rating') {
        spots.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
        spots.sort((a, b) => a.name.localeCompare(b.name));
    }

    return spots;
}

// ── Helpers de UI y Reseteo ────────────────────────────────────────────────────
function setSortBy(el, val) {
    filters.sortBy = val;
    document.querySelectorAll('.sort-opt').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
    });
    el.classList.add('active');
    el.setAttribute('aria-checked', 'true');
    renderParkings();
}

function updatePriceLabel() {
    const slider = document.getElementById('price-slider');
    const val = parseInt(slider.value);
    filters.priceMax = val;
    
    const label = document.getElementById('price-label');
    if (label) label.textContent = val >= 20000 ? 'Any' : `$${val.toLocaleString('es-CO')}`;
    
    renderParkings();
}

function toggleFilter(key) {
    filters[key] = !filters[key];
    const track = document.getElementById('toggle-' + key);
    if (track) {
        track.classList.toggle('on', filters[key]);
        track.setAttribute('aria-checked', filters[key] ? 'true' : 'false');
    }
    renderParkings();
}

function updateFilterCount() {
    const active = [
        filters.zone, filters.priceMax < 20000, filters.verified,
        filters.available, filters.is24h, filters.evCharging,
        filters.hasSecurity, filters.isIlluminated
    ].filter(Boolean).length;

    const badge = document.getElementById('filter-count');
    const clearTop = document.getElementById('clear-all-btn');

    if (badge) {
        badge.textContent = active;
        badge.classList.toggle('hidden', active === 0);
        badge.classList.toggle('flex',   active > 0);
    }
    if (clearTop) clearTop.classList.toggle('hidden', active === 0);
}

function resetAll() {
    // Resetear el objeto de estado
    Object.assign(filters, {
        sortBy: 'name', zone: '', priceMax: 20000,
        verified: false, available: false, is24h: false,
        evCharging: false, hasSecurity: false, isIlluminated: false,
    });

    // Resetear inputs del DOM
    const searchEl = document.getElementById('search-input');
    if (searchEl) searchEl.value = '';
    const zoneFilter = document.getElementById('zone-filter');
    if (zoneFilter) zoneFilter.value  = '';
    const priceSlider = document.getElementById('price-slider');
    if (priceSlider) priceSlider.value = 20000;
    const priceLabel = document.getElementById('price-label');
    if (priceLabel) priceLabel.textContent = 'Any';

    // Resetear visualmente los toggles
    ['verified','available','is24h','evCharging','hasSecurity','isIlluminated'].forEach(k => {
        const t = document.getElementById('toggle-' + k);
        if (t) { t.classList.remove('on'); t.setAttribute('aria-checked', 'false'); }
    });

    renderParkings();
}