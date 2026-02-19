/**
 * ARCHIVO: js/payment.js
 * DESCRIPCIÓN: Lógica para calcular precios y simular pago.
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

    // Referencias DOM
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

    // Estado inicial
    let hours = 1;
    let pricePerHour = spot.price;

    // Cargar datos estáticos
    sumImg.src = spot.image;
    sumName.innerText = spot.name;
    sumAddr.innerText = spot.address;
    sumRate.innerText = `$ ${pricePerHour.toLocaleString()}`;

    // Función de Recálculo
    const updateTotals = () => {
        const total = hours * pricePerHour;
        const totalStr = `$ ${total.toLocaleString()}`;
        
        sumDur.innerText = `${hours} hour${hours > 1 ? 's' : ''}`;
        sumTotal.innerText = totalStr;
        btnTotalSpan.innerText = total.toLocaleString();
    };

    // Eventos Duración
    durationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover activo de todos
            durationBtns.forEach(b => {
                b.classList.remove('active', 'border-primary', 'bg-primary/20', 'text-white');
                b.classList.add('border-border', 'bg-[#0f172a]', 'text-slate-400');
            });
            // Activar actual
            btn.classList.remove('border-border', 'bg-[#0f172a]', 'text-slate-400');
            btn.classList.add('active', 'border-primary', 'bg-primary/20', 'text-white');
            
            hours = parseInt(btn.getAttribute('data-hours'));
            updateTotals();
        });
    });

    // Eventos Método de Pago (Visual)
    paymentMethods.forEach(btn => {
        btn.addEventListener('click', () => {
            paymentMethods.forEach(b => b.classList.remove('border-primary', 'bg-primary/5'));
            btn.classList.add('border-primary', 'bg-primary/5');
        });
    });

    // Acción de Pagar (Simulada)
    btnPay.addEventListener('click', () => {
        // Aquí iría la integración real (Stripe/Wompi)
        // Por ahora, simulamos éxito.
        
        btnPay.innerHTML = `<i data-lucide="loader-2" class="animate-spin w-5 h-5"></i> Processing...`;
        lucide.createIcons();

        setTimeout(() => {
            alert(`Payment Successful!\nReserved ${spot.name} for ${hours} hours.`);
            window.location.href = 'search.html'; // Volver a búsqueda o a un dashboard de cliente si existiera
        }, 1500);
    });

    // Init
    updateTotals();
});