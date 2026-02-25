/**
 * ARCHIVO: js/app.js
 * DESCRIPCIÓN: Lógica global (Navegación, Logout, Modo Oscuro y Control de Sesión en Index).
 * Cero HTML inyectado mediante strings para cumplir buenas prácticas.
 */

// --- 1. INICIALIZACIÓN TEMPRANA DEL TEMA ---
(function() {
    const savedTheme = localStorage.getItem('parkly_theme') || 'dark';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 2. BOTÓN DE MODO OSCURO (#theme-toggle) ---
    const html = document.documentElement;
    const themeBtn = document.getElementById('theme-toggle');

    const syncThemeUI = () => {
        if (!themeBtn) return;
        const isDark = html.classList.contains('dark');
        
        themeBtn.innerHTML = ''; 
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        icon.className = isDark ? 'h-5 w-5 text-yellow-400' : 'h-5 w-5 text-slate-400';
        
        themeBtn.appendChild(icon);
        
        if (window.lucide) lucide.createIcons();
    };

    syncThemeUI();

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isNowDark = html.classList.toggle('dark');
            localStorage.setItem('parkly_theme', isNowDark ? 'dark' : 'light');
            syncThemeUI();
        });
    }

    // --- 3. BOTÓN DE NAVEGACIÓN A SEARCH (#btn-nav-search) ---
    const navSearchBtn = document.getElementById('btn-nav-search');
    if (navSearchBtn) {
        navSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = './search.html';
        });
    }

    // --- 4. BOTÓN DE LOGOUT GENERAL (#btn-logout) ---
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm("Are you sure you want to log out?")) {
                localStorage.removeItem('parkly_session');
                window.location.href = './index.html';
            }
        });
    }

    // --- 5. ACTUALIZAR NAVBAR EN INDEX SI HAY SESIÓN ---
    const session = JSON.parse(localStorage.getItem('parkly_session'));
    const navActions = document.getElementById('nav-actions');

    if (session && navActions) {
        navActions.innerHTML = '';
        
        let dashUrl = './search.html'; 
        if (session.role === 'owner') dashUrl = './owner-dash.html';
        if (session.role === 'admin') dashUrl = './admin-dash.html';

        const btnPanel = document.createElement('a');
        btnPanel.href = dashUrl;
        btnPanel.className = 'inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-600 shadow-lg shadow-primary/20';
        btnPanel.textContent = 'Go to my Panel';

        const btnLogoutIndex = document.createElement('button');
        btnLogoutIndex.className = 'text-sm font-medium text-gray-400 hover:text-red-400 transition-colors ml-4';
        btnLogoutIndex.textContent = 'Log out';
        btnLogoutIndex.addEventListener('click', () => {
            if(confirm("Are you sure you want to log out?")) {
                localStorage.removeItem('parkly_session');
                window.location.reload();
            }
        });

        navActions.appendChild(btnPanel);
        navActions.appendChild(btnLogoutIndex);
    }

    // --- 6. FORZAR BOTONES DE LOGIN DESDE INDEX ---
    const navLoginBtn = document.getElementById('btn-nav-login');
    const heroLoginBtn = document.getElementById('btn-hero-login');

    const irALogin = (e) => {
        e.preventDefault(); // Evita que el navegador ignore el clic
        window.location.href = './login.html'; // Fuerza la navegación
    };

    if (navLoginBtn) navLoginBtn.addEventListener('click', irALogin);
    if (heroLoginBtn) heroLoginBtn.addEventListener('click', irALogin);
    
    if (window.lucide) lucide.createIcons();
});