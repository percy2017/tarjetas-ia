# Avance del Proyecto: TarjetasIA

## 1. Resumen General del Proyecto

"TarjetasIA" es una aplicación web desarrollada con Node.js y Express.js, diseñada para la creación y gestión de tarjetas digitales (posiblemente de presentación, invitaciones, etc.), con un panel de administración para gestionar diversas funcionalidades. La aplicación ha sido recientemente dockerizada para su despliegue en un VPS.

## 2. Tecnologías Principales Utilizadas

*   **Backend:** Node.js, Express.js
*   **Frontend (Vistas):** EJS (Embedded JavaScript templates) con el motor `ejs-mate` para layouts.
*   **Estilos:** Bootstrap 5, CSS personalizado.
*   **JavaScript Frontend:** jQuery, DataTables, SweetAlert2, Bootstrap JS, **AlpacaJS**, **Handlebars.js** (dependencia de AlpacaJS), **intl-tel-input**.
*   **Gestión de Sesiones:** `express-session` (actualmente con `MemoryStore`).
*   **Mensajes Flash:** `connect-flash`.
*   **Subida de Archivos:** `multer`.
*   **Variables de Entorno (Desarrollo):** `dotenv`.
*   **Base de Datos:** MySQL, con gestión de esquemas y seeds mediante **Knex.js**.
*   **Hashing de Contraseñas:** **bcryptjs**.
*   **Generación de Contraseñas:** `generate-password`.
*   **Envío de Correos:** `Nodemailer`.
*   **Comunicación en Tiempo Real:** **Socket.IO**.
*   **Integración API Externa (WhatsApp):** `axios` para interactuar con Evolution API.
*   **Contenerización y Despliegue:** Docker, Docker Compose.

## 3. Estado Actual del Proyecto (Actualizado)

El proyecto cuenta con una landing page y un sistema de **login y registro de usuarios (roles 'admin' y 'client')**. Durante el registro, se genera automáticamente un `profile_slug` para el usuario. El panel de administración (`/admin`) es accesible por usuarios logueados, con ciertas secciones restringidas por rol.

Se ha implementado un **editor de menús dinámico** (`/admin/menu-editor`, accesible solo por 'admin') que permite el CRUD completo de ítems de menú. El menú lateral del panel de administración (`views/layouts/adminLayout.ejs`) ahora se genera dinámicamente basado en estos ítems y los roles del usuario actual.

Se ha comenzado la implementación de la **gestión de tarjetas digitales (`cards`)**:
*   La tabla `cards` en la base de datos incluye campos para `original_prompt` y `tokens_cost`.
*   El flujo de creación de tarjetas se inicia desde el Previsualizador (`/admin/previsualizador`):
    *   El usuario ingresa un prompt, la IA genera contenido (HTML, CSS, JS).
    *   El servicio `aiService.js` parsea la respuesta de la IA (JSON o string con formato de objeto JS) de forma robusta.
    *   La ruta `POST /admin/previsualizador` en `app.js` devuelve el contenido generado como JSON al frontend.
    *   El frontend (`views/previsualizador.ejs` y su JS) muestra el contenido en un iframe y permite al usuario guardarlo como una nueva tarjeta.
    *   Al guardar, se envían el título, prompt y contenido a `POST /admin/cards`.
    *   La ruta `POST /admin/cards` (en `routes/cards.js`) crea un directorio único (`public/cards/:profile_slug/:card_slug/`), guarda los archivos HTML/CSS/JS, registra la tarjeta en la BD (con `original_prompt` y `tokens_cost` fijo en 1 por ahora), y actualiza `users.tokens_used`.
*   Se ha creado una página `/admin/cards` para listar las tarjetas del usuario, utilizando DataTables para la visualización.

