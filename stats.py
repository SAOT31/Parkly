import os
import mysql.connector
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import pandas as pd

# Cargar variables de entorno del archivo .env
load_dotenv()

app = FastAPI()

# Configuracion de CORS para permitir que Node.js (puerto 3000) consulte a Python (puerto 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    """Establece conexion con TiDB Cloud usando las variables del .env"""
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            port=int(os.getenv("DB_PORT", 4000)),
            ssl_verify_identity=True,
            ssl_ca=None # TiDB Cloud usa SSL por defecto
        )
    except Exception as e:
        print(f"Error de conexion a base de datos: {e}")
        return None

# --- ENDPOINTS DE ANALITICA ---

@app.get("/api/python/stats/monthly-projection")
async def get_monthly_projection():
    """Calcula la proyeccion de ingresos mensuales basada en los precios de los parqueaderos"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        # Usamos owner_id como aparece en tu DBeaver
        query = "SELECT price_hour FROM parking_spots WHERE status = 'approved'"
        df = pd.read_sql(query, conn)
        
        if df.empty:
            return {"projection": 0}
            
        # Calculo simple: Precio promedio * 8 horas diarias * 30 dias
        total_projection = df['price_hour'].mean() * 8 * 30
        return {"projection": round(total_projection, 2)}
    finally:
        conn.close()

@app.get("/api/python/stats/occupancy-rate")
async def get_occupancy_rate():
    """Calcula el porcentaje de ocupacion comparando reservas vs espacios totales"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cursor = conn.cursor()
        # Contar total de parqueaderos aprobados
        cursor.execute("SELECT COUNT(*) FROM parking_spots WHERE status = 'approved'")
        total_spots = cursor.fetchone()[0]
        
        # Contar reservas activas (no canceladas)
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE status != 'cancelled'")
        active_reservations = cursor.fetchone()[0]
        
        if total_spots == 0:
            return {"occupancy_rate": 0}
            
        rate = (active_reservations / total_spots) * 100
        return {"occupancy_rate": round(min(rate, 100), 1)}
    finally:
        conn.close()

@app.get("/api/python/stats/top-spots")
async def get_top_spots():
    """Obtiene los 3 parqueaderos mas reservados"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        query = """
            SELECT p.name, COUNT(r.id) as reservation_count 
            FROM parking_spots p
            JOIN reservations r ON p.id = r.spotId
            GROUP BY p.id
            ORDER BY reservation_count DESC
            LIMIT 3
        """
        df = pd.read_sql(query, conn)
        return df.to_dict(orient="records")
    finally:
        conn.close()

# --- MOTOR DE ARRANQUE LOCAL ---
# Este bloque es ignorado por Vercel, pero vital para tu PC
if __name__ == "__main__":
    import uvicorn
    print("Iniciando servicio de metricas Parkly...")
    uvicorn.run(app, host="0.0.0.0", port=8000)