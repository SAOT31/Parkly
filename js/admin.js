/**
 * ARCHIVO: js/admin.js
 * DESCRIPCIÓN: Lógica del panel administrativo con métricas e iconos completos.
 */

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
        document.getElementById('badge-spots').innerText = spots.length;
        document.getElementById('badge-reservations').innerText = reservations.length;
        document.getElementById('badge-users').innerText = users.length;
    }

    renderCurrentView();
});