**Desafíos y Soluciones Implementadas:**
*   **Errores de Sintaxis EJS con `block('pageScripts').append()`:** Se encontraron problemas recurrentes al intentar incrustar bloques de JavaScript complejos directamente en las plantillas EJS usando `ejs-mate`. La solución más efectiva fue externalizar estos scripts a archivos `.js` separados (ej. `public/js/admin-menu-editor.js`, `public/js/admin-cards-datatable.js`) y luego enlazarlos en la plantilla con `<% block('pageScripts').append('<script src="/ruta/al/script.js"></script>') %>`. Esto evitó los errores de parseo de EJS.
*   **Parseo de Respuesta de IA:** La respuesta de la API de Llama a veces no era un JSON estrictamente válido (contenía backticks). Se implementó una lógica de parseo más robusta en `services/aiService.js` que intenta `JSON.parse()` y, como fallback, usa expresiones regulares.
*   **Errores 403 en Previsualizador:** Se solucionaron eliminando las etiquetas `<link rel="stylesheet" href="styles.css">` y `<script src="script.js"></script>` del HTML generado por la IA antes de inyectarlo en el iframe del previsualizador.
*   **Gestión de Rutas y Middlewares:** Se ajustó el orden de definición de rutas en `app.js` para asegurar que las rutas específicas (ej. `/admin/previsualizador`) se manejen antes que los routers más generales (ej. `adminMenuRouter`) para evitar conflictos de middlewares de autorización.
*   **Dependencias Faltantes:** Se instaló `fs-extra` cuando fue necesario.
*   **Errores de Referencia:** Se corrigieron errores como `upload is not defined` y `successMessage is not defined` ajustando el orden de definición de variables o la forma de acceder a ellas.
*   **Error de Ruta de Layout con `ejs-mate`:** Se corrigió un error `ENOENT (No such file or directory)` relacionado con la forma en que las vistas en subdirectorios (ej. `views/admin/`) referenciaban al layout principal. La solución fue cambiar la referencia de `<%- layout('../layouts/adminLayout') %>` a `<%- layout('layouts/adminLayout') %>`, asegurando que la ruta al layout se resuelva correctamente desde el directorio base de `views`.

La aplicación se despliega con Docker y está accesible en un VPS.

## 4. Detalle de Funcionalidades Implementadas (Actualizado)

### 4.1. Aplicación Base y Configuración (`app.js`)

*   Servidor Express escuchando en un puerto configurable (default 3000, `process.env.PORT`).
*   Motor de plantillas EJS configurado con `ejs-mate`.
*   Servicio de archivos estáticos desde `./public` (y `./node_modules` para algunas librerías de frontend si es necesario, aunque se prefiere copiar a `public/vendor`).
*   `body-parser` para `urlencoded` form data.
*   `express-session` configurado con `process.env.SESSION_SECRET`.
    *   **Advertencia Actual:** Usa `MemoryStore` por defecto, no recomendado para producción.
*   Configuración de `connect-flash` para mensajes flash.
*   Middleware global para pasar `currentUser` y mensajes flash (`successMessage`, `errorMessage`) a `res.locals`.
*   Carga de variables de entorno desde `.env` usando `dotenv` para desarrollo.
*   Rutas principales definidas:
    *   `/`: Landing page.
    *   Rutas de autenticación (`/login`, `/register`, `/logout`) manejadas por `routes/auth.js`.
    *   Rutas del editor de menú del panel (`/admin/menu-editor`) manejadas por `routes/adminMenu.js`.
    *   Otras rutas protegidas bajo `/admin/*` usando el middleware `requireLogin`.
*   **Ruta `POST /admin/previsualizador`:** Utiliza `services/aiService.js`. Lee config de API desde BD (`configs`), envía prompt a la IA. Devuelve el contenido generado (HTML, CSS, JS) como JSON al frontend para previsualización dinámica.
    *   **Ruta `GET /admin/previsualizador`:** Permite iniciar la creación de una nueva tarjeta (`?action=new`) o (pendiente) cargar una tarjeta existente para editar o la última creada.
*   **Ruta `POST /admin/configuracion/secciones/crear`:** Creación de nuevas secciones de configuración.
*   **Rutas para Tarjetas (`routes/cards.js` montado en `/admin/cards`):**
    *   `GET /`: Lista las tarjetas del usuario actual (usa DataTables).
    *   `POST /`: Crea una nueva tarjeta, guarda archivos en `public/cards/:profile_slug/:card_slug/`, registra en BD (incluyendo `original_prompt`, `tokens_cost`), y actualiza `users.tokens_used`.
