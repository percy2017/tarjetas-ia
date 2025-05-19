# TarjetasIA - Creación y Alojamiento de Tarjetas Digitales

TarjetasIA es una aplicación web desarrollada con Node.js y Express.js, diseñada para facilitar la creación, personalización y gestión de tarjetas digitales interactivas. Cuenta con un panel de administración para la gestión de usuarios, tarjetas, multimedia y configuraciones. El proyecto está dockerizado para un despliegue sencillo.

## Características Principales

*   **Landing Page Informativa:** Presentación del servicio, beneficios, precios (placeholders) y FAQ.
*   **Sistema de Autenticación:** Login para acceder al panel de administración.
*   **Panel de Administración:**
    *   Dashboard principal.
    *   Gestión de Ventas (con DataTables, datos de prueba).
    *   Previsualizador de Tarjetas (generación básica de HTML/CSS/JS a partir de prompts).
    *   Gestor Multimedia (subida y visualización de imágenes, videos, PDFs).
    *   Página de Configuración (estructura para IA, Sockets, Evolution API).
*   **Diseño Responsivo:** Uso de Bootstrap 5.
*   **Modo Oscuro:** Disponible en el panel de administración.
*   **Dockerizado:** Listo para despliegue con Docker y Docker Compose.

## Tecnologías Utilizadas

*   **Backend:** Node.js, Express.js
*   **Frontend (Vistas):** EJS (Embedded JavaScript templates) con `ejs-mate`.
*   **Estilos:** Bootstrap 5, CSS personalizado.
*   **JavaScript Frontend:** jQuery, DataTables, SweetAlert2.
*   **Gestión de Sesiones:** `express-session`.
*   **Subida de Archivos:** `multer`.
*   **Variables de Entorno:** `dotenv` (para desarrollo).
*   **Contenerización:** Docker, Docker Compose.
*   **Base de Datos (Planeada):** MySQL.

## Requisitos Previos

*   Node.js (v18.x o superior recomendado)
*   npm (Node Package Manager)
*   Docker (para despliegue)
*   Docker Compose (para despliegue)
*   (Opcional para desarrollo) MySQL server si se implementa la conexión a base de datos.

## Instalación y Configuración (Desarrollo Local)

1.  **Clonar el repositorio (si aplica):**
    ```bash
    git clone [URL_DEL_REPOSITORIO]
    cd tarjetaas-ia 
    ```
2.  **Instalar dependencias:**
    ```bash
    npm install
    ```
3.  **Crear archivo de entorno:**
    Crea un archivo `.env` en la raíz del proyecto. Puedes copiar `.env.example` (si existiera) o usar la siguiente plantilla:
    ```env
    NODE_ENV=development
    PORT=3000
    SESSION_SECRET=desarrollo_secreto_temporal_12345!@#$ 
    DB_HOST=localhost
    DB_USER=root
    DB_PASS=tu_password_mysql_local_si_tienes
    DB_NAME=tarjetas_ia_db_local
    ```
    *   Ajusta `SESSION_SECRET` y las variables `DB_*` según tu configuración local.
4.  **Configurar Base de Datos (si aplica):**
    *   Asegúrate de tener un servidor MySQL corriendo.
    *   Crea la base de datos especificada en `DB_NAME`.
    *   (Eventualmente, se necesitarán migraciones o scripts para crear las tablas).

## Uso (Iniciar la Aplicación en Desarrollo)

1.  **Iniciar el servidor de desarrollo (con Nodemon):**
    ```bash
    npm run dev
    ```
2.  Abre tu navegador y ve a `http://localhost:3000` (o el puerto que hayas configurado en `.env`).
    *   Para el panel de administración: `http://localhost:3000/login` (Credenciales por defecto: `admin` / `password`).

## Despliegue (con Docker en un VPS)

1.  **Asegúrate de tener Docker y Docker Compose instalados en tu VPS.**
2.  **Prepara tu archivo `docker-compose.yml`:**
    *   Revisa el archivo `docker-compose.yml` incluido en el proyecto.
    *   **MUY IMPORTANTE:** Cambia el valor de `SESSION_SECRET` por una cadena larga, aleatoria y segura.
    *   Configura las variables de entorno para la base de datos (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`) con los valores de tu base de datos de producción.
    *   Ajusta otras variables de entorno si es necesario (APIs, etc.).
3.  **Transfiere los archivos del proyecto a tu VPS.**
    *   Asegúrate de que `.dockerignore` esté configurado para no copiar `node_modules` o el archivo `.env` local.
4.  **Construye y ejecuta los contenedores:**
    Desde el directorio del proyecto en tu VPS, ejecuta:
    ```bash
    sudo docker compose up --build -d
    ```
5.  La aplicación debería estar accesible en `http://[IP_DE_TU_VPS]:6000` (o el puerto que hayas mapeado en `docker-compose.yml`).

## Contribución

Si deseas contribuir, por favor sigue los siguientes pasos:
1.  Haz un Fork del proyecto.
2.  Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3.  Realiza tus cambios y haz commit (`git commit -am 'Añade nueva funcionalidad'`).
4.  Sube tus cambios a la rama (`git push origin feature/nueva-funcionalidad`).
5.  Abre un Pull Request.

## Licencia

(Especificar licencia si aplica, ej. MIT, GPL, etc. Si no, se puede omitir o indicar "Todos los derechos reservados.")

---

*Este README fue generado con la asistencia de una IA y puede requerir ajustes.*
