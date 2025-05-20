# Avance del Proyecto: TarjetasIA

## 1. Resumen General del Proyecto

"TarjetasIA" es una aplicación web desarrollada con Node.js y Express.js, diseñada para la creación y gestión de tarjetas digitales (posiblemente de presentación, invitaciones, etc.), con un panel de administración para gestionar diversas funcionalidades. La aplicación ha sido recientemente dockerizada para su despliegue en un VPS.

## 2. Tecnologías Principales Utilizadas

*   **Backend:** Node.js, Express.js
*   **Frontend (Vistas):** EJS (Embedded JavaScript templates) con el motor `ejs-mate` para layouts.
*   **Estilos:** Bootstrap 5, CSS personalizado.
*   **JavaScript Frontend:** jQuery, DataTables, SweetAlert2, Bootstrap JS, **AlpacaJS**, **Handlebars.js** (dependencia de AlpacaJS).
*   **Gestión de Sesiones:** `express-session` (actualmente con `MemoryStore`).
*   **Subida de Archivos:** `multer`.
*   **Variables de Entorno (Desarrollo):** `dotenv`.
*   **Base de Datos:** MySQL, con gestión de esquemas y seeds mediante **Knex.js**.
*   **Hashing de Contraseñas:** **bcryptjs**.
*   **Contenerización y Despliegue:** Docker, Docker Compose.

## 3. Estado Actual del Proyecto

El proyecto cuenta con una landing page, un sistema de **login conectado a una base de datos MySQL (tabla `users`)**, y un panel de administración con varias secciones funcionales y mejoras en la interfaz de usuario. La gestión del esquema de la base de datos se realiza con **Knex.js (migraciones y seeds)**. La aplicación ha sido configurada para usar variables de entorno y se han creado los archivos necesarios para su despliegue con Docker (`Dockerfile`, `docker-compose.yml`, `.dockerignore`). La aplicación se ha desplegado exitosamente en un VPS en `http://154.38.177.115:6001/`.

## 4. Detalle de Funcionalidades Implementadas

### 4.1. Aplicación Base y Configuración (`app.js`)

*   Servidor Express escuchando en un puerto configurable (default 3000, `process.env.PORT`).
*   Motor de plantillas EJS configurado con `ejs-mate`.
*   Servicio de archivos estáticos desde `./public`.
*   `body-parser` para `urlencoded` form data.
*   `express-session` configurado con `process.env.SESSION_SECRET`.
    *   **Advertencia Actual:** Usa `MemoryStore` por defecto, no recomendado para producción.
*   Carga de variables de entorno desde `.env` usando `dotenv` para desarrollo.
*   Rutas principales definidas:
    *   `/`: Landing page.
    *   `/login`: Página de login (GET y POST).
    *   `/logout`: Cierre de sesión.
    *   Rutas protegidas bajo `/admin/*` usando el middleware `requireLogin`.
    *   **Ruta `POST /admin/previsualizador`:** Ahora utiliza un servicio (`services/aiService.js`) para interactuar con la API de IA. Lee la configuración de la API (URL, Key, y Prompt del Sistema) desde la base de datos (`configs`), envía el prompt del usuario, procesa la respuesta estructurada (HTML, CSS, JS), escribe los archivos correspondientes en `public/cliente_prueba/`, y configura la sesión para mostrar la previsualización en un iframe.
    *   **Ruta `GET /admin/previsualizador`:** Ahora intenta cargar automáticamente una previsualización existente desde `public/cliente_prueba/index.html` si está disponible y no hay una URL de previsualización en la sesión.
    *   **Ruta `POST /admin/configuracion/secciones/crear`:** Nueva ruta para manejar la creación de nuevas secciones de configuración y la definición de sus campos desde la interfaz de usuario.

### 4.1.1. Servicios (`services/`)
*   **`services/aiService.js`:**
    *   Nuevo módulo para encapsular la lógica de interacción con las APIs de modelos de lenguaje grandes (IA).
    *   Contiene la función `generateLlamaCompletion(userPrompt)` que:
        *   Obtiene la configuración de la API Llama (URL, API Key, y Prompt del Sistema) desde la tabla `configs` de la base de datos.
        *   Construye y envía la solicitud a la API Llama.
        *   Procesa la respuesta de la IA, esperando un JSON con `html_code`, `css_code`, y `js_code`.
        *   Devuelve un objeto estructurado `{ html, css, js }` y los tokens consumidos. *(Nota: La devolución y el registro de tokens consumidos aún está pendiente de implementación completa en `app.js`)*.

