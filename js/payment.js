/**
 * ARCHIVO: js/payment.js
 * DESCRIPCIÓN: Lógica para calcular precios, simular pago y enviar comprobante real vía EmailJS.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const spots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    const spot = spots.find(s => s.id == id);

    if (!spot) {
        alert("Parking spot not found");
        window.location.href = 'search.html';
        return;
    }

    // --- 1. REFERENCIAS DOM ---
    const durationBtns = document.querySelectorAll('.duration-btn');
    const paymentMethods = document.querySelectorAll('.payment-method');
    const btnPay = document.getElementById('btn-pay');
    const btnTotalSpan = document.getElementById('btn-total');
    
    // Summary DOM
    const sumImg = document.getElementById('summary-img');
    const sumName = document.getElementById('summary-name');
    const sumAddr = document.getElementById('summary-address');
    const sumRate = document.getElementById('summary-rate');
    const sumDur = document.getElementById('summary-duration');
    const sumTotal = document.getElementById('summary-total');

    // --- 2. ESTADO INICIAL ---
    let hours = 1;
    let pricePerHour = spot.price;

    // Cargar datos estáticos del parqueadero seleccionado
    if (sumImg) sumImg.src = spot.image;
    if (sumName) sumName.innerText = spot.name;
    if (sumAddr) sumAddr.innerText = spot.address;
    if (sumRate) sumRate.innerText = `$ ${pricePerHour.toLocaleString()}`;

    // --- 3. FUNCIÓN DE RECALCULO ---
    const updateTotals = () => {
        const total = hours * pricePerHour;
        const totalStr = `$ ${total.toLocaleString()}`;
        
        if (sumDur) sumDur.innerText = `${hours} hour${hours > 1 ? 's' : ''}`;
        if (sumTotal) sumTotal.innerText = totalStr;
        if (btnTotalSpan) btnTotalSpan.innerText = total.toLocaleString();
    };

    // --- 4. EVENTOS DE INTERFAZ ---

    // Selección de Duración
    durationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            durationBtns.forEach(b => {
                b.classList.remove('active', 'border-primary', 'bg-primary/20', 'text-white');
                b.classList.add('border-border', 'bg-[#0f172a]', 'text-slate-400');
            });
            btn.classList.remove('border-border', 'bg-[#0f172a]', 'text-slate-400');
            btn.classList.add('active', 'border-primary', 'bg-primary/20', 'text-white');
            
            hours = parseInt(btn.getAttribute('data-hours'));
            updateTotals();
        });
    });

    // Selección de Método de Pago (Visual)
    paymentMethods.forEach(btn => {
        btn.addEventListener('click', () => {
            paymentMethods.forEach(b => b.classList.remove('border-primary', 'bg-primary/5'));
            btn.classList.add('border-primary', 'bg-primary/5');
        });
    });

    // --- 5. ACCIÓN DE PAGAR Y ENVÍO DE EMAIL ---
    btnPay.addEventListener('click', () => {
        const session = JSON.parse(localStorage.getItem('parkly_session'));
        
        if (!session) {
            alert("¡Pausa! No hay sesión iniciada. Redirigiendo...");
            window.location.href = 'login.html';
            return;
        }

        // Feedback visual de carga
        const originalContent = btnPay.innerHTML;
        btnPay.disabled = true;
        btnPay.innerHTML = `<i data-lucide="loader-2" class="animate-spin w-5 h-5"></i> Procesando Pago...`;
        if (window.lucide) lucide.createIcons();

        console.log("🚀 Iniciando proceso de pago para:", session.email);

        setTimeout(() => {
            const resId = `PK-${Math.floor(Math.random() * 1000000)}`;
            const finalPrice = pricePerHour * hours;
            
            // Parámetros para tu plantilla template_pj5pume
            const templateParams = {
                user_name: session.name,
                user_email: session.email, // Asegúrate de tener {{user_email}} en el "To Email" de EmailJS
                spot_name: spot.name,
                address: spot.address,
                total: finalPrice.toLocaleString(),
                duration: hours,
                reservation_id: resId
            };

            // --- ENVÍO DE EMAIL REAL CON TUS IDs ---
            emailjs.send('service_x9pofkj', 'template_pj5pume', templateParams)
                .then(() => {
                    console.log('✅ Correo enviado con éxito a EmailJS');
                    
                    // 1. GUARDAR RESERVA GLOBAL
                    const reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
                    const newReservation = {
                        id: resId,
                        user: session.name,
                        userEmail: session.email,
                        spot: spot.name,
                        amount: finalPrice,
                        date: new Date().toLocaleDateString(),
                        status: 'Completed',
                        payment: 'Simulated Card'
                    };
                    reservations.push(newReservation);
                    localStorage.setItem('parkly_reservations', JSON.stringify(reservations));

                    // 2. ACTUALIZAR GANANCIAS DEL DUEÑO
                    const allSpots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
                    const spotIndex = allSpots.findIndex(s => s.id == spot.id);
                    if (spotIndex !== -1) {
                        allSpots[spotIndex].earnings = (allSpots[spotIndex].earnings || 0) + finalPrice;
                        localStorage.setItem('parkly_spots', JSON.stringify(allSpots));
                    }

                    alert(`¡Pago Exitoso! Comprobante enviado a: ${session.email}`);
                    window.location.href = 'search.html';
                    
                }, (error) => {
                    console.error('❌ Error de EmailJS:', error);
                    alert("Simulación fallida: Revisa que tu Public Key y IDs sean correctos.");
                    btnPay.disabled = false;
                    btnPay.innerHTML = originalContent;
                    if (window.lucide) lucide.createIcons();
                });

        }, 1500);
    });

    // Inicializar totales al cargar la página
    updateTotals();
});