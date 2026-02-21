/**
 * ARCHIVO: js/auth.js
 * DESCRIPCIÓN: Maneja login, registro y validaciones. (VERSIÓN COMPLETA)
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. ELEMENTOS COMUNES DE REGISTRO
    // ==========================================
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const progressBar = document.getElementById('progress-bar');
    const step2Indicator = document.getElementById('step-2-indicator');
    const backText = document.getElementById('back-text');
    const btnBack = document.getElementById('btn-back');

    // Función auxiliar para actualizar visuales de progreso
    const updateProgress = (toStep2) => {
        if (toStep2) {
            if(progressBar) progressBar.style.width = '100%';
            if(step2Indicator) {
                step2Indicator.classList.remove('bg-card', 'text-gray-500', 'border-border');
                step2Indicator.classList.add('bg-primary', 'text-white', 'border-primary');
            }
            if(backText) backText.innerText = "Back to step 1";
        } else {
            if(progressBar) progressBar.style.width = '0%';
            if(step2Indicator) {
                step2Indicator.classList.remove('bg-primary', 'text-white', 'border-primary');
                step2Indicator.classList.add('bg-card', 'text-gray-500', 'border-border');
            }
            if(backText) backText.innerText = "Back to login";
        }
    };

    // ==========================================
    // 1. LÓGICA DEL BOTÓN ATRÁS
    // ==========================================
    if (btnBack) {
        btnBack.addEventListener('click', (e) => {
            e.preventDefault();
            if (step1 && step1.classList.contains('hidden')) {
                step2.classList.add('hidden');
                step1.classList.remove('hidden');
                updateProgress(false); 
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    // ==========================================
    // 2. LÓGICA DE INICIO DE SESIÓN (LOGIN EMAIL/PASS)
    // ==========================================
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            const errorMsg = document.getElementById('error-msg');
            const errorText = document.getElementById('error-text');
            
            const user = DB.login(email, password);

            if (user) {
                if (user.role === 'admin') window.location.href = 'admin-dash.html';
                else if (user.role === 'owner') window.location.href = 'owner-dash.html';
                else window.location.href = 'search.html';
            } else {
                // Validación para cuando falla el inicio de sesión
                if(errorText) errorText.innerText = "Invalid credentials. Account not found.";
                if(errorMsg) errorMsg.classList.remove('hidden');
            }
        });
    }

    // ==========================================
    // 3. LÓGICA DE REGISTRO (REGISTER)
    // ==========================================
    const registerForm = document.getElementById('register-form');
    
    if (registerForm) {
        const btnRoleClient = document.getElementById('btn-role-client');
        const btnRoleOwner = document.getElementById('btn-role-owner');
        const selectedRoleInput = document.getElementById('selected-role');
        const roleLabel = document.getElementById('role-label');
        const roleIcon = document.getElementById('role-icon');

        const goToStep2 = (role) => {
            selectedRoleInput.value = role;
            
            if (role === 'owner') {
                if(roleLabel) roleLabel.innerText = "Property Owner";
                if(roleIcon) roleIcon.setAttribute('data-lucide', 'building-2');
            } else {
                if(roleLabel) roleLabel.innerText = "Driver";
                if(roleIcon) roleIcon.setAttribute('data-lucide', 'car');
            }

            if(window.lucide) lucide.createIcons();
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            updateProgress(true);
        };

        if (btnRoleClient) btnRoleClient.addEventListener('click', () => goToStep2('client'));
        if (btnRoleOwner) btnRoleOwner.addEventListener('click', () => goToStep2('owner'));

        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const password = document.getElementById('reg-password').value;
            const confirmPass = document.getElementById('confirm-password').value;

            if (password !== confirmPass) {
                alert("Passwords do not match!");
                return;
            }

            const newUser = {
                name: document.getElementById('name').value,
                email: document.getElementById('reg-email').value.trim(),
                password: password,
                role: selectedRoleInput.value || 'client',
                certificate: null
            };

            const success = DB.register(newUser);

            if (success) {
                alert("Account created successfully! Welcome to Parkly.");
                if (newUser.role === 'owner') {
                    localStorage.setItem('parkly_new_user', 'true');
                    window.location.href = 'owner-dash.html';
                } else {
                    window.location.href = 'search.html';
                }
            } else {
                alert("Error: User already exists with that email.");
            }
        });
    }

    // ==========================================
    // 4. CONEXIÓN DEL BOTÓN DE GOOGLE
    // ==========================================
    const btnGoogleLogin = document.getElementById('btn-google-login');
    
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', (e) => {
            e.preventDefault();
            // Llama a la función de Firebase que está en google-auth.js
            if (typeof window.handleGoogleLogin === 'function') {
                window.handleGoogleLogin();
            } else {
                console.error("Google logic is missing! Revisa que google-auth.js esté cargado.");
            }
        });
    }
});