*   **Rutas para Edición de Perfil (`routes/profile.js` montado en `/admin/profile`):**
    *   `GET /edit`: Muestra el formulario de edición de perfil.
    *   `POST /edit`: Procesa la actualización de los datos del perfil del usuario (`first_name`, `last_name`, `phone`, `avatar_url`).

### 4.1.1. Servicios (`services/`) (Actualizado)
*   **`services/aiService.js`:**
    *   Encapsula la lógica de interacción con APIs de IA (Llama).
    *   Obtiene config de API desde la tabla `configs`.
    *   Procesa la respuesta de la IA (que puede no ser JSON estricto) de forma robusta, intentando `JSON.parse()` y usando expresiones regulares como fallback para extraer `html_code`, `css_code`, `js_code`.
*   **`services/notificationService.js` (Actualizado):**
    *   Función `sendWelcomeEmail(userData, generatedPassword)`:
        *   Obtiene configuración SMTP de la tabla `configs` (sección `smtp_settings`).
        *   Utiliza `Nodemailer` para enviar un correo de bienvenida.
    *   **Nueva Función `sendWelcomeWhatsApp(userData, generatedPassword, whatsappPhoneNumber)`:**
        *   Obtiene configuración de Evolution API (URL base, API Key) desde la tabla `configs` (sección `evolution_api`).
        *   Llama al endpoint `/instance/fetchInstances` de Evolution API para obtener instancias activas.
        *   Itera sobre las instancias activas e intenta enviar un mensaje de bienvenida de WhatsApp a través del endpoint `/message/sendText/{instanceName}`.
        *   Maneja el éxito o fallo del envío.
*   **`services/socketService.js` (Nuevo):**
    *   Encapsula la inicialización y configuración del servidor Socket.IO.
    *   Maneja conexiones de clientes, desconexiones y eventos básicos.
    *   Proporciona una función `getIoInstance()` para acceder a la instancia de `io` desde otros módulos (aunque actualmente se pasa `io` a `req` en `app.js`).

### 4.2. Vistas y Frontend

*   **`views/index.ejs` (Landing Page):** Sin cambios recientes significativos.
*   **`views/login.ejs`:**
    *   Añadido enlace "Regístrate aquí" a `/register`.
*   **`views/register.ejs` (Nueva Vista):**
    *   Formulario de registro solicitando Nombres, Apellidos, Correo Electrónico y Teléfono.
    *   Integración de `intl-tel-input` para el campo de teléfono, con archivos servidos desde `public/vendor/intl-tel-input/`.
*   **`views/layouts/adminLayout.ejs`:**
    *   El breadcrumb espera la variable `currentPage`.
    *   Muestra mensajes flash (`successMessage`, `errorMessage`) obtenidos de `res.locals`.
*   **`views/admin.ejs` (Dashboard Admin):** Sin cambios recientes significativos.
*   **`views/layouts/adminLayout.ejs` (Actualizado):**
    *   El menú lateral se genera dinámicamente a partir de `res.locals.adminMenuItems`.
    *   Incluye Font Awesome globalmente.
    *   **Ajuste Visual del Sidebar de Perfil:** Modificado para que el campo "Nombre" muestre "N/A" si `first_name` y `last_name` del usuario están vacíos, en lugar de mostrar el `username` como fallback.
    *   **Scripts de Socket.IO:** Incluye los scripts necesarios para el cliente Socket.IO (`/socket.io/socket.io.js` y `/js/socket-client-setup.js`).
    *   **Visualización de Mensajes Flash:** Muestra `successMessage`, `errorMessage` y `warningMessage` (este último para notificaciones generales o de perfil incompleto).