### 4.2. Vistas y Frontend

*   **`views/index.ejs` (Landing Page):**
    *   Diseño responsivo con Bootstrap.
    *   Secciones: Carrusel, Sobre Nosotros, Beneficios, Precios (placeholders), FAQ (acordeón).
    *   Barra de navegación con logo SVG inline y enlaces a secciones y login.
    *   Favicon SVG inline.
*   **`views/login.ejs`:**
    *   Diseño personalizado (`public/css/login.css`) inspirado en WordPress.
    *   Logo SVG inline.
    *   Formulario de login (usuario, contraseña).
    *   Botón "Loguearse con WhatsApp" (visual, sin funcionalidad).
    *   Enlace para volver a la landing page.
    *   Favicon SVG inline.
*   **`views/layouts/adminLayout.ejs` (Layout del Panel de Admin):**
    *   Estructura base para todas las páginas del admin.
    *   Barra superior con nombre del proyecto, breadcrumbs, switch de Dark Mode, avatar de usuario (placeholder) y botón de Salir.
    *   Barra lateral de navegación con enlaces a: Panel, Ventas, Previsualizador, Multimedia, Configuración.
    *   Carga de CSS comunes en el `<head>`: Bootstrap, `admin.css`, `dark-mode.css`, `dataTables.dataTables.min.css`, y **`alpaca.min.css` (para AlpacaJS, servido localmente desde `public/css/`)**.
    *   Utiliza `<%- block('pageStyles') %>` en el `<head>` para permitir a las vistas hijas inyectar CSS adicional específico.
    *   Carga de JS comunes al final del `<body>` (antes del bloque de scripts de página): `jquery.min.js`, `dataTables.core.js`, `dataTables.dataTables.min.js`, `bootstrap.bundle.min.js`, `sweetalert2.all.min.js`, **`handlebars.min.js` (CDN, dependencia de AlpacaJS)**, y **`alpaca.min.js` (para AlpacaJS, servido localmente desde `public/js/`)**. También incluye scripts para Dark Mode y lógica de la sidebar de perfil de usuario.
    *   Utiliza `<%- block('pageScripts') %>` al final del `<body>` para permitir a las vistas hijas inyectar JavaScript adicional específico.
    *   Favicon SVG inline.
    *   **Sidebar de Perfil de Usuario:** Ahora muestra información más completa del usuario en sesión, incluyendo: imagen de avatar (si `avatar_url` existe), nombre de usuario, nombre completo, correo, teléfono, rol, **tokens usados**, URL del perfil (basada en `profile_slug`), y fecha de registro ("Miembro desde").
*   **`views/admin.ejs` (Dashboard Admin):**
    *   Página de bienvenida **ahora muestra el nombre del usuario en sesión.**
*   **`views/previsualizador.ejs`:**
    *   Formulario para ingresar un "prompt" para la IA.
    *   **Muestra la página web generada por la IA dentro de un `<iframe>`**.
    *   Al cargar la página, intenta mostrar automáticamente la última previsualización generada si los archivos existen en `public/cliente_prueba/`.
    *   Muestra mensajes de éxito o error relacionados con la generación de la previsualización.
    *   La generación de archivos (`index.html`, `styles.css`, `script.js`) en `public/cliente_prueba/` se basa en la respuesta estructurada (HTML, CSS, JS) obtenida de la API de IA.
*   **`views/multimedia.ejs`:**
    *   Formulario para subir múltiples archivos usando `multer` (guardados en `public/uploads/`). **Controles de subida, búsqueda y botón ahora en una sola fila.**
    *   Muestra los archivos subidos con previsualizaciones en una **cuadrícula rediseñada estilo WordPress (miniaturas cuadradas y uniformes)**.
    *   **Mejoras en previsualizaciones:** Icono específico para PDF en la grilla, previsualización de video funcional en el sidebar.
    *   **Búsqueda de multimedia del lado del cliente implementada.**
    *   Barra lateral de detalles que aparece al hacer clic en un archivo, mostrando nombre, URL pública y botón para copiar URL (usa SweetAlert2 para notificaciones). **Ajustes de modo oscuro y altura del sidebar de detalles implementados.**
