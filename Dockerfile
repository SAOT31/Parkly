# Usar una computadora virtual ligera con Node.js instalado
FROM node:18-alpine

# Crear la carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiar la lista de compras (package.json)
COPY package*.json ./

# Instalar todas las herramientas (incluyendo cors, express, etc.)
RUN npm install

# Copiar el resto del código de Parkly
COPY . .

# Exponer el puerto 3000 para que podamos conectarnos
EXPOSE 3000

# El comando para encender el servidor
CMD ["node", "server.js"]