/* File: js/google-auth.js */

// 1. IMPORT FIREBASE SDK (Using v12.9.0 as provided)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// 2. YOUR REAL CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyBQw83KIxHycKVRHHrvsBbve5lx3al-aRQ",
    authDomain: "parkly-web-fecd0.firebaseapp.com",
    projectId: "parkly-web-fecd0",
    storageBucket: "parkly-web-fecd0.firebasestorage.app",
    messagingSenderId: "423865534808",
    appId: "1:423865534808:web:7f32e209c25591282efd2d",
    measurementId: "G-VQTW1EL4F1"
};

// 3. INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 4. MAIN FUNCTION FOR GOOGLE LOGIN
window.handleGoogleLogin = async function() {
    try {
        console.log("Starting Google Auth...");
        
        // A. Open Google Popup
        const result = await signInWithPopup(auth, provider);
        const googleUser = result.user;
        
        console.log("Google Auth Success:", googleUser.email);

        // B. Handle User Data & Role
        let users = JSON.parse(localStorage.getItem('parkly_users')) || [];
        let existingUser = users.find(u => u.email === googleUser.email);
        let userToSave;

        if (existingUser) {
            // User exists: Just login
            console.log("Existing user found.");
            userToSave = existingUser;
        } else {
            // New User: Register with selected role
            console.log("New user. Registering...");
            
            // Try to get role from the HTML input (if present in register.html)
            const roleInput = document.getElementById('selected-role');
            const selectedRole = roleInput && roleInput.value ? roleInput.value : 'client';
            
            userToSave = {
                name: googleUser.displayName,
                email: googleUser.email,
                role: selectedRole, // Important: Saves 'owner' or 'client'
                photo: googleUser.photoURL,
                password: "google_login_secure", // Placeholder password
                joined: new Date().toISOString()
            };
            
            users.push(userToSave);
            localStorage.setItem('parkly_users', JSON.stringify(users));
        }

        // C. Create Session
        localStorage.setItem('parkly_session', JSON.stringify(userToSave));
        
        // D. Redirect based on Role
        alert(`Welcome ${userToSave.name}!`);
        
        if (userToSave.role === 'owner') {
            // If it's a new owner, trigger the onboarding wizard logic in owner-dash
            if (!existingUser) localStorage.setItem('parkly_new_user', 'true');
            window.location.href = 'owner-dash.html';
        } else if (userToSave.role === 'admin') {
            window.location.href = 'admin-dash.html';
        } else {
            window.location.href = 'search.html';
        }

    } catch (error) {
        console.error("Google Auth Error:", error);
        alert("Authentication failed: " + error.message);
    }
}