*   **`views/ventas.ejs`:**
    *   Muestra datos de ventas desde `public/data/ventas.json`.
    *   Utiliza DataTables para una tabla interactiva (paginación, búsqueda, ordenamiento).
    *   El script de inicialización de DataTables se carga mediante el bloque `pageScripts` del layout, usando la sintaxis `block().append()`.
*   **`views/configuracion.ejs`:**
    *   **Página de configuración dinámica renderizada a partir de datos de la tabla `configs` de la base de datos.**
    *   Muestra un acordeón de Bootstrap donde cada ítem representa una sección de configuración (ej: Modelo IA, Socket.IO, Evolution API).
    *   **Los formularios dentro de cada sección se generan dinámicamente usando la librería AlpacaJS.** La estructura de cada formulario (campos, etiquetas, tipos de input) se define en una columna JSON (`fields_config_json`) en la tabla `configs`.
    *   Los valores actuales de configuración se cargan desde la base de datos y se muestran en los formularios.
    *   Permite guardar los cambios, que se persisten actualizando los valores en la columna `fields_config_json` de la tabla `configs`.
    *   **Incluye un modal para "Añadir Nueva Sección", permitiendo al administrador definir dinámicamente nuevas secciones de configuración y los campos (clave, etiqueta, tipo, etc.) que contendrán.** Esta estructura se guarda en `fields_config_json`.
    *   La lógica de inicialización de AlpacaJS y la carga de datos para los formularios, así como la gestión del modal, se maneja en un script específico de la página, inyectado mediante `<% block('pageScripts').append(\`...\`) %>`.
    *   El CSS específico de AlpacaJS se carga globalmente a través del layout.

### 4.3. Autenticación (`routes/auth.js`)

*   Ruta GET `/login`: Renderiza `login.ejs`. Redirige a `/admin` si ya está logueado.
*   Ruta POST `/login`: Valida credenciales contra la tabla `users`. Compara contraseñas hasheadas con `bcryptjs`. Establece `req.session.loggedIn = true` y `req.session.user`. **El objeto `req.session.user` ahora incluye `id, username, email, first_name, last_name, phone, avatar_url, role, tokens_used, profile_slug, created_at`.** Solo permite acceso a `/admin` si el rol es 'admin'.
*   Ruta GET `/logout`: Destruye la sesión y redirige a `/login`.

### 4.4. Middleware y Configuración Adicional en `app.js`
*   Middleware para pasar `req.session.user` a `res.locals.currentUser`, haciéndolo disponible globalmente en las plantillas EJS.

## 5. Configuración de Base de Datos (Knex.js)
*   **`knexfile.cjs`:** Archivo de configuración de Knex para entornos de desarrollo y producción, especificando cliente `mysql2`, detalles de conexión y directorios para migraciones y seeds. Adaptado para funcionar en un proyecto con `"type": "module"` usando la extensión `.cjs`.
*   **`db.cjs`:** Módulo para centralizar la inicialización y exportación de la instancia de Knex para ser usada en la aplicación.
*   **Migraciones (`db/migrations/`):**
    *   `YYYYMMDDHHMMSS_create_users_table.cjs`: Define el esquema para la tabla `users`. **Actualizada para incluir `tokens_used` (INTEGER, default 0, para rastrear consumo de IA) y `profile_slug` (VARCHAR, unique, nullable, para URL de perfil de usuario).**
    *   `YYYYMMDDHHMMSS_create_configs_table.cjs`: Define el esquema para la tabla `configs` (almacena definición y valores de configuraciones dinámicas).
    *   **`YYYYMMDDHHMMSS_create_cards_table.cjs`:** Define el esquema para la nueva tabla `cards` para permitir múltiples tarjetas por usuario. Incluye `id`, `user_id` (FK a `users`), `title`, `slug` (único para la URL de la tarjeta), `status` (enum: draft, published, etc.), `content_json` (para el contenido de la tarjeta), `is_default` (boolean), y `timestamps`.
*   **Seeds (`db/seeds/`):**
    *   `01_create_admin_user.cjs`: Script para poblar la tabla `users` con un usuario administrador inicial (ahora incluye valores por defecto para `tokens_used` y `profile_slug` si la migración los define así).
    *   **`02_populate_initial_configs.cjs`:** **Eliminado.** Las configuraciones iniciales y la estructura de sus campos ahora se gestionan dinámicamente desde la interfaz de usuario de `/admin/configuracion`.

