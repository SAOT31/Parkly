/**
 * ARCHIVO: js/search.js
 * DESCRIPCIÓN: Lógica de búsqueda actualizada para redirigir al detalle.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM
    const grid = document.getElementById('spots-grid');
    const counter = document.getElementById('spot-count');
    const searchInput = document.getElementById('nav-search-input');
    const searchBtn = document.getElementById('btn-execute-search');
    const filterBar = document.getElementById('filter-bar');
    const emptyState = document.getElementById('empty-state');

    // Cargar datos
    const allSpots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    let activeFilters = new Set();

    // 1. Verificar si hay búsqueda en la URL (desde el Owner Panel o Home)
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    if (urlQuery && searchInput) {
        searchInput.value = urlQuery;
    }

    // 2. Función de cálculo
    const calculateResults = () => {
        const query = searchInput ? searchInput.value.toLowerCase() : "";
        return allSpots.filter(spot => {
            const matchesText = spot.name.toLowerCase().includes(query) || 
                               spot.address.toLowerCase().includes(query);
            
            let matchesChips = true;
            activeFilters.forEach(f => {
                if (!spot[f]) matchesChips = false;
            });

            return matchesText && matchesChips;
        });
    };

    // 3. RENDERIZADO (Actualizado para el Link)
    function render() {
        const filtered = calculateResults();
        
        if (counter) counter.innerText = filtered.length;
        if (emptyState) emptyState.classList.toggle('hidden', filtered.length > 0);

        if (grid) {
            grid.innerHTML = filtered.map(spot => `
                <article onclick="window.location.href='detail.html?id=${spot.id}'" class="bg-card border border-border rounded-2xl overflow-hidden group hover:border-primary/40 transition-all cursor-pointer shadow-lg shadow-black/20">
                    <div class="relative h-52 overflow-hidden">
                        <img src="${spot.image}" alt="${spot.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                        
                        <div class="absolute top-3 left-3 flex gap-2">
                            ${spot.verified ? '<span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg"><i data-lucide="shield-check" class="w-3 h-3"></i> Verificado</span>' : ''}
                            <span class="${spot.available ? 'bg-green-600' : 'bg-red-600'} text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
                                <i data-lucide="${spot.available ? 'check-circle' : 'info'}" class="w-3 h-3"></i> ${spot.available ? 'Disponible' : 'Ocupado'}
                            </span>
                        </div>

                        <div class="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-white font-bold text-sm">
                            $ ${spot.price.toLocaleString()} <span class="text-[10px] text-slate-400 font-normal">/hora</span>
                        </div>
                    </div>

                    <div class="p-5">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-bold text-white text-lg">${spot.name}</h3>
                            <div class="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                                <i data-lucide="star" class="w-4 h-4 fill-current"></i> ${spot.rating}
                            </div>
                        </div>
                        <p class="text-sm text-slate-400 flex items-center gap-1.5 mb-5">
                            <i data-lucide="map-pin" class="w-4 h-4"></i> ${spot.address}
                        </p>
                        
                        <footer class="flex gap-4 text-slate-500 border-t border-border pt-4">
                            <i data-lucide="sun" class="w-4 h-4 ${spot.isIlluminated ? 'text-primary' : ''}" title="Iluminado"></i>
                            <i data-lucide="shield" class="w-4 h-4 ${spot.hasSecurity ? 'text-primary' : ''}" title="Seguro"></i>
                            <i data-lucide="zap" class="w-4 h-4 ${spot.evCharging ? 'text-primary' : ''}" title="Carga EV"></i>
                        </footer>
                    </div>
                </article>
            `).join('');
            lucide.createIcons();
        }
    }

    // Listeners
    if (searchBtn) searchBtn.addEventListener('click', render);
    if (searchInput) searchInput.addEventListener('input', render);
    
    if (filterBar) {
        filterBar.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-chip');
            if (!btn) return;
            const f = btn.getAttribute('data-filter');

            if (f === 'all') {
                activeFilters.clear();
                document.querySelectorAll('.filter-chip').forEach(b => {
                    b.classList.remove('active', 'border-primary', 'bg-primary/10', 'text-primary');
                    b.classList.add('bg-card', 'text-slate-400');
                });
                btn.classList.add('active', 'border-primary', 'bg-primary/10', 'text-primary');
            } else {
                // Toggle logic
                if (activeFilters.has(f)) {
                    activeFilters.delete(f);
                    btn.classList.remove('border-primary', 'text-primary');
                } else {
                    activeFilters.add(f);
                    btn.classList.add('border-primary', 'text-primary');
                }
            }
            render();
        });
    }

    // Inicializar
    render();
});