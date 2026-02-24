# FILE: stats.py
# Ejecutar con: uvicorn stats:app --port 8000 --reload

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from datetime import date
import calendar

app = FastAPI()

# Permitir que el servidor de Node.js (puerto 3000) consulte a este (puerto 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de conexión con tus datos de DBeaver
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="1234", # Tu contraseña de MySQL
        database="parkly"
    )

# --- 1. INGRESOS POR DÍA DE LA SEMANA ---
@app.get("/stats/revenue-by-day")
def get_revenue_by_day():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Agrupamos por día de la semana usando la columna 'date' de tu tabla
    query = """
        SELECT DAYNAME(date) as day, SUM(total_amount) as total
        FROM reservations
        WHERE status = 'completed'
        GROUP BY day
        ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
    """
    cursor.execute(query)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results

# --- 2. TASA DE OCUPACIÓN GLOBAL ---
@app.get("/stats/occupancy-rate")
def get_occupancy_rate():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Calculamos el % de parqueaderos que tienen reservas 'in-use' o 'pending'
    query = """
        SELECT 
            (SELECT COUNT(DISTINCT parking_id) FROM reservations WHERE status IN ('pending', 'in-use')) as occupied,
            (SELECT COUNT(*) FROM parking_spots) as total_spots
    """
    cursor.execute(query)
    data = cursor.fetchone()
    rate = (data['occupied'] / data['total_spots'] * 100) if data['total_spots'] > 0 else 0
    cursor.close()
    conn.close()
    return {"occupancy_percentage": round(rate, 2)}

# --- 3. PROYECCIÓN MENSUAL DE INGRESOS ---
@app.get("/stats/monthly-projection")
def get_monthly_projection():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Promedio de ingresos diarios de los últimos 14 días
    query = """
        SELECT AVG(daily_sum) as daily_avg FROM (
            SELECT SUM(total_amount) as daily_sum 
            FROM reservations 
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND status = 'completed'
            GROUP BY date
        ) as subquery
    """
    cursor.execute(query)
    res = cursor.fetchone()
    daily_avg = float(res['daily_avg'] or 0)
    
    # Calcular días restantes del mes
    today = date.today()
    last_day = calendar.monthrange(today.year, today.month)[1]
    days_left = last_day - today.day
    
    cursor.close()
    conn.close()
    return {
        "projected_earnings": round(daily_avg * days_left, 2),
        "days_remaining": days_left
    }

# --- 4. RANKING DE PARQUEADEROS MÁS RENTABLES ---
@app.get("/stats/top-spots")
def get_top_spots():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Unimos reservations con parking_spots para obtener el nombre
    query = """
        SELECT p.name, SUM(r.total_amount) as total_revenue
        FROM reservations r
        JOIN parking_spots p ON r.parking_id = p.id
        WHERE r.status = 'completed'
        GROUP BY p.id
        ORDER BY total_revenue DESC
        LIMIT 5
    """
    cursor.execute(query)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results