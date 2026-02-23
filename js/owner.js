/**
 * ARCHIVO: js/owner.js
 * DESCRIPCIÓN: Lógica Dashboard + Wizard (VERSION FINAL CORREGIDA)
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ======================================================
    // 1. VARIABLES Y REFERENCIAS
    // ======================================================
    const viewDashboard = document.getElementById('view-dashboard');
    const viewPublish = document.getElementById('view-publish');
    
    let currentStep = 1;
    let wizardData = { type: '', schedule: '24h', days: [], features: [], certFile: null };

    // ======================================================
    // 2. FUNCIONES DE LÓGICA
    // ======================================================

    function toggleView(showDashboard) {
        if (!viewDashboard || !viewPublish) return;
        if (showDashboard) {
            viewDashboard.classList.remove('hidden');
            viewPublish.classList.add('hidden');
            renderTab();
        } else {
            viewDashboard.classList.add('hidden');
            viewPublish.classList.remove('hidden');
            resetWizard();
        }
        window.scrollTo(0,0);
    }

    function handleNextStep(e) {
        if(e) e.preventDefault();

        // Validaciones
        if (currentStep === 1 && !wizardData.type) return alert("Please select a property type.");
        if (currentStep === 2 && !document.getElementById('wiz-address').value) return alert("Please enter an address.");
        if (currentStep === 3 && !document.getElementById('wiz-price').value) return alert("Please set a price.");

        if (currentStep < 4) {
            document.getElementById(`step-${currentStep}`).classList.add('hidden');
            currentStep++;
            document.getElementById(`step-${currentStep}`).classList.remove('hidden');
            updateIndicators();
            
            if (currentStep === 4) {
                document.getElementById('wiz-nav').classList.add('hidden');
                saveSpot();
            }
        }
    }

    function handlePrevStep(e) {
        if(e) e.preventDefault();
        
        if (currentStep > 1) {
            document.getElementById(`step-${currentStep}`).classList.add('hidden');
            currentStep--;
            document.getElementById(`step-${currentStep}`).classList.remove('hidden');
            updateIndicators();
        } else {
            toggleView(true);
        }
    }

    function updateIndicators() {
        document.querySelectorAll('.step-dot').forEach((dot, idx) => {
            const stepNum = idx + 1;
            dot.classList.remove('bg-primary', 'text-white', 'border-primary', 'bg-green-500');
            dot.innerText = stepNum;

            if (stepNum === currentStep) {
                dot.classList.add('bg-primary', 'text-white', 'border-primary');
            } else if (stepNum < currentStep) {
                dot.classList.add('bg-green-500', 'text-white', 'border-green-500');
                dot.innerText = '✓';
            } else {
                dot.classList.add('bg-slate-800', 'text-slate-400');
            }
        });
    }

    function saveSpot() {
        const user = JSON.parse(localStorage.getItem('parkly_session'));

        // Guardar todos los checkboxes (Baño, Lockers, etc.)
        const features = [];
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => features.push(cb.value));

        const newRequest = {
            id: Date.now(),
            ownerId: user ? user.email : 'unknown',
            ownerName: user ? (user.username || user.name) : 'Unknown Owner',
            name: `${wizardData.type} at ${document.getElementById('wiz-address').value.split(',')[0]}`,
            address: document.getElementById('wiz-address').value,
            price: parseInt(document.getElementById('wiz-price').value) || 5000,
            cells: parseInt(document.getElementById('wiz-capacity').value) || 1,
            schedule: wizardData.schedule,
            features: features,
            certificate: wizardData.certFile || "pending.pdf",
            image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600",
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        const requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];
        requests.push(newRequest);
        localStorage.setItem('parkly_spot_requests', JSON.stringify(requests));
    }

    function resetWizard() {
        currentStep = 1;
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
        document.getElementById('step-1').classList.remove('hidden');
        document.getElementById('wiz-nav').classList.remove('hidden');
        updateIndicators();
        document.getElementById('wizard-form').reset();
        
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('border-primary', 'bg-primary/10'));
        const fLabel = document.getElementById('cert-file-label');
        if(fLabel) fLabel.innerText = "Click to upload PDF or Photo";
        
        wizardData = { type: '', schedule: '24h', days: [], features: [], certFile: null };
    }

    function renderOwnerNotifications() {
        const notifContainer = document.getElementById('owner-notifications');
        if (!notifContainer) return;
        const user = JSON.parse(localStorage.getItem('parkly_session'));
        if (!user) return;

        const notifications = JSON.parse(localStorage.getItem('parkly_owner_notifications')) || [];
        const myNotifs = notifications.filter(n => n.ownerId === user.email && !n.dismissed);

        notifContainer.innerHTML = myNotifs.map(n => `
            <div class="flex items-start gap-4 p-4 rounded-2xl border ${n.type === 'rejected' ? 'bg-red-900/20 border-red-800/50' : 'bg-green-900/20 border-green-800/50'} animate-fade-in">
                <div class="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${n.type === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}">
                    <i data-lucide="${n.type === 'rejected' ? 'x-circle' : 'check-circle'}" class="w-5 h-5"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-bold ${n.type === 'rejected' ? 'text-red-300' : 'text-green-300'} mb-0.5">${n.type === 'rejected' ? 'Spot Request Rejected' : 'Spot Approved!'}</p>
                    <p class="text-xs text-slate-400"><span class="font-semibold text-white">${n.spotName}</span> — ${n.message}</p>
                    ${n.reason ? `<p class="text-xs mt-1.5 text-slate-500"><span class="font-bold text-slate-400">Reason:</span> ${n.reason}</p>` : ''}
                </div>
                <button onclick="dismissNotification(${n.id})" class="text-slate-600 hover:text-white transition-colors flex-shrink-0">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');

        if(window.lucide) lucide.createIcons();
    }

    window.dismissNotification = function(id) {
        const notifications = JSON.parse(localStorage.getItem('parkly_owner_notifications')) || [];
        const idx = notifications.findIndex(n => n.id === id);
        if (idx !== -1) { notifications[idx].dismissed = true; localStorage.setItem('parkly_owner_notifications', JSON.stringify(notifications)); }
        renderOwnerNotifications();
    };

    function renderTab() {
        const user = JSON.parse(localStorage.getItem('parkly_session'));
        const spots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
        const requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];
        const content = document.getElementById('owner-tab-content');
        const countEl = document.getElementById('stat-spots-count');
        
        // Filter spots belonging to this owner
        const mySpots = user ? spots.filter(s => s.ownerId === user.email) : spots;
        // Only show requests still pending — approved ones are already in mySpots, rejected ones go to notifications
        const myRequests = user ? requests.filter(r => r.ownerId === user.email && r.status === 'pending') : [];
        
        if(countEl) countEl.innerText = mySpots.length;
        if (!content) return;

        renderOwnerNotifications();

        const allItems = [
            ...mySpots.map(s => ({...s, _type: 'spot'})),
            ...myRequests.map(r => ({...r, _type: 'request'}))
        ];

        if (allItems.length === 0) {
            content.innerHTML = `<div class="text-center py-20 text-slate-500">You haven't published any spots yet.</div>`;
            return;
        }

        content.innerHTML = allItems.map(item => {
            const isPending = item._type === 'request' && item.status === 'pending';
            const statusBadge = isPending
                ? `<span class="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-yellow-900/30 text-yellow-400 text-[10px] font-black rounded-lg"><i data-lucide="clock" class="w-3 h-3"></i> PENDING REVIEW</span>`
                : `<span class="inline-block mt-2 px-3 py-1 bg-green-900/30 text-green-400 text-[10px] font-black rounded-lg">ACTIVO</span>`;

            return `
            <article class="bg-card border border-border p-5 rounded-2xl flex gap-6 mb-4 animate-fade-in">
                <img src="${item.image}" class="w-32 h-24 rounded-xl object-cover bg-slate-800">
                <div class="flex-1">
                    <h4 class="font-bold text-white text-lg">${item.name}</h4>
                    <p class="text-xs text-slate-400 mb-2">${item.address}</p>
                    <div class="flex gap-2 mt-2 flex-wrap">
                        ${item.features ? item.features.map(f => `<span class="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-300">${f}</span>`).join('') : ''}
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-xl font-bold text-white">$ ${item.price}<span class="text-xs text-slate-500">/hr</span></span>
                    ${statusBadge}
                </div>
            </article>
        `}).join('');

        if(window.lucide) lucide.createIcons();
    }

    // ======================================================
    // 3. LISTENERS (SIN ERRORES)
    // ======================================================

    const btnNav = document.getElementById('btn-nav-panel');
    const btnPub = document.getElementById('btn-main-publish');
    if(btnNav) btnNav.addEventListener('click', () => toggleView(true));
    if(btnPub) btnPub.addEventListener('click', () => toggleView(false));

    const btnNext = document.getElementById('btn-next-step');
    const btnPrev = document.getElementById('btn-prev-step');
    const btnFinish = document.getElementById('btn-finish-wizard');

    if(btnNext) btnNext.addEventListener('click', handleNextStep);
    if(btnPrev) btnPrev.addEventListener('click', handlePrevStep);
    if(btnFinish) btnFinish.addEventListener('click', () => toggleView(true));

    // Botones de selección
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('border-primary', 'bg-primary/10'));
            e.currentTarget.classList.add('border-primary', 'bg-primary/10');
            wizardData.type = e.currentTarget.innerText.trim();
        });
    });

    document.querySelectorAll('.schedule-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const mode = e.currentTarget.dataset.sched;
            document.querySelectorAll('.schedule-btn').forEach(b => b.classList.remove('bg-primary', 'text-white'));
            e.currentTarget.classList.add('bg-primary', 'text-white');
            wizardData.schedule = mode;
            const customBox = document.getElementById('custom-schedule-box');
            if(customBox) mode === 'custom' ? customBox.classList.remove('hidden') : customBox.classList.add('hidden');
        });
    });

    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.currentTarget.classList.toggle('bg-primary');
            e.currentTarget.classList.toggle('text-white');
            e.currentTarget.classList.toggle('bg-slate-900');
        });
    });

    // Certificado
    const fileInput = document.getElementById('owner-certificate-file');
    const fileLabel = document.getElementById('cert-file-label');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                if(fileLabel) {
                    fileLabel.innerText = "Archivo: " + fileInput.files[0].name;
                    fileLabel.classList.add('text-primary');
                }
                wizardData.certFile = fileInput.files[0].name;
            }
        });
    }

    // Auto-arranque si es nuevo
    const isNewUser = localStorage.getItem('parkly_new_user');
    const allSpots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    if (isNewUser === 'true' || allSpots.length === 0) {
        toggleView(false); 
        localStorage.removeItem('parkly_new_user');
    } else {
        renderTab();
    }
});