## 6. Estructura de Archivos Clave

*   `app.js`: Archivo principal del servidor Express.
*   `.env`: Variables de entorno para desarrollo.
*   `Dockerfile`: Instrucciones para construir la imagen Docker.
*   `.dockerignore`: Archivos a ignorar al construir la imagen Docker.
*   `docker-compose.yml`: Define el servicio Docker para la aplicación.
*   `package.json`: Dependencias y scripts del proyecto.
*   `public/`: Carpeta para archivos estáticos.
    *   `css/`: Hojas de estilo (Bootstrap, admin, login, dark-mode, DataTables, SweetAlert2).
    *   `js/`: Scripts de frontend (jQuery, DataTables, SweetAlert2, Bootstrap).
    *   `images/`: Imágenes (avatar.svg, favicon.svg).
    *   `uploads/`: Carpeta para archivos subidos por el usuario (persistida con volumen en Docker).
    *   `data/`: Datos de prueba (ventas.json).
*   `routes/`: Archivos de rutas (auth.js).
*   `views/`: Plantillas EJS.
    *   `layouts/adminLayout.ejs`: Layout principal del panel de administración.
    *   Otras vistas para cada página.

## 7. Configuración de Despliegue (Docker)

*   **`Dockerfile`:**
    *   Base: `node:18-alpine`.
    *   Copia `package*.json`, instala dependencias de producción.
    *   Copia el resto de la aplicación.
    *   Expone el puerto 3000.
    *   Comando de inicio: `node app.js`.
*   **`.dockerignore`:**
    *   Excluye `node_modules`, `.git`, `.env`, archivos Docker, logs, etc.
*   **`docker-compose.yml`:**
    *   Servicio `app`.
    *   Construye desde el `Dockerfile` local.
    *   Mapeo de puertos: `6000:3000` (host:contenedor).
    *   Volumen: `./public/uploads:/usr/src/app/public/uploads` para persistir archivos subidos.
    *   `restart: always`.
    *   Variables de entorno para producción:
        *   `NODE_ENV=production`
        *   `PORT=3000` (interno al contenedor)
        *   `SESSION_SECRET`: Placeholder, **NECESITA SER CAMBIADO POR UNA CLAVE SEGURA EN PRODUCCIÓN.**
        *   Placeholders para `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`.
        *   Comentarios para futuras variables de IA, Sockets, Evolution API.

## 7. Puntos Pendientes y Próximas Mejoras (Identificados)

*   **Almacén de Sesiones Persistente:** Reemplazar `MemoryStore` por defecto de `express-session` con una solución como `connect-redis` o una basada en MySQL (ej. `connect-session-knex`) para producción.
*   **Conexión a Base de Datos MySQL:** **Realizado parcialmente.**
    *   Driver `mysql2` instalado.
    *   Lógica de conexión implementada mediante `knexfile.cjs` y `db.cjs`.
    *   Tabla `users` creada mediante migración Knex.
*   **Autenticación con Base de Datos:** **Realizado.** Lógica de login modificada para usar la tabla `users` y `bcryptjs`.
*   **Crear Migraciones para Tablas Restantes:**
    *   Definir y crear migraciones para `media_files` (para metadatos de archivos subidos).
    *   ~~Definir y crear migraciones para `app_config`~~ **(Realizado, ahora es tabla `configs`)**.
*   **Integrar `media_files` con Sección Multimedia:**
    *   Guardar metadatos en `media_files` al subir archivos.
    *   Leer de `media_files` para mostrar la galería y detalles.
*   **Funcionalidad de Guardado en Configuración:** **Realizado y Mejorado.** El backend guarda los datos de los formularios de `/admin/configuracion` en la tabla `configs`. La UI ahora permite crear nuevas secciones de configuración y definir sus campos dinámicamente.
*   **Previsualizador de IA:**
    *   Integrado con API Llama (configurable).
    *   Genera archivos HTML, CSS, JS.
    *   Muestra previsualización en iframe.
    *   Utiliza prompt de sistema configurable desde la BD.