*   **`views/admin.ejs` (Dashboard Admin):** Sin cambios recientes significativos.
*   **`views/admin/edit-profile.ejs` (Nueva Vista):**
    *   Formulario para que el usuario edite `first_name`, `last_name`, `phone` y `avatar_url`.
    *   Incluye inicialización para `intl-tel-input` en el campo de teléfono.
*   **`views/previsualizador.ejs` (Actualizado):**
    *   Maneja la respuesta JSON de la IA para actualizar el iframe dinámicamente.
    *   Incluye botón "Guardar Tarjeta" y modal para ingresar título.
    *   Envía datos (título, prompt, HTML, CSS, JS) a `POST /admin/cards`.
    *   Limpia el HTML de la IA de enlaces a `styles.css` y `script.js` para evitar errores 403 en iframe.
    *   Maneja el query param `?action=new`.
*   **`views/multimedia.ejs`:** Sin cambios recientes significativos.
*   **`views/ventas.ejs`:** Sin cambios recientes significativos.
*   **`views/configuracion.ejs`:**
    *   Corregido error de AlpacaJS con campos de tipo `boolean`.
*   **`views/admin/menu-editor.ejs` (Solucionado y Funcional):**
    *   Error EJS resuelto externalizando el script a `public/js/admin-menu-editor.js`.
    *   CRUD completo para ítems de menú implementado (Añadir, Editar, Eliminar).
*   **`views/admin/cards.ejs` (Nueva Vista):**
    *   Lista las tarjetas del usuario utilizando DataTables.
    *   Botón "+ Crear Nueva Tarjeta con IA" enlaza a `/admin/previsualizador?action=new`.
    *   (Pendiente: Ajustar visualización de "Ruta Archivos" y enlace "Ver").

### 4.3. Autenticación (`routes/auth.js`) (Actualizado)

*   **Ruta `POST /register`:**
    *   Genera y guarda un `profile_slug` único.
    *   Genera `username` único y `password` segura.
    *   Hashea la contraseña.
    *   Crea el nuevo usuario en la tabla `users` con `role: 'client'`.
    *   Llama a `sendWelcomeEmail` de `notificationService.js`.
    *   **Llama a `sendWelcomeWhatsApp` de `notificationService.js`** para enviar credenciales/bienvenida por WhatsApp.
    *   Redirige a `/login` con mensaje de éxito.
*   **Ruta `POST /login`:**
    *   Modificada para que tanto usuarios con rol `'admin'` como `'client'` sean redirigidos a `/admin` tras un inicio de sesión exitoso.
*   Ruta GET `/login` y GET `/logout`: Sin cambios funcionales mayores.

### 4.4. Middleware y Configuración Adicional en `app.js`
*   Middleware global para `currentUser`, mensajes flash (`successMessage`, `errorMessage`), `adminMenuItems` (menú dinámico), y la instancia `io` de Socket.IO (`req.io`).
    *   Este middleware también incluye lógica para detectar si el perfil del usuario (`first_name`, `last_name`, `phone`, `avatar_url`) está incompleto, considerando también `avatar_url === 'null'` como incompleto.
*   **Notificación de Perfil Incompleto (Solucionado):**
    *   Después de varios intentos para pasar un mensaje de advertencia desde el backend (`res.locals.warningMessage`) a la plantilla del layout para ser renderizado como un `div` de Bootstrap, se encontró que esta variable no llegaba consistentemente al layout.
    *   La solución final implementada consiste en un script del lado del cliente en `views/layouts/adminLayout.ejs` que se ejecuta en `DOMContentLoaded`.
    *   Este script accede a la variable `currentUser` (que sí está consistentemente disponible en la plantilla, ya que se usa para el sidebar de perfil).
    *   Verifica los campos del perfil (`first_name`, `last_name`, `phone`, `avatar_url`) directamente desde `currentUser`.
    *   Si el perfil está incompleto y el usuario no está en la página "Editar Perfil", el script crea dinámicamente un `div` de alerta de Bootstrap (`alert alert-warning`) con el mensaje "Tu perfil está incompleto. Algunos datos son necesarios para generar tus tarjetas correctamente. <a class="alert-link" href="/admin/profile/edit">Haz clic aquí para completarlo</a>." y lo inserta al principio del elemento `<main>` de la página.
    *   Esto asegura que la notificación se muestre correctamente y el enlace dirija al usuario a la página de edición de perfil.
