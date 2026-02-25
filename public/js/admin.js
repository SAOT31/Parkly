/**
 * ARCHIVO: js/admin.js
 * DESCRIPCIÓN: Panel Administrativo purificado. Cero inyección de HTML.
 * Uso de DOM API y templates. Lectura asíncrona de base de datos.
 */

// Protección de ruta
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
    
    // --- CARGA DE DATOS DESDE DB (con fallback a local si es necesario) ---
    let users = JSON.parse(localStorage.getItem('parkly_users')) || [];
    let spots = typeof DB !== 'undefined' && DB.getSpots ? await DB.getSpots() : (JSON.parse(localStorage.getItem('parkly_spots')) || []);
    let reservations = typeof DB !== 'undefined' && DB.getReservations ? await DB.getReservations() : (JSON.parse(localStorage.getItem('parkly_reservations')) || []);
    let requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];

    // --- FUNCIONES DE MÉTRICAS ---
    const getTotalIncome = () => reservations.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const getVerifRate = () => spots.length ? Math.round((spots.filter(s=>s.verified).length/spots.length)*100) : 0;
    const getAvgBooking = () => reservations.length ? Math.round(getTotalIncome() / reservations.length) : 0;
    const getPaymentStats = (method) => {
        const list = reservations.filter(r => r.payment && r.payment.includes(method));
        return { count: list.length, amount: "$ " + list.reduce((acc, r) => acc + (Number(r.amount) || 0), 0).toLocaleString('es-CO') };
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
        // 1. KPIs
        const kpiContainer = document.getElementById('kpi-container');
        kpiContainer.innerHTML = '';
        const kpis = [
            { label: 'Parking Spots', val: spots.length, icon: 'parking-circle', color: 'blue' },
            { label: 'Reservations', val: reservations.length, icon: 'calendar-check', color: 'green' },
            { label: 'Total Revenue', val: '$ ' + getTotalIncome().toLocaleString('es-CO'), icon: 'dollar-sign', color: 'yellow' },
            { label: 'Registered Users', val: users.length, icon: 'users', color: 'purple' }
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

        // 2. Status Distribution
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
            { label: 'Active Drivers', val: users.filter(u=>u.role==='client').length, color: 'text-green-400', icon: 'car' },
            { label: 'Property Owners', val: users.filter(u=>u.role==='owner').length, color: 'text-yellow-400', icon: 'briefcase' },
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
        const payments = ['PSE', 'Nequi', 'Daviplata', 'Wompi']; // Wompi es el general actual
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
        // Actualizamos desde local storage por seguridad (o desde BD si tienes endpoint)
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
        else document.getElementById('resolved-requests-wrapper').classList.add('hidden');

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
            clone.querySelector('.req-owner-name').textContent = req.ownerName;
            clone.querySelector('.req-owner-id').textContent = req.ownerId;
            clone.querySelector('.req-price').textContent = `$ ${Number(req.price).toLocaleString('es-CO')}/hr`;
            clone.querySelector('.req-cells').textContent = `${req.cells} cell(s)`;
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

            // Llenar razones de rechazo dinámicamente sin innerHTML
            const reasonsContainer = clone.querySelector('.reasons-container');
            rejectionReasons.forEach((reason, i) => {
                const label = document.createElement('label');
                label.className = 'flex items-center gap-2 cursor-pointer group';
                
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `reject-reason-${req.id}`;
                radio.value = reason;
                radio.className = 'text-red-500';
                
                const span = document.createElement('span');
                span.className = 'text-xs text-slate-400 group-hover:text-white transition-colors';
                span.textContent = reason;

                label.appendChild(radio);
                label.appendChild(span);
                reasonsContainer.appendChild(label);
            });

            // Event Listeners para botones de acción (Evitando onclick)
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
                if (!selected) return alert('Please select a rejection reason.');
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
            badge.textContent = req.status;
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
        requests[idx] = req;
        localStorage.setItem('parkly_spot_requests', JSON.stringify(requests));

        // Preparar para DB real (spots)
        const newSpot = {
            id: req.id,
            ownerId: req.ownerId,
            name: req.name,
            address: req.address,
            price: req.price,
            cells: req.cells,
            schedule: req.schedule,
            features: req.features,
            verified: true,
            certificate: req.certificate,
            earnings: 0,
            available: true,
            rating: 0,
            image: req.image
        };

        spots.push(newSpot);
        localStorage.setItem('parkly_spots', JSON.stringify(spots));
        
        // Simular guardado real en base de datos si el backend lo permite
        if(typeof DB !== 'undefined' && DB.saveSpotRequest) {
            // Nota: Un backend real movería de pending a approved internamente, 
            // aquí mantenemos sincronía visual y local.
        }

        sendOwnerNotification(req.ownerId, req.id, req.name, 'approved', 'Your spot has been approved and is now live on PARKLY!', null);
        renderCurrentView();
    }

    function handleReject(reqId, reason) {
        const idx = requests.findIndex(r => r.id === reqId);
        if (idx === -1) return;

        const req = requests[idx];
        req.status = 'rejected';
        req.rejectionReason = reason;
        requests[idx] = req;
        localStorage.setItem('parkly_spot_requests', JSON.stringify(requests));

        sendOwnerNotification(req.ownerId, req.id, req.name, 'rejected', 'Your spot request was rejected by the admin.', reason);
        renderCurrentView();
    }

    function sendOwnerNotification(ownerId, spotId, spotName, type, message, reason) {
        const notifications = JSON.parse(localStorage.getItem('parkly_owner_notifications')) || [];
        notifications.push({
            id: Date.now(),
            ownerId,
            spotId,
            spotName,
            type,
            message,
            reason,
            dismissed: false,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('parkly_owner_notifications', JSON.stringify(notifications));
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
        document.getElementById('badge-users').innerText = users.length;
        
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