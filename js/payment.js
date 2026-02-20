/**
 * ARCHIVO: js/payment.js
 * DESCRIPCIÓN: Gestión de pagos con Wompi y simulación con envío de EmailJS.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURACIÓN INICIAL ---
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const spots = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    const spot = spots.find(s => s.id == id);

    if (!spot) {
        alert("Parking spot not found");
        window.location.href = 'search.html';
        return;
    }

    // --- 2. REFERENCIAS DOM ---
    const durationBtns = document.querySelectorAll('.duration-btn');
    
    // Botones de acción
    const btnWompi = document.getElementById('btn-pay-wompi');
    const btnSimulate = document.getElementById('btn-pay-simulate');
    
    // Spans de precio en los botones
    const btnTotalWompi = document.getElementById('btn-total-wompi');
    const btnTotalSimulate = document.getElementById('btn-total-simulate');
    
    // Resumen lateral (UI)
    const sumImg = document.getElementById('summary-img');
    const sumName = document.getElementById('summary-name');
    const sumAddr = document.getElementById('summary-address');
    const sumRate = document.getElementById('summary-rate');
    const sumDur = document.getElementById('summary-duration');
    const sumTotal = document.getElementById('summary-total');

    // --- 3. ESTADO DEL PAGO ---
    let hours = 1;
    let pricePerHour = spot.price;

    // Poblar datos estáticos
    if (sumImg) sumImg.src = spot.image;
    if (sumName) sumName.innerText = spot.name;
    if (sumAddr) sumAddr.innerText = spot.address;
    if (sumRate) sumRate.innerText = `$ ${pricePerHour.toLocaleString()}`;

    // --- 4. FUNCIÓN DE RECALCULO ---
    const updateTotals = () => {
        const total = hours * pricePerHour;
        const totalStr = `$ ${total.toLocaleString()}`;
        
        // Actualizar resumen lateral
        if (sumDur) sumDur.innerText = `${hours} hour${hours > 1 ? 's' : ''}`;
        if (sumTotal) sumTotal.innerText = totalStr;
        
        // Actualizar números dentro de los botones
        if (btnTotalWompi) btnTotalWompi.innerText = total.toLocaleString();
        if (btnTotalSimulate) btnTotalSimulate.innerText = total.toLocaleString();
    };

    // --- 5. EVENTOS DE INTERFAZ ---
    durationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            durationBtns.forEach(b => {
                b.classList.remove('active', 'border-primary', 'bg-primary/20', 'text-white');
                b.classList.add('border-border', 'bg-[#0f172a]', 'text-slate-400');
            });
            btn.classList.add('active', 'border-primary', 'bg-primary/20', 'text-white');
            
            hours = parseInt(btn.getAttribute('data-hours'));
            updateTotals();
        });
    });

    // --- 6. LÓGICA DE BOTÓN 1: WOMPI ---
    if (btnWompi) {
        btnWompi.addEventListener('click', () => {
            const session = JSON.parse(localStorage.getItem('parkly_session'));
            if (!validarSesion(session)) return;

            const totalAmount = pricePerHour * hours;
            const resId = `PK-WMP-${Math.floor(Math.random() * 1000000)}`;

            var checkout = new WidgetCheckout({
                currency: 'COP',
                amountInCents: totalAmount * 100,
                reference: resId,
                publicKey: 'pub_test_5YLBFidfXmksfQX5KonhVOD7bmVTeWma', 
                customerData: {
                    email: session.email,
                    fullName: session.name
                }
            });

            checkout.open(function (result) {
                if (result.transaction.status === 'APPROVED') {
                    ejecutarFlujoExito(session, spot, totalAmount, hours, resId);
                } else {
                    alert("Pago fallido en Wompi: " + result.transaction.status);
                }
            });
        });
    }

    // --- 7. LÓGICA DE BOTÓN 2: SIMULACIÓN DIRECTA ---
    if (btnSimulate) {
        btnSimulate.addEventListener('click', () => {
            const session = JSON.parse(localStorage.getItem('parkly_session'));
            if (!validarSesion(session)) return;

            const totalAmount = pricePerHour * hours;
            const resId = `PK-SIM-${Math.floor(Math.random() * 1000000)}`;

            btnSimulate.innerText = "Processing...";
            btnSimulate.disabled = true;

            ejecutarFlujoExito(session, spot, totalAmount, hours, resId);
        });
    }

    // --- 8. FUNCIONES MAESTRAS ---

    function validarSesion(session) {
        if (!session) {
            alert("Inicia sesión para continuar");
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    function ejecutarFlujoExito(session, spot, total, hrs, resId) {
        // A. Enviar Correo
        const templateParams = {
            user_name: session.name,
            user_email: session.email,
            spot_name: spot.name,
            spot_address: spot.address,
            rate_per_hour: spot.price.toLocaleString(),
            duration: `${hrs} hour(s)`,
            total_pay: total.toLocaleString(),
            reservation_id: resId
        };

        emailjs.send('service_x9pofkj', 'template_pj5pume', templateParams)
            .then(() => {
                alert(`¡Pago Exitoso! Comprobante enviado a ${session.email}`);
                
                // B. Guardar localmente
                guardarEnHistorial(resId, session, spot, total, hrs);
                
                // C. Redirigir
                window.location.href = 'search.html';
            })
            .catch(err => {
                console.error("EmailJS Error:", err);
                alert("Pago aprobado, pero hubo un error enviando el correo.");
            });
    }

    function guardarEnHistorial(resId, session, spot, total, hrs) {
        const reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
        reservations.push({
            id: resId,
            user: session.name,
            spot: spot.name,
            amount: total,
            hours: hrs,
            date: new Date().toLocaleString()
        });
        localStorage.setItem('parkly_reservations', JSON.stringify(reservations));
    }

    // Inicializar valores
    updateTotals();
});