*   Añadido `express.json()` para parsear JSON bodies.
*   Reorganización del orden de rutas.
*   **Servidor HTTP y Socket.IO:** `app.js` ahora crea un servidor HTTP explícito y lo usa para inicializar Express y Socket.IO, escuchando en el mismo puerto.

### 4.5. Gestión de Menú del Panel (Completado para CRUD básico)
*   **Rutas (`routes/adminMenu.js`):**
    *   CRUD completo para ítems de menú (GET, POST para crear, GET para obtener datos para editar, PUT para actualizar, DELETE).
    *   Middleware `requireAdminRole` para restringir acceso.
*   **Vista (`views/admin/menu-editor.ejs`):**
    *   Interfaz para listar, añadir, editar y eliminar ítems de menú, con JavaScript externalizado a `public/js/admin-menu-editor.js`.

### 4.6. Gestión de Tarjetas (En Desarrollo)
*   **Rutas (`routes/cards.js`):**
    *   `GET /`: Lista las tarjetas del usuario.
    *   `POST /`: Crea una nueva tarjeta:
        *   Recibe título, prompt, HTML, CSS, JS.
        *   Crea directorio `public/cards/:profile_slug/:card_slug/`.
        *   Guarda archivos.
        *   Inserta en BD (con `original_prompt`, `tokens_cost`).
        *   Actualiza `users.tokens_used`.
        *   Devuelve respuesta JSON.
*   **Vista (`views/admin/cards.ejs`):**
    *   Muestra tarjetas en DataTables.
    *   Enlaza a previsualizador para crear nuevas.
*   **Migración (`...create_cards_table.cjs`):**
    *   Actualizada para incluir `original_prompt` y `tokens_cost`.

## 5. Configuración de Base de Datos (Knex.js) (Actualizado)
*   **Migraciones (`db/migrations/`):**
    *   `..._create_users_table.cjs` (asume `profile_slug`).
    *   `..._create_configs_table.cjs`
    *   `..._create_cards_table.cjs` (actualizada con `original_prompt`, `tokens_cost`).
    *   `..._create_admin_menu_items_table.cjs`

## 6. Estructura de Archivos Clave (Actualizado)
*   `app.js`: Archivo principal.
*   `routes/auth.js`: Manejo de autenticación y registro (con generación de `profile_slug`).
*   `routes/adminMenu.js`: CRUD para ítems de menú.
*   `routes/cards.js`: Gestión de tarjetas.
*   `routes/profile.js`: (Nuevo) Rutas para edición de perfil de usuario.
*   `services/aiService.js`: Interacción con IA.
*   `services/notificationService.js`: Envío de correos y mensajes de WhatsApp.
*   `services/socketService.js`: (Nuevo) Lógica del servidor Socket.IO.
*   `views/layouts/adminLayout.ejs`: Layout principal con menú dinámico, scripts de Socket.IO y visualización de mensajes flash.
*   `views/admin/menu-editor.ejs`: Interfaz del editor de menús.
*   `views/admin/cards.ejs`: Interfaz para listar tarjetas.
*   `views/admin/edit-profile.ejs`: (Nueva) Formulario para editar perfil de usuario.
*   `views/previsualizador.ejs`: Interfaz para generar y previsualizar contenido de IA.
*   `public/js/admin-menu-editor.js`: JS para el editor de menús.
*   `public/js/admin-cards.js`: (Asumido, anteriormente `admin-cards-datatable.js`) JS para la lista de tarjetas.
*   `public/js/admin-previsualizador.js`: JS para el previsualizador.
*   `public/js/socket-client-setup.js`: (Nuevo) Configuración del cliente Socket.IO.

## 7. Configuración de Despliegue (Docker)
*   Considerar añadir `fs-extra` a `package.json` si no está, y otras nuevas dependencias.

