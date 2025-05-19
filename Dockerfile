# Usar una imagen base oficial de Node.js (versión LTS Alpine es una buena opción por tamaño)
FROM node:18-alpine

# Crear y definir el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json (o npm-shrinkwrap.json)
COPY package*.json ./

# Instalar dependencias de producción
# Usar --only=production o NODE_ENV=production npm install
# Para este ejemplo, asumimos que quieres solo las de producción.
# Si tienes scripts de build en devDependencies que necesitas, ajusta esto.
RUN npm install --production

# Copiar el resto del código de la aplicación al directorio de trabajo
COPY . .

# Exponer el puerto en el que la aplicación se ejecuta dentro del contenedor
# Este puerto se leerá de process.env.PORT en app.js, que por defecto es 3000
EXPOSE 3000

# Comando para iniciar la aplicación
# Asegúrate de que app.js sea el punto de entrada correcto
CMD [ "node", "app.js" ]