*   **Seguridad de `SESSION_SECRET`:** Generar y usar una clave `SESSION_SECRET` fuerte y única en el `docker-compose.yml` para el entorno de producción.
*   **Valores de Producción en `docker-compose.yml`:** Reemplazar todos los placeholders de variables de entorno (DB, APIs) con los valores reales de producción.
*   **(Opcional) Eliminar `version` de `docker-compose.yml`:** Para evitar la advertencia de Docker Compose.
    *   **(Opcional) HTTPS:** Considerar un proxy inverso (Nginx, Traefik) para HTTPS si la aplicación va a manejar datos sensibles o requiere una conexión segura.
    *   **(Opcional) Funcionalidad "Loguearse con WhatsApp":** Implementar la lógica real para esta característica.
    *   **Implementar lógica para actualizar `users.tokens_used`** después de cada llamada exitosa a la API de IA que consuma tokens.
    *   **Desarrollar la funcionalidad completa para la gestión de múltiples `cards` por usuario:** CRUD para tarjetas (crear, leer, actualizar, eliminar, cambiar estado), listado de tarjetas del usuario, etc.
    *   **Implementar las rutas públicas y la lógica para mostrar las tarjetas publicadas** usando `cards.slug`.
    *   **Implementar las rutas públicas y la lógica para los perfiles de usuario** usando `users.profile_slug` (que podría listar las tarjetas publicadas del usuario o mostrar una tarjeta por defecto).
    *   **Resolver error 404 para `placeholder.jpg`** en el previsualizador (añadir imagen o usar servicio de placeholder).
    *   **Considerar el uso de carpetas únicas para cada previsualización generada** en lugar de sobrescribir `public/cliente_prueba/`.

## 9. Instrucciones para Continuar

*   **Desarrollo Local:**
    1.  Asegurarse de tener Node.js y npm instalados.
    2.  Configurar MySQL y crear la base de datos (ej. `dbjs`).
    3.  Crear/actualizar el archivo `.env` con las configuraciones locales (DB_USER, DB_PASS, DB_NAME, SESSION_SECRET, etc.).
    4.  Ejecutar `npm install` para instalar dependencias (incluyendo `knex`, `mysql2`, `bcryptjs`).
    5.  Asegurarse de que `knexfile.js` esté eliminado o renombrado, dejando solo `knexfile.cjs`.
    6.  Ejecutar migraciones: `npx knex migrate:latest --knexfile ./knexfile.cjs`.
    7.  (Opcional) Ejecutar seeds: `npx knex seed:run --knexfile ./knexfile.cjs`.
    8.  Ejecutar `npm run dev` (que usa Nodemon) para iniciar el servidor de desarrollo.
    9.  Acceder a `http://localhost:3000` (o el puerto definido en `.env`).
*   **Despliegue/Actualización en VPS (con Docker):**
    1.  Asegurarse de que Docker y Docker Compose estén instalados en el VPS.
    2.  **Configurar la Base de Datos en el VPS:** Asegurarse de que la base de datos MySQL esté creada y accesible para la aplicación.
    3.  Actualizar el `docker-compose.yml` en el VPS con los secretos y configuraciones de producción correctos (credenciales de la base de datos, `SESSION_SECRET`, etc.).
    4.  Transferir los archivos actualizados del proyecto al VPS (excluyendo `node_modules` y `.env`).
    5.  **Ejecutar Migraciones y Seeds en el VPS (Importante para la primera vez o después de cambios de esquema):**
        *   Conectarse al VPS.
        *   Navegar al directorio del proyecto.
        *   Asegurarse de que las dependencias estén instaladas (si no se construyen en la imagen Docker, o si se necesita Knex CLI globalmente): `npm install` (o `npm ci --only=production` si es adecuado).
        *   Ejecutar migraciones: `npx knex migrate:latest --knexfile ./knexfile.cjs --env production` (asumiendo que tienes una configuración de `production` en `knexfile.cjs` que apunta a la BD del VPS).
        *   Ejecutar seeds (solo el seed del usuario admin, ya que el de configs fue eliminado): `npx knex seed:run --knexfile ./knexfile.cjs --env production`.
    6.  **Construir y Ejecutar Contenedores Docker:**
        *   Desde el directorio del proyecto en el VPS, ejecutar: `sudo docker compose down && sudo docker compose up --build -d` (el `down` es para detener y remover contenedores anteriores si existen).
    7.  Acceder a la aplicación a través de `http://IP_DEL_VPS:6000`.

Este prompt debería proporcionar un contexto completo del estado actual del proyecto TarjetasIA.
