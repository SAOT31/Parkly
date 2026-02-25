/**
 * ARCHIVO: js/payment.js
 * DESCRIPCIÓN: Procesa el pago, inicializa EmailJS y guarda en Base de Datos.
 */

// Inicializar EmailJS de forma segura
if (typeof emailjs !== 'undefined') {
    emailjs.init("un4LYOPByGrPFvTDj");
}

document.addEventListener('DOMContentLoaded', async () => {

    // Lógica del botón volver (reemplaza el onclick del HTML)
    document.getElementById('btn-back-details')?.addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
    });

    const params  = new URLSearchParams(window.location.search);
    const id      = params.get('id');
    const booking = JSON.parse(localStorage.getItem('parkly_booking'));

    // LECTURA DESDE BASE DE DATOS
    const spots = await DB.getSpots();
    const spot  = spots.find(s => s.id == id);

    if (!spot) {
        alert('Parqueadero no encontrado.');
        window.location.href = 'search.html';
        return;
    }

    const set = (elId, text) => {
        const el = document.getElementById(elId);
        if (el) el.textContent = text;
    };

    const sumImg = document.getElementById('summary-img');
    if (sumImg) { sumImg.src = spot.image || ''; sumImg.alt = spot.name; }

    set('summary-name',    spot.name);
    set('summary-address', spot.address);
    set('summary-rate',    `$ ${spot.price.toLocaleString('es-CO')} / hr`);

    let totalAmount = spot.price; 

    if (booking && booking.spotId == id) {
        totalAmount = booking.total;
        set('summary-date',     formatDate(booking.date));
        set('summary-time',     `${booking.startTime} – ${booking.endTime}`);
        set('summary-duration', `${booking.hours % 1 === 0 ? booking.hours : booking.hours.toFixed(1)} hr${booking.hours !== 1 ? 's' : ''}`);
        set('summary-subtotal', `$ ${booking.subtotal.toLocaleString('es-CO')}`);
        set('summary-fee',      `$ ${booking.fee.toLocaleString('es-CO')}`);
    }

    set('summary-total', `$ ${totalAmount.toLocaleString('es-CO')}`);
    set('btn-total',     totalAmount.toLocaleString('es-CO'));

    document.getElementById('btn-pay').addEventListener('click', () => {
        const session = JSON.parse(localStorage.getItem('parkly_session'));

        if (!session) {
            alert('Debes iniciar sesión para completar el pago.');
            window.location.href = 'login.html';
            return;
        }

        const resId = `PK-${Math.floor(Math.random() * 1000000)}`;

        const checkout = new WidgetCheckout({
            currency:      'COP',
            amountInCents: totalAmount * 100,
            reference:     resId,
            publicKey:     'pub_test_5YLBFidfXmksfQX5KonhVOD7bmVTeWma',
            customerData: {
                email:    session.email,
                fullName: session.name,
            },
        });

        checkout.open(function(result) {
            if (result.transaction.status === 'APPROVED') {
                ejecutarFlujoExito(session, resId);
            } else {
                alert('Pago no completado: ' + result.transaction.status);
            }
        });
    });

    async function ejecutarFlujoExito(session, resId) {

        const conn2   = document.getElementById('conn2');
        const step3Li = document.getElementById('step3-li');
        if (conn2)   conn2.classList.replace('bg-border', 'bg-primary');
        if (step3Li) {
            step3Li.querySelector('div').classList.remove('border-border', 'text-slate-500');
            step3Li.querySelector('div').classList.add('bg-primary', 'text-white', 'border-primary');
            step3Li.querySelector('span').classList.replace('text-slate-500', 'text-white');
        }

        try {
            await emailjs.send('service_x9pofkj', 'template_pj5pume', {
                user_name:      session.name,
                user_email:     session.email,
                spot_name:      spot.name,
                address:        spot.address,
                total:          totalAmount.toLocaleString('es-CO'),
                reservation_id: resId,
            });
        } catch (err) {
            console.error('EmailJS error:', err);
        }

        // GUARDADO EN BASE DE DATOS MYSQL (No en localStorage)
        const reservationData = {
            id: resId,
            spotId: spot.id,
            userEmail: session.email,
            date: booking?.date || new Date().toISOString().split('T')[0],
            startTime: booking?.startTime || '00:00',
            endTime: booking?.endTime || '00:00',
            amount: totalAmount,
            status: 'active'
        };

        if (typeof DB !== 'undefined' && DB.saveReservation) {
            await DB.saveReservation(reservationData);
        }

        localStorage.removeItem('parkly_booking');
        alert(`¡Pago exitoso! Comprobante enviado a: ${session.email}`);
        window.location.href = 'search.html';
    }
});

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}