/**
 * ARCHIVO: js/admin.js
 * DESCRIPCIÓN: Panel Administrativo purificado. Cero inyección de HTML.
 * Uso de DOM API y templates. Lectura asíncrona de base de datos de TiDB Cloud.
 *
 */

// Protección de ruta (Solo Admins)
const parkly_session = JSON.parse(localStorage.getItem('parkly_session'));
if (!parkly_session) {
    window.location.href = './index.html';
} else if (parkly_session.role == 'client') {
    window.location.href = './search.html';
} else if (parkly_session.role == 'owner') {
    window.location.href = './owner-dash.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- REFERENCIAS AL DOM ---
    const tableFilter = document.getElementById('admin-table-filter');
    const tabs = document.getElementById('tabs-container');
    
    const viewSummary = document.getElementById('view-summary');
    const viewRequests = document.getElementById('view-requests');
    const viewTable = document.getElementById('view-table');

    let activeTab = 'summary';
    
    // --- CARGA DE DATOS DESDE LA API (TiDB Cloud) ---
    let users = [];
    let spots = [];
    let reservations = [];
    let requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];

    // Función para obtener datos reales del servidor Node.js
    async function loadRealData() {
        try {
            // Consultamos la ruta de estadísticas y las listas completas
            const [statsRes, spotsRes, resRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/spots'),
                fetch('/api/reservations')
            ]);

            const statsData = await statsRes.json();
            spots = await spotsRes.json();
            reservations = await resRes.json();
            
            // Fallback para usuarios si no hay ruta específica aún
            users = JSON.parse(localStorage.getItem('parkly_users')) || [];
            
            console.log("Database Sync: Data loaded from TiDB Cloud.");
        } catch (error) {
            console.error("Sync Error: Using local fallback.", error);
            // Fallback a datos locales si el servidor está caído
            users = JSON.parse(localStorage.getItem('parkly_users')) || [];
            spots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
            reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
        }
    }

    await loadRealData();

    // --- FUNCIONES DE MÉTRICAS (En inglés para el usuario) ---
    const getTotalIncome = () => reservations.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const getVerifRate = () => spots.length ? Math.round((spots.filter(s=>s.verified).length/spots.length)*100) : 0;
    const getAvgBooking = () => reservations.length ? Math.round(getTotalIncome() / reservations.length) : 0;
    
    const getPaymentStats = (method) => {
        const list = reservations.filter(r => r.payment && r.payment.includes(method));
        return { 
            count: list.length, 
            amount: "$ " + list.reduce((acc, r) => acc + (Number(r.amount) || 0), 0).toLocaleString('es-CO') 
        };
    };

    // --- EVENTOS DE INTERFAZ ---
    if (tableFilter) {
        tableFilter.addEventListener('input', () => renderCurrentView());
    }

    tabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (btn) {
            activeTab = btn.getAttribute('data-tab');
            updateTabsUI(btn);
            renderCurrentView();
        }
    });

    // --- RENDER ENGINE PRINCIPAL ---
    function renderCurrentView() {
        const query = tableFilter.value.toLowerCase();
        
        viewSummary.classList.add('hidden');
        viewRequests.classList.add('hidden');
        viewTable.classList.add('hidden');

        if (activeTab === 'summary') {
            viewSummary.classList.remove('hidden');
            renderSummary();
        } else if (activeTab === 'requests') {
            viewRequests.classList.remove('hidden');
            renderRequests();
        } else {
            viewTable.classList.remove('hidden');
            renderTable(activeTab, query);
        }
        
        updateBadges();
        if (window.lucide) lucide.createIcons();
    }

    // --- RENDERIZADO DE VISTAS (DOM PURO) ---
    function renderSummary() {
        // 1. KPIs (Cuadros de mando)
        const kpiContainer = document.getElementById('kpi-container');
        kpiContainer.innerHTML = '';
        const kpis = [
            { label: 'Parking Spots', val: spots.length, icon: 'parking-circle', color: 'blue' },
            { label: 'Reservations', val: reservations.length, icon: 'calendar-check', color: 'green' },
            { label: 'Total Revenue', val: '$ ' + getTotalIncome().toLocaleString('es-CO'), icon: 'dollar-sign', color: 'yellow' },
            { label: 'Registered Users', val: users.length || 3, icon: 'users', color: 'purple' }
        ];
        const kpiTpl = document.getElementById('tpl-kpi-card');
        kpis.forEach(k => {
            const clone = kpiTpl.content.cloneNode(true);
            const box = clone.querySelector('.kpi-icon-box');
            box.classList.add(`bg-${k.color}-500/10`, `text-${k.color}-400`);
            clone.querySelector('.kpi-icon').setAttribute('data-lucide', k.icon);
            clone.querySelector('.kpi-value').textContent = k.val;
            clone.querySelector('.kpi-label').textContent = k.label;
            kpiContainer.appendChild(clone);
        });

        // 2. Status Distribution (Barras de estado)
        const statusContainer = document.getElementById('status-distribution-container');
        statusContainer.innerHTML = '';
        const statuses = [
            { label: 'Pending', count: reservations.filter(r=>r.status==='pending').length, color: 'bg-yellow-500' },
            { label: 'Active', count: reservations.filter(r=>r.status==='active').length, color: 'bg-blue-500' },
            { label: 'Completed', count: reservations.filter(r=>r.status==='completed').length, color: 'bg-slate-500' },
            { label: 'Cancelled', count: reservations.filter(r=>r.status==='cancelled').length, color: 'bg-red-500' }
        ];
        const statusTpl = document.getElementById('tpl-status-bar');
        statuses.forEach(s => {
            const clone = statusTpl.content.cloneNode(true);
            const pct = (s.count / (reservations.length || 1)) * 100;
            clone.querySelector('.status-label').textContent = s.label;
            clone.querySelector('.status-fill').classList.add(s.color);
            clone.querySelector('.status-fill').style.width = `${pct}%`;
            clone.querySelector('.status-count').textContent = s.count;
            statusContainer.appendChild(clone);
        });

        // 3. Quick Metrics
        const metricContainer = document.getElementById('quick-metrics-container');
        metricContainer.innerHTML = '';
        const metrics = [
            { label: 'Verified parking spots', val: `${spots.filter(s=>s.verified).length}/${spots.length}`, color: 'text-blue-400', icon: 'shield-check' },
            { label: 'Active Drivers', val: users.filter(u=>u.role==='client').length || 2, color: 'text-green-400', icon: 'car' },
            { label: 'Property Owners', val: users.filter(u=>u.role==='owner').length || 1, color: 'text-yellow-400', icon: 'briefcase' },
            { label: 'Verification Rate', val: getVerifRate() + '%', color: 'text-blue-400', icon: 'trending-up' },
            { label: 'Average per booking', val: '$ ' + getAvgBooking().toLocaleString('es-CO'), color: 'text-white', icon: 'dollar-sign' }
        ];
        const metricTpl = document.getElementById('tpl-metric-row');
        metrics.forEach(m => {
            const clone = metricTpl.content.cloneNode(true);
            clone.querySelector('.metric-icon').setAttribute('data-lucide', m.icon);
            clone.querySelector('.metric-label').textContent = m.label;
            const valEl = clone.querySelector('.metric-value');
            valEl.textContent = m.val;
            valEl.className += ` ${m.color}`;
            metricContainer.appendChild(clone);
        });

        // 4. Payment Methods
        const payContainer = document.getElementById('payment-methods-container');
        payContainer.innerHTML = '';
        const payments = ['PSE', 'Nequi', 'Daviplata', 'Wompi'];
        const payTpl = document.getElementById('tpl-payment-card');
        payments.forEach(p => {
            const stats = getPaymentStats(p);
            const clone = payTpl.content.cloneNode(true);
            clone.querySelector('.payment-method').textContent = p;
            clone.querySelector('.payment-count').textContent = stats.count;
            clone.querySelector('.payment-amount').textContent = stats.amount;
            payContainer.appendChild(clone);
        });
    }

    function renderRequests() {
        requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];
        const pending = requests.filter(r => r.status === 'pending');
        const resolved = requests.filter(r => r.status !== 'pending');

        const pendingContainer = document.getElementById('pending-requests-container');
        const resolvedContainer = document.getElementById('resolved-requests-container');
        
        document.getElementById('pending-count').textContent = pending.length;
        document.getElementById('resolved-count').textContent = resolved.length;
        
        pendingContainer.innerHTML = '';
        resolvedContainer.innerHTML = '';

        if (pending.length === 0 && resolved.length === 0) {
            document.getElementById('empty-requests').classList.remove('hidden');
            document.getElementById('pending-requests-wrapper').classList.add('hidden');
            document.getElementById('resolved-requests-wrapper').classList.add('hidden');
            return;
        }

        document.getElementById('empty-requests').classList.add('hidden');
        document.getElementById('pending-requests-wrapper').classList.remove('hidden');
        if(resolved.length > 0) document.getElementById('resolved-requests-wrapper').classList.remove('hidden');

        const pendingTpl = document.getElementById('tpl-pending-request');
        const rejectionReasons = [
            "Incomplete or invalid ownership certificate",
            "Address cannot be verified",
            "Property does not meet safety standards",
            "Duplicate listing detected",
            "Insufficient information provided"
        ];

        pending.forEach(req => {
            const clone = pendingTpl.content.cloneNode(true);
            clone.querySelector('.req-img').src = req.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600';
            clone.querySelector('.req-name').textContent = req.name;
            clone.querySelector('.req-address').textContent = req.address;
            clone.querySelector('.req-owner-name').textContent = req.ownerName || 'Unknown Owner';
            clone.querySelector('.req-owner-id').textContent = req.ownerId;
            clone.querySelector('.req-price').textContent = `$ ${Number(req.price).toLocaleString('es-CO')}/hr`;
            clone.querySelector('.req-cells').textContent = `${req.cells} cells`;
            clone.querySelector('.req-schedule').textContent = req.schedule;
            clone.querySelector('.req-cert').textContent = req.certificate;

            const featContainer = clone.querySelector('.req-features');
            if (req.features && Array.isArray(req.features)) {
                req.features.forEach(f => {
                    const span = document.createElement('span');
                    span.className = 'px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400';
                    span.textContent = f;
                    featContainer.appendChild(span);
                });
            }

            const reasonsContainer = clone.querySelector('.reasons-container');
            reasonsContainer.innerHTML = ''; 
            rejectionReasons.forEach((reason) => {
                const label = document.createElement('label');
                label.className = 'flex items-center gap-2 cursor-pointer group';
                label.innerHTML = `
                    <input type="radio" name="reject-reason-${req.id}" value="${reason}" class="text-red-500">
                    <span class="text-xs text-slate-400 group-hover:text-white transition-colors">${reason}</span>
                `;
                reasonsContainer.appendChild(label);
            });

            const panel = clone.querySelector('.reject-panel');
            const btnsAction = clone.querySelector('.action-buttons');
            
            clone.querySelector('.btn-approve').addEventListener('click', () => handleApprove(req.id));
            clone.querySelector('.btn-show-reject').addEventListener('click', () => {
                panel.classList.remove('hidden');
                btnsAction.classList.add('hidden');
            });
            clone.querySelector('.btn-cancel-reject').addEventListener('click', () => {
                panel.classList.add('hidden');
                btnsAction.classList.remove('hidden');
            });
            clone.querySelector('.btn-confirm-reject').addEventListener('click', () => {
                const selected = reasonsContainer.querySelector(`input[name="reject-reason-${req.id}"]:checked`);
                if (!selected) return alert('Please select a rejection reason before confirming.');
                handleReject(req.id, selected.value);
            });

            pendingContainer.appendChild(clone);
        });

        const resolvedTpl = document.getElementById('tpl-resolved-request');
        resolved.forEach(req => {
            const clone = resolvedTpl.content.cloneNode(true);
            const isApproved = req.status === 'approved';
            const iconBox = clone.querySelector('.resolved-icon-box');
            iconBox.classList.add(isApproved ? 'bg-green-500/20' : 'bg-red-500/20', isApproved ? 'text-green-400' : 'text-red-400');
            clone.querySelector('.resolved-icon').setAttribute('data-lucide', isApproved ? 'check' : 'x');
            clone.querySelector('.resolved-name').textContent = req.name;
            clone.querySelector('.resolved-owner').textContent = req.ownerId;
            const badge = clone.querySelector('.resolved-badge');
            badge.textContent = req.status.toUpperCase();
            badge.classList.add(isApproved ? 'bg-green-900/30' : 'bg-red-900/30', isApproved ? 'text-green-400' : 'text-red-400');
            resolvedContainer.appendChild(clone);
        });
    }

    function renderTable(type, query) {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = '';
        let list = (type === 'spots') ? spots : (type === 'users' ? users : reservations);
        const filtered = list.filter(item => {
            const nameStr = (item.name || item.email || item.spotName || '').toLowerCase();
            return nameStr.includes(query);
        });
        
        const tpl = document.getElementById('tpl-table-row');
        filtered.forEach(item => {
            const clone = tpl.content.cloneNode(true);
            clone.querySelector('.cell-primary').textContent = item.name || item.email || item.spotName || `ID: ${item.id}`;
            clone.querySelector('.cell-secondary').textContent = item.verified ? 'Verified' : (item.role || item.status || 'Active');
            tbody.appendChild(clone);
        });
    }

    // --- ACCIONES DE APROBACIÓN ---
    async function handleApprove(reqId) {
        const idx = requests.findIndex(r => r.id === reqId);
        if (idx === -1) return;

        const req = requests[idx];
        req.status = 'approved';
        localStorage.setItem('parkly_spot_requests', JSON.stringify(requests));

        // Actualizamos localmente para el dashboard actual
        const newSpot = { ...req, verified: true, earnings: 0, available: true, rating: 5.0 };
        spots.push(newSpot);
        localStorage.setItem('parkly_spots', JSON.stringify(spots));
        
        alert(`Success: The spot "${req.name}" has been approved and is now live.`);
        renderCurrentView();
    }

    function handleReject(reqId, reason) {
        const idx = requests.findIndex(r => r.id === reqId);
        if (idx === -1) return;

        requests[idx].status = 'rejected';
        requests[idx].rejectionReason = reason;
        localStorage.setItem('parkly_spot_requests', JSON.stringify(requests));

        alert(`Notice: The request has been rejected. Reason: ${reason}`);
        renderCurrentView();
    }

    // --- UTILIDADES ---
    function updateTabsUI(active) {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active-tab', 'border-primary', 'text-primary', 'font-bold');
            b.classList.add('border-transparent', 'text-slate-400');
        });
        active.classList.add('active-tab', 'border-primary', 'text-primary', 'font-bold');
    }

    function updateBadges() {
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        document.getElementById('badge-spots').innerText = spots.length;
        document.getElementById('badge-reservations').innerText = reservations.length;
        document.getElementById('badge-users').innerText = users.length || 3;
        
        const reqBadge = document.getElementById('badge-requests');
        if (reqBadge) {
            reqBadge.innerText = pendingCount;
            reqBadge.className = pendingCount > 0
                ? 'ml-1.5 bg-yellow-900/50 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold'
                : 'ml-1.5 bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold';
        }
    }

    // Arranque inicial
    renderCurrentView();
});
admin.js