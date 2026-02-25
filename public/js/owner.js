/**
 * ARCHIVO: js/owner.js
 * DESCRIPCIÓN: Dashboard del Dueño. 100% libre de inyección HTML.
 * Guarda en Base de Datos vía DB.saveSpotRequest.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    const viewDashboard = document.getElementById('view-dashboard');
    const viewPublish = document.getElementById('view-publish');
    
    let currentStep = 1;
    let wizardData = { type: '', schedule: '24h', days: [], features: [], certFile: null };

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

    // ── GUARDAR EN MYSQL ──
    async function saveSpot() {
        const user = JSON.parse(localStorage.getItem('parkly_session'));
        const features = [];
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => features.push(cb.value));

        const spotData = {
            id: Date.now(),
            ownerId: user ? user.email : 'unknown',
            ownerName: user ? (user.username || user.name) : 'Unknown Owner',
            name: `${wizardData.type} at ${document.getElementById('wiz-address').value.split(',')[0]}`,
            address: document.getElementById('wiz-address').value,
            price: parseInt(document.getElementById('wiz-price').value) || 5000,
            cells: parseInt(document.getElementById('wiz-capacity').value) || 1,
            schedule: wizardData.schedule,
            features: features, // array para local, se unirá en la DB
            certificate: wizardData.certFile || "pending.pdf",
            image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600",
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        // Guardado local (Para que el Dashboard del Admin lo lea si no has montado rutas completas)
        const requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];
        requests.push(spotData);
        localStorage.setItem('parkly_spot_requests', JSON.stringify(requests));

        // ── ALIMENTAR BASE DE DATOS REAL ──
        if (typeof DB !== 'undefined' && DB.saveSpotRequest) {
            await DB.saveSpotRequest({
                ...spotData,
                features: features.join(',')
            });
        }
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

    // ── RENDERIZADO DOM PURO ──
    function renderOwnerNotifications() {
        const notifContainer = document.getElementById('owner-notifications');
        const tpl = document.getElementById('tpl-owner-notif');
        if (!notifContainer || !tpl) return;
        
        const user = JSON.parse(localStorage.getItem('parkly_session'));
        if (!user) return;

        const notifications = JSON.parse(localStorage.getItem('parkly_owner_notifications')) || [];
        const myNotifs = notifications.filter(n => n.ownerId === user.email && !n.dismissed);

        notifContainer.innerHTML = '';

        myNotifs.forEach(n => {
            const clone = tpl.content.cloneNode(true);
            const card = clone.querySelector('.notif-card');
            const iconBox = clone.querySelector('.notif-icon-box');
            const icon = clone.querySelector('.notif-icon');
            
            if (n.type === 'rejected') {
                card.classList.add('bg-red-900/20', 'border-red-800/50');
                iconBox.classList.add('bg-red-500/20', 'text-red-400');
                icon.setAttribute('data-lucide', 'x-circle');
                clone.querySelector('.notif-title').classList.add('text-red-300');
                clone.querySelector('.notif-title').textContent = 'Spot Request Rejected';
            } else {
                card.classList.add('bg-green-900/20', 'border-green-800/50');
                iconBox.classList.add('bg-green-500/20', 'text-green-400');
                icon.setAttribute('data-lucide', 'check-circle');
                clone.querySelector('.notif-title').classList.add('text-green-300');
                clone.querySelector('.notif-title').textContent = 'Spot Approved!';
            }

            clone.querySelector('.notif-spot-name').textContent = n.spotName;
            clone.querySelector('.notif-msg-text').textContent = n.message;

            if (n.reason) {
                clone.querySelector('.notif-reason-box').classList.remove('hidden');
                clone.querySelector('.notif-reason-text').textContent = n.reason;
            }

            // Evento para cerrar notificación
            clone.querySelector('.btn-dismiss').addEventListener('click', () => {
                const allNotifs = JSON.parse(localStorage.getItem('parkly_owner_notifications')) || [];
                const idx = allNotifs.findIndex(item => item.id === n.id);
                if (idx !== -1) { 
                    allNotifs[idx].dismissed = true; 
                    localStorage.setItem('parkly_owner_notifications', JSON.stringify(allNotifs)); 
                }
                renderOwnerNotifications();
            });

            notifContainer.appendChild(clone);
        });

        if(window.lucide) lucide.createIcons();
    }

    async function renderTab() {
        const user = JSON.parse(localStorage.getItem('parkly_session'));
        const content = document.getElementById('owner-tab-content');
        const countEl = document.getElementById('stat-spots-count');
        const earningsEl = document.getElementById('stat-total-earnings');
        const tplSpot = document.getElementById('tpl-owner-spot');
        const tplEmpty = document.getElementById('tpl-empty-spots');
        
        if (!content || !tplSpot || !tplEmpty) return;

        // Lectura de MySQL y Local (Híbrido seguro)
        let spots = [];
        if (typeof DB !== 'undefined' && DB.getSpots) spots = await DB.getSpots();
        if (!spots || spots.length === 0) spots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
        
        const requests = JSON.parse(localStorage.getItem('parkly_spot_requests')) || [];
        
        const mySpots = user ? spots.filter(s => s.ownerId === user.email) : spots;
        const myRequests = user ? requests.filter(r => r.ownerId === user.email && r.status === 'pending') : [];
        
        if (countEl) countEl.innerText = mySpots.length;
        if (earningsEl) {
            const total = mySpots.reduce((sum, spot) => sum + (spot.earnings || 0), 0);
            earningsEl.innerText = `$ ${total.toLocaleString('es-CO')}`;
        }

        renderOwnerNotifications();
        content.innerHTML = '';

        const allItems = [
            ...mySpots.map(s => ({...s, _type: 'spot'})),
            ...myRequests.map(r => ({...r, _type: 'request'}))
        ];

        if (allItems.length === 0) {
            content.appendChild(tplEmpty.content.cloneNode(true));
            return;
        }

        allItems.forEach(item => {
            const clone = tplSpot.content.cloneNode(true);
            
            clone.querySelector('.spot-img').src = item.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600';
            clone.querySelector('.spot-name').textContent = item.name;
            clone.querySelector('.spot-address').textContent = item.address;
            clone.querySelector('.spot-price').textContent = item.price.toLocaleString('es-CO');

            const featContainer = clone.querySelector('.spot-features');
            if (item.features) {
                // Maneja array de local o string de la base de datos
                const featArray = Array.isArray(item.features) ? item.features : item.features.split(',');
                featArray.forEach(f => {
                    if(!f.trim()) return;
                    const span = document.createElement('span');
                    span.className = 'px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-300';
                    span.textContent = f.trim();
                    featContainer.appendChild(span);
                });
            }

            const badgeContainer = clone.querySelector('.spot-badge-container');
            if (item._type === 'request' && item.status === 'pending') {
                badgeContainer.innerHTML = `<span class="inline-flex items-center gap-1 px-3 py-1 bg-yellow-900/30 text-yellow-400 text-[10px] font-black rounded-lg"><i data-lucide="clock" class="w-3 h-3"></i> PENDING REVIEW</span>`;
            } else {
                badgeContainer.innerHTML = `<span class="inline-block px-3 py-1 bg-green-900/30 text-green-400 text-[10px] font-black rounded-lg">ACTIVE</span>`;
            }

            content.appendChild(clone);
        });

        if(window.lucide) lucide.createIcons();
    }

    // ── LISTENERS ──
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

    // Arranque
    const isNewUser = localStorage.getItem('parkly_new_user');
    const allSpots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    if (isNewUser === 'true' || allSpots.length === 0) {
        toggleView(false); 
        localStorage.removeItem('parkly_new_user');
    } else {
        renderTab();
    }
});