## 8. Puntos Pendientes y Próximas Mejoras (Revisado y Re-priorizado)

**Prioridad Alta:**
*   **Tokens de IA:**
    *   Investigar si la API de Llama puede devolver el costo real de tokens por llamada.
        *   Si es así: Modificar `aiService.js` para capturarlo, `app.js` (ruta POST previsualizador) para pasarlo al frontend, `previsualizador.ejs` (JS) para enviarlo al guardar tarjeta, y `routes/cards.js` para guardarlo en `cards.tokens_cost` y usarlo para actualizar `users.tokens_used`.
*   **Previsualizador - Carga y Edición:**
    *   Implementar la carga de la última tarjeta creada por el usuario al acceder directamente a `/admin/previsualizador`.
    *   Implementar la carga de una tarjeta existente para edición (ej. `/admin/previsualizador?editCardId=:cardId`), incluyendo poblar el prompt y el contenido en los campos/iframe. Esto requerirá una ruta `GET /admin/cards/:id/content` o similar para obtener el HTML/CSS/JS de los archivos.
*   **Gestión de Tarjetas (`/admin/cards`):**
    *   Ajustar la columna "Ruta Archivos" y el enlace "Ver" en la tabla de `views/admin/cards.ejs` para construir la URL dinámicamente (usando `currentUser.profile_slug` y `card.slug`).
    *   Implementar funcionalidad completa de **Editar Tarjeta** (ruta `GET /admin/cards/:id/edit` para un formulario, ruta `PUT /admin/cards/:id` para actualizar datos y archivos).
    *   Implementar funcionalidad de **Eliminar Tarjeta** (ruta `DELETE /admin/cards/:id`, con confirmación robusta usando SweetAlert2 en el frontend).

**Prioridad Media:**
*   **Visualización Pública de Tarjetas:**
    *   Crear ruta pública (ej. `GET /cards/:profile_slug/:card_slug` o `/:profile_slug/:card_slug`) que sirva el `index.html` de la tarjeta correspondiente.
*   **(Opcional) Reordenamiento de Ítems de Menú:** Implementar drag & drop.

**Prioridad Baja / Mantenimiento:**
*   **Almacén de Sesiones Persistente:** Reemplazar `MemoryStore`.
*   **Crear Migraciones para Tablas Restantes:** `media_files` (si se decide usar).
*   **Integrar `media_files` con Sección Multimedia.**
*   **Resolver error 404 para `placeholder.jpg`** en previsualizador (si aún persiste o es relevante).
*   **Seguridad de `SESSION_SECRET` y valores de producción en `docker-compose.yml`.**
*   **(Opcional) Funcionalidad "Loguearse con WhatsApp" (planificada, pendiente de API externa).**
*   **(Solucionado) Notificación persistente para completar perfil.** (Implementado mediante script del lado del cliente que genera un div de alerta).
*   **(Pendiente) Guía para crear primera tarjeta.**
*   **(Opcional) HTTPS.**
*   Revisar `DeprecationWarning: The \`util.isArray\` API is deprecated`.

## 9. Problema Histórico con `block('pageScripts').append()` (Solucionado)

Durante el desarrollo, se encontraron errores recurrentes de sintaxis EJS (como `SyntaxError: Invalid or unexpected token` o `missing ) after argument list`) al intentar utilizar `block('pageScripts').append()` de `ejs-mate` para incrustar bloques de JavaScript que contenían sus propias comillas, backticks, o múltiples líneas. Aunque se intentaron varias formas de escapar o formatear el string, la solución más estable y robusta fue **externalizar dichos scripts de JavaScript a archivos `.js` separados** (ubicados en `public/js/`). Luego, estos archivos se enlazaron en las plantillas EJS correspondientes usando una forma simple de `append()` que solo incluye la etiqueta script, por ejemplo: `<% block('pageScripts').append('<script src="/js/nombre-del-script.js"></script>') %>`. Este enfoque eliminó los problemas de parseo por parte de EJS.

Este prompt debería proporcionar un contexto completo del estado actual del proyecto TarjetasIA.
