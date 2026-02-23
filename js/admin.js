/**
 * ARCHIVO: js/admin.js
 * DESCRIPCIÓN: Lógica del panel administrativo con métricas e iconos completos.
 */

// Protección de ruta: Solo admins pueden acceder
const parkly_session = JSON.parse(localStorage.getItem('parkly_session'));
if (!parkly_session) {
    window.location.href = './index.html';
} else if (parkly_session.role == 'client') {
    window.location.href = './search.html';
} else if (parkly_session.role == 'owner') {
    window.location.href = './owner-dash.html';
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. REFERENCIAS AL DOM ---
    const adminContent = document.getElementById('admin-view-content');
    const tableFilter = document.getElementById('admin-table-filter');
    const tabs = document.getElementById('tabs-container');
    
    let activeTab = 'summary';
    let users = JSON.parse(localStorage.getItem('parkly_users')) || [];
    let spots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    let reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];

    // --- 2. FUNCIONES DE MÉTRICAS (Basadas en image_2fe1e2.png) ---
    const getTotalIncome = () => reservations.reduce((acc, r) => acc + (r.amount || 0), 0);
    const getVerifRate = () => spots.length ? Math.round((spots.filter(s=>s.verified).length/spots.length)*100) : 0;
    const getAvgBooking = () => reservations.length ? Math.round(getTotalIncome() / reservations.length) : 0;
    const getPaymentStats = (method) => {
        const list = reservations.filter(r => r.payment && r.payment.includes(method));
        return { count: list.length, amount: "$ " + list.reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString() };
    };

    // --- 3. EVENTOS ---
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

    // --- 4. RENDER ENGINE ---
    function renderCurrentView() {
        const query = tableFilter.value.toLowerCase();
        if (activeTab === 'summary') renderSummary();
        else if (activeTab === 'requests') renderRequests();
        else renderTable(activeTab, query);
        updateBadges();
        lucide.createIcons();
    }

    function renderSummary() {
        adminContent.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    ${renderKpiCard('Parking Spots', spots.length, 'parking-circle', 'blue')}
                    ${renderKpiCard('Reservations', reservations.length, 'calendar-check', 'green')}
                    ${renderKpiCard('Total Revenue', '$ ' + getTotalIncome().toLocaleString(), 'dollar-sign', 'yellow')}
                    ${renderKpiCard('Registered Users', users.length, 'users', 'purple')}
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <article class="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
                        <h3 class="text-xs font-black text-white uppercase tracking-widest mb-8">Reservation status distribution</h3>
                        <div class="space-y-5">
                            ${renderStatusBar('Pending', reservations.filter(r=>r.status==='pendiente').length, 'bg-yellow-500')}
                            ${renderStatusBar('In use', reservations.filter(r=>r.status==='en-uso').length, 'bg-blue-500')}
                            ${renderStatusBar('Verified', reservations.filter(r=>r.status==='verified').length, 'bg-green-500')}
                            ${renderStatusBar('Rejected', reservations.filter(r=>r.status==='rechazado').length, 'bg-red-500')}
                            ${renderStatusBar('Completed', reservations.filter(r=>r.status==='completado').length, 'bg-slate-500')}
                        </div>
                    </article>

                    <article class="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
                        <h3 class="text-xs font-black text-white uppercase tracking-widest mb-8">Quick metrics</h3>
                        <div class="space-y-4">
                            ${renderMetricRow('Verified parking spots', `${spots.filter(s=>s.verified).length}/${spots.length}`, 'text-blue-400', 'shield-check')}
                            ${renderMetricRow('Active Drivers', users.filter(u=>u.role==='client').length, 'text-green-400', 'car')}
                            ${renderMetricRow('Property Owners', users.filter(u=>u.role==='owner').length, 'text-yellow-400', 'briefcase')}
                            ${renderMetricRow('Verification Rate', getVerifRate() + '%', 'text-blue-400', 'trending-up')}
                            ${renderMetricRow('Average per booking', '$ ' + getAvgBooking().toLocaleString(), 'text-white', 'dollar-sign')}
                        </div>
                    </article>
                </div>

                <section>
                    <h3 class="text-xs font-black text-white uppercase tracking-widest mb-6">Revenue by payment method</h3>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        ${renderPaymentCard('PSE', getPaymentStats('PSE'))}
                        ${renderPaymentCard('Nequi', getPaymentStats('Nequi'))}
                        ${renderPaymentCard('Daviplata', getPaymentStats('Daviplata'))}
                        ${renderPaymentCard('Credit Card', getPaymentStats('Tarjeta'))}
                    </div>
                </section>
            </div>`;
    }

    function renderRequests() {
        const requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];
        const pending = requests.filter(r => r.status === 'pending');
        const resolved = requests.filter(r => r.status !== 'pending');

        const rejectionReasons = [
            "Incomplete or invalid ownership certificate",
            "Address cannot be verified",
            "Property does not meet safety standards",
            "Duplicate listing detected",
            "Insufficient information provided",
            "Zoning restrictions apply to this location",
            "Other (see admin notes)"
        ];

        adminContent.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                ${pending.length === 0 ? `
                <div class="text-center py-20">
                    <div class="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="inbox" class="w-8 h-8 text-slate-500"></i>
                    </div>
                    <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">No pending requests</p>
                </div>` : `
                <div>
                    <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <i data-lucide="clock" class="w-4 h-4 text-yellow-400"></i> Pending Approval (${pending.length})
                    </h3>
                    <div class="space-y-4">
                        ${pending.map(req => `
                        <article class="bg-[#0f172a] border border-yellow-900/40 rounded-2xl overflow-hidden shadow-lg">
                            <div class="flex gap-5 p-5">
                                <img src="${req.image}" class="w-28 h-20 rounded-xl object-cover bg-slate-800 flex-shrink-0">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-start justify-between gap-4 mb-1">
                                        <h4 class="font-bold text-white text-base leading-tight">${req.name}</h4>
                                        <span class="flex-shrink-0 text-[10px] font-black px-2 py-1 bg-yellow-900/40 text-yellow-400 rounded-lg uppercase tracking-wide">Pending</span>
                                    </div>
                                    <p class="text-xs text-slate-400 mb-1 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${req.address}</p>
                                    <p class="text-xs text-slate-500 flex items-center gap-1"><i data-lucide="user" class="w-3 h-3"></i> Owner: <span class="text-slate-300 ml-1 font-medium">${req.ownerName}</span> <span class="text-slate-600 ml-1">(${req.ownerId})</span></p>
                                    <div class="flex gap-3 mt-2 text-xs text-slate-400">
                                        <span>$ ${req.price.toLocaleString()}/hr</span>
                                        <span>·</span>
                                        <span>${req.cells} cell(s)</span>
                                        <span>·</span>
                                        <span>${req.schedule}</span>
                                        <span>·</span>
                                        <span>Cert: <span class="text-slate-300">${req.certificate}</span></span>
                                    </div>
                                    ${req.features && req.features.length ? `<div class="flex flex-wrap gap-1 mt-2">${req.features.map(f => `<span class="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400">${f}</span>`).join('')}</div>` : ''}
                                </div>
                            </div>
                            
                            <div class="border-t border-slate-800 px-5 py-4 bg-[#020617]/30">
                                <div id="reject-panel-${req.id}" class="hidden mb-4 bg-red-950/30 border border-red-900/40 rounded-xl p-4 space-y-3">
                                    <p class="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Select rejection reason:</p>
                                    <div class="space-y-2">
                                        ${rejectionReasons.map((reason, i) => `
                                        <label class="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio" name="reject-reason-${req.id}" value="${reason}" class="text-red-500">
                                            <span class="text-xs text-slate-400 group-hover:text-white transition-colors">${reason}</span>
                                        </label>`).join('')}
                                    </div>
                                    <div class="flex gap-2 mt-3">
                                        <button onclick="confirmReject(${req.id})" class="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-1">
                                            <i data-lucide="x-circle" class="w-3 h-3"></i> Confirm Rejection
                                        </button>
                                        <button onclick="cancelReject(${req.id})" class="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                                    </div>
                                </div>
                                <div class="flex gap-3">
                                    <button onclick="approveRequest(${req.id})" class="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/30">
                                        <i data-lucide="check-circle" class="w-4 h-4"></i> Approve
                                    </button>
                                    <button onclick="showRejectPanel(${req.id})" class="flex-1 bg-red-900/30 hover:bg-red-800/40 text-red-400 border border-red-900/50 text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                                        <i data-lucide="x-circle" class="w-4 h-4"></i> Reject
                                    </button>
                                </div>
                            </div>
                        </article>
                        `).join('')}
                    </div>
                </div>`}

                ${resolved.length > 0 ? `
                <div>
                    <h3 class="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Resolved Requests (${resolved.length})</h3>
                    <div class="space-y-3">
                        ${resolved.map(req => `
                        <div class="flex items-center gap-4 p-4 bg-[#0f172a] border border-slate-800 rounded-2xl">
                            <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                                <i data-lucide="${req.status === 'approved' ? 'check' : 'x'}" class="w-4 h-4"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-white truncate">${req.name}</p>
                                <p class="text-xs text-slate-500">${req.ownerId}</p>
                            </div>
                            <span class="text-[10px] font-black px-2 py-1 rounded-lg uppercase ${req.status === 'approved' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}">${req.status}</span>
                        </div>`).join('')}
                    </div>
                </div>` : ''}
            </div>`;

        lucide.createIcons();
    }

    // --- APPROVE / REJECT ACTIONS ---
    window.approveRequest = function(reqId) {
        const requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];
        const idx = requests.findIndex(r => r.id === reqId);
        if (idx === -1) return;

        const req = requests[idx];
        req.status = 'approved';
        requests[idx] = req;
        localStorage.setItem('parkly_spot_requests', JSON.stringify(requests));

        // Add to actual spots
        const spots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
        spots.push({
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
        });
        localStorage.setItem('parkly_spots', JSON.stringify(spots));

        // Notify owner
        sendOwnerNotification(req.ownerId, req.id, req.name, 'approved', 'Your spot has been approved and is now live on PARKLY!', null);

        renderCurrentView();
    };

    window.showRejectPanel = function(reqId) {
        document.getElementById(`reject-panel-${reqId}`).classList.remove('hidden');
    };

    window.cancelReject = function(reqId) {
        document.getElementById(`reject-panel-${reqId}`).classList.add('hidden');
    };

    window.confirmReject = function(reqId) {
        const selected = document.querySelector(`input[name="reject-reason-${reqId}"]:checked`);
        if (!selected) { alert('Please select a rejection reason.'); return; }

        const reason = selected.value;
        const requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];
        const idx = requests.findIndex(r => r.id === reqId);
        if (idx === -1) return;

        const req = requests[idx];
        req.status = 'rejected';
        req.rejectionReason = reason;
        requests[idx] = req;
        localStorage.setItem('parkly_spot_requests', JSON.stringify(requests));

        // Notify owner
        sendOwnerNotification(req.ownerId, req.id, req.name, 'rejected', 'Your spot request was rejected by the admin.', reason);

        renderCurrentView();
    };

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

    function renderTable(type, query) {
        let list = (type === 'spots') ? spots : (type === 'users' ? users : reservations);
        const filtered = list.filter(item => (item.name || item.email || '').toLowerCase().includes(query));
        adminContent.innerHTML = `
            <div class="bg-card border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-900/50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-800">
                        <tr><th class="p-4">Item</th><th class="p-4">Status</th></tr>
                    </thead>
                    <tbody class="text-sm text-slate-300 divide-y divide-slate-800/30">
                        ${filtered.map(i => `<tr><td class="p-4 font-bold text-white">${i.name || i.email}</td><td class="p-4">${i.verified || i.role || 'Active'}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    // --- HELPERS ---
    function renderKpiCard(l, v, i, c) { return `<article class="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl"><div class="w-10 h-10 rounded-xl bg-${c}-500/10 flex items-center justify-center text-${c}-400 mb-4"><i data-lucide="${i}"></i></div><h3 class="text-3xl font-bold text-white mb-1 tracking-tighter">${v}</h3><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">${l}</p></article>`; }
    function renderStatusBar(l, c, clr) { const p = (c / (reservations.length || 1)) * 100; return `<div class="flex items-center gap-3 text-xs"><span class="w-20 text-slate-500 font-bold">${l}</span><div class="flex-1 h-2 bg-[#020617] rounded-full overflow-hidden"><div class="h-full ${clr} transition-all duration-1000" style="width: ${p}%"></div></div><span class="w-6 text-right text-white font-bold">${c}</span></div>`; }
    function renderMetricRow(l, v, c, i) { return `<div class="flex justify-between items-center p-3.5 bg-[#020617]/50 border border-slate-800 rounded-xl"><div class="flex items-center gap-2"><i data-lucide="${i}" class="w-4 h-4 text-slate-500"></i><span class="text-sm text-slate-400 font-medium">${l}</span></div><span class="text-sm font-bold ${c}">${v}</span></div>`; }
    function renderPaymentCard(m, d) { return `<article class="p-5 bg-[#0f172a] border border-slate-800 rounded-2xl text-center"><p class="text-[10px] text-slate-500 font-bold uppercase mb-2">${m}</p><p class="text-2xl font-bold text-white mb-1">${d.count}</p><p class="text-[10px] font-bold text-blue-400">${d.amount}</p></article>`; }

    function updateTabsUI(active) {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active-tab', 'border-primary', 'text-primary', 'font-bold');
            b.classList.add('border-transparent', 'text-slate-400');
        });
        active.classList.add('active-tab', 'border-primary', 'text-primary', 'font-bold');
    }

    function updateBadges() {
        const requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];
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

    renderCurrentView();
});