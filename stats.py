from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from datetime import date
import calendar
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=4000
    )

@app.get("/api/python/stats/occupancy-rate")
def get_occupancy_rate():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
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

@app.get("/api/python/stats/monthly-projection")
def get_monthly_projection():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
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
    
    today = date.today()
    last_day = calendar.monthrange(today.year, today.month)[1]
    days_left = last_day - today.day
    
    cursor.close()
    conn.close()
    return {"projected_earnings": round(daily_avg * days_left, 2)}

@app.get("/api/python/stats/top-spots")
def get_top_spots():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
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

def handler(request):
    return app(request)