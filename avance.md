# Avance del Proyecto: TarjetasIA

## 1. Resumen General del Proyecto

"TarjetasIA" es una aplicación web desarrollada con Node.js y Express.js, diseñada para la creación y gestión de tarjetas digitales, con un panel de administración para gestionar diversas funcionalidades.

## 2. Tecnologías Principales Utilizadas

*   **Backend:** Node.js, Express.js
*   **Frontend (Vistas):** EJS (Embedded JavaScript templates) con el motor `ejs-mate` para layouts.
*   **Estilos:** Bootstrap 5, CSS personalizado.
*   **JavaScript Frontend:** jQuery, DataTables, SweetAlert2, Bootstrap JS, **AlpacaJS**, **Handlebars.js** (dependencia de AlpacaJS), **intl-tel-input**, **SortableJS**.
*   **Gestión de Sesiones:** `express-session` (actualmente con `MemoryStore`).
*   **Mensajes Flash:** `connect-flash`.
*   **Subida de Archivos:** `multer`, `fs-extra`.
*   **Variables de Entorno (Desarrollo):** `dotenv`.
*   **Base de Datos:** MySQL, con gestión de esquemas y seeds mediante **Knex.js**.
*   **Hashing de Contraseñas:** **bcryptjs**.
*   **Generación de Contraseñas:** `generate-password`.
*   **Envío de Correos:** `Nodemailer`.
*   **Comunicación en Tiempo Real:** **Socket.IO**.
*   **Integración API Externa (IA y WhatsApp):** `axios` para interactuar con LLMAPI y Evolution API.
*   **Contenerización y Despliegue:** Docker, Docker Compose.

## 3. Estado Actual del Proyecto (Revisión Mayor)

El proyecto ha experimentado avances significativos en la interfaz de usuario del panel de administración, la gestión de perfiles, la edición de menús, la gestión de tarjetas y la integración con la API de IA para el control de tokens.

### 3.1. Mejoras en el Layout del Panel de Administración
*   **Refactorización a Layout Responsivo (`views/layouts/adminLayout.ejs`, `public/css/admin.css`):**
    *   La `topbar` y el `sidebar` estático anteriores se han transformado en una `navbar` de Bootstrap 5 (`.admin-navbar.fixed-top`) y un `offcanvas` lateral (`.admin-sidebar.offcanvas-lg.offcanvas-start`).
    *   Esto asegura que el menú principal sea responsivo, colapsándose en un menú tipo "hamburguesa" en pantallas pequeñas y mostrándose como una barra lateral fija en pantallas grandes.
    *   El perfil de usuario se ha movido a un `offcanvas` separado (`#userProfileOffcanvas.offcanvas-end`), accesible desde un dropdown en la navbar.
    *   Se realizaron múltiples ajustes CSS para el correcto posicionamiento, dimensiones (`width`, `height`, `top`, `padding-top`, `margin-left`) de la navbar, los offcanvas y el área de contenido principal (`.main-content`) para asegurar una visualización consistente y evitar solapamientos.
    *   Se corrigieron errores de JavaScript en `adminLayout.ejs` relacionados con la carga y el parseo de `currentUser` y `currentPage` para la lógica de visualización y alertas.
    *   Se solucionaron problemas con la aplicación del modo oscuro a los nuevos componentes del layout, actualizando los selectores en `public/css/dark-mode.css`.
    *   Se normalizaron las dimensiones (ancho a `350px`, padding interno a `1rem`) y el posicionamiento vertical de los sidebars de multimedia y perfil de usuario para una apariencia unificada.

### 3.2. Mejoras en el Editor de Menú del Panel (`/admin/menu-editor`)
*   **Archivos Modificados:** `views/admin/menu-editor.ejs`, `public/js/admin-menu-editor.js`, `routes/adminMenu.js`.
*   **Ocultar Campo de Orden:** El campo "Orden de Visualización" se ha ocultado de los formularios modales de añadir y editar ítems de menú (usando la clase `d-none` de Bootstrap). El valor por defecto (`0`) se sigue enviando al crear.
*   **Funcionalidad Drag & Drop:**
    *   Se integró la librería **SortableJS** (vía CDN) para permitir reordenar los ítems del menú mediante arrastrar y soltar en la lista.
    *   En `public/js/admin-menu-editor.js`, se inicializó SortableJS y se añadió lógica para que, al finalizar el arrastre (`onEnd`), se envíe una lista de los ítems (ID y nuevo índice como `display_order`) al backend.
    *   En `routes/adminMenu.js`, se añadió una nueva ruta `PUT /menu-editor/items/reorder` que recibe la lista ordenada y actualiza los `display_order` de los ítems en la base de datos dentro de una transacción.
    *   Se corrigió un error de enrutamiento en Express donde la ruta `PUT /items/:id` interceptaba la llamada a `PUT /items/reorder`. La ruta `/reorder` se movió para definirse antes que la ruta parametrizada.

### 3.3. Mejoras en la Edición de Perfil de Usuario (`/admin/profile/edit`)
*   **Archivos Modificados:** `views/admin/edit-profile.ejs`, `public/css/admin.css`, `routes/profile.js`.
*   **Alineación del Campo de Teléfono:** Se añadieron estilos CSS a `public/css/admin.css` para `.iti--allow-dropdown` y `.iti` para forzar `width: 100%` y `display: block`, mejorando la alineación del campo `intl-tel-input` con otros campos de formulario Bootstrap.
*   **Subida Directa de Avatar:**
    *   **Frontend:** El formulario en `views/admin/edit-profile.ejs` ahora tiene `enctype="multipart/form-data"`. El campo de URL de avatar se reemplazó por `<input type="file" name="avatarFile">`. Se añadió previsualización de la imagen actual y de la nueva imagen seleccionada. El script de `intl-tel-input` se mejoró para ejecutarse en `DOMContentLoaded` y actualizar el valor del campo al enviar.
    *   **Backend (`routes/profile.js`):** Se importó y configuró `multer` para manejar la subida de `avatarFile` a `public/uploads/` con un nombre de archivo único. La ruta `POST /edit` ahora procesa el archivo, elimina el avatar anterior del sistema de archivos (si existe, no es una URL externa y no es el placeholder por defecto), y guarda la nueva ruta relativa (ej. `uploads/nombre_archivo.jpg`) en `users.avatar_url`. La sesión del usuario también se actualiza.
*   **Visualización del Avatar en Sidebar:** Se corrigió la lógica en `views/layouts/adminLayout.ejs` para construir correctamente la URL del avatar en el sidebar de perfil (`#userProfileOffcanvas`), anteponiendo `/` si la ruta es relativa.
*   **Formulario en Dos Columnas:** El formulario de edición de perfil se reestructuró usando el sistema de rejilla de Bootstrap (`row` y `col-md-6`) para una mejor presentación en pantallas medianas y grandes.
*   **Corrección de Errores EJS:** Se solucionó un `SyntaxError: Unexpected token 'else'` en `views/admin/edit-profile.ejs` causado por una estructura condicional incorrecta.

### 3.4. Gestión de Tarjetas (`/admin/cards`)
*   **Archivos Modificados:** `views/admin/cards.ejs`, `public/js/admin-cards.js`, `routes/cards.js`.
*   **Funcionalidad de Eliminación:**
    *   **Frontend:** Se añadió un event listener en `public/js/admin-cards.js` a los botones de eliminar (clase `.delete-card-btn`). Se muestra una confirmación con SweetAlert2. Si se confirma, se envía una petición `DELETE` a `/admin/cards/:id`. Tras el éxito, la fila se elimina de DataTables.
    *   **Vista:** En `views/admin/cards.ejs`, el botón de eliminar ahora es un `<button type="button">` con `data-id` y la clase `.delete-card-btn`, eliminando el formulario anterior.
    *   **Backend (`routes/cards.js`):** Se implementó la ruta `DELETE /:id`. Verifica la propiedad de la tarjeta, elimina la carpeta de archivos asociada (`public/cards/:profile_slug/:card_slug/`) usando `fs-extra`, y luego elimina el registro de la tarjeta de la base de datos.
*   **Rutas de Archivos:** Se actualizó `views/admin/cards.ejs` para construir dinámicamente los enlaces a los archivos de las tarjetas usando `currentUser.profile_slug` y `card.slug`.

### 3.5. Gestión de Tokens de IA y Flujo del Previsualizador
*   **Objetivo Principal:** Registrar el costo real de tokens (obtenido de `usage.total_tokens` de la API de IA) en `cards.tokens_cost` y actualizar `users.tokens_used` como un acumulador histórico del gasto total del usuario.
*   **`services/aiService.js`:**
    *   Se realizaron múltiples pruebas y ajustes para obtener una respuesta JSON estructurada y completa de la API `api.llmapi.com`.
    *   Se probó con los modelos `llama3-8b` y `llama3.1-70b`.
    *   Se intentó la estrategia de "Function Calling" (con `tools` y `tool_choice` en el payload). Se observó que, aunque la API indicaba `finish_reason: "tool_calls"`, el contenido de `tool_calls[0].function.arguments` (donde se esperaba el JSON con `html_code`, `css_code`, `js_code`) era truncado si el código generado era largo, incluso con `max_tokens` alto. Esto hacía que el JSON de `arguments` fuera inválido.
    *   **Decisión Actual:** Se descartó "Function Calling" para obtener el JSON completo de código debido al truncamiento. Se volvió a una llamada de chat simple.
    *   **Implementación Actual en `aiService.js`:**
        *   El payload ya no incluye `tools` ni `tool_choice`.
        *   Se espera que la IA devuelva el JSON directamente en `message.content`, guiada por el `systemPrompt`.
        *   Se añadió lógica para extraer `tokens_cost` de `llamaResponse.data.usage.total_tokens`.
        *   La función `generateLlamaCompletion` devuelve `{ html_code, css_code, js_code, tokens_cost }`. (Nota: La robustez del parseo del `message.content` para extraer el JSON principal si la IA añade texto extra o usa formatos no estándar como backticks para strings dentro del JSON sigue siendo un punto a monitorear y potencialmente refinar).
*   **Prompt del Sistema (para `IA_SYSTEM_PROMPT` en la BD):**
    *   Se realizaron varias iteraciones para instruir a la IA a:
        1.  Devolver ÚNICAMENTE un objeto JSON.
        2.  Usar comillas dobles para todos los strings dentro del JSON.
        3.  Incluir los enlaces `<link rel="stylesheet" href="style.css">` y `<script src="script.js"></script>` en el `html_code`.
    *   Se probó con entidades HTML (`<`, `>`) y luego describiendo las etiquetas textualmente para evitar problemas de interpretación del prompt por la propia IA o por el sistema de configuración. La versión actual del prompt describe textualmente las etiquetas.
*   **`app.js` (Ruta `POST /admin/previsualizador`):**
    *   Recibe el objeto completo de `aiService.js` (incluyendo `tokens_cost`) y lo pasa al frontend.
*   **`public/js/admin-previsualizador.js`:**
    *   Almacena el `tokens_cost` recibido del backend en una variable JavaScript (`currentTokenCost`).
    *   Envía este `currentTokenCost` junto con los demás datos de la tarjeta al guardar (`POST /admin/cards`).
    *   Se corrigió un error `appendChild` al renderizar en el iframe, asegurando que `iframeDoc.close()` se llame después de `iframeDoc.write()` y antes de manipular `iframeDoc.head` o `iframeDoc.body`.
*   **`routes/cards.js` (Ruta `POST /` para crear tarjeta):**
    *   Recibe `tokens_cost` del frontend.
    *   Guarda este valor (parseado a entero, fallback a 1) en `cards.tokens_cost`.
    *   Incrementa `users.tokens_used` por este mismo valor, manteniendo `users.tokens_used` como un acumulador histórico del gasto total del usuario.

### 3.6. Desafíos y Soluciones Implementadas (Resumen Adicional)
*   **Truncamiento de Respuesta de IA con "Function Calling":** Se identificó que `api.llmapi.com` (con `llama3.1-70b`) truncaba el string JSON en `tool_calls[0].function.arguments` si el contenido de código era extenso, haciendo esta estrategia inviable para obtener el HTML/CSS/JS completo en una sola estructura de función. Se revirtió a esperar el JSON en `message.content`.
*   **Errores de Parseo de JSON de la IA:** Se trabajó en refinar el `systemPrompt` y la lógica de parseo en `aiService.js` para manejar respuestas de la IA que no son JSON estrictamente válido (ej. con texto introductorio o formatos de string no estándar).
*   **Errores de JavaScript en Frontend:** Se corrigieron errores de `appendChild` en el previsualizador y errores de sintaxis EJS en varias plantillas.

### 3.7. Implementación de Flujo de Creación Manual de Tarjetas y Mejoras en Previsualizador (Sesión Actual)
*   **Cambio de Enfoque en Creación de Tarjetas:** Se transicionó de un modelo donde la IA generaba el HTML/CSS/JS completo a un sistema basado en una plantilla HTML (`public/templates/digital-card-v1/index.html`) con placeholders, permitiendo la entrada manual de contenido y una futura integración granular con la IA por secciones.
*   **Preparación de la Plantilla Base (`public/templates/digital-card-v1/index.html`):**
    *   Se implementó un menú desplegable y luego un menú lateral (offcanvas) para mejorar la responsividad.
    *   Se añadió funcionalidad de "sticky footer".
    *   Se introdujeron placeholders en formato de comentario HTML (ej. `<!-- PAGE_TITLE -->`, `<!-- THEME_MODE -->`, `<!-- MAIN_SECTIONS_PLACEHOLDER -->`, `<!-- CUSTOM_STYLES_PLACEHOLDER -->`, `<!-- CUSTOM_SCRIPTS_PLACEHOLDER -->`, etc.) para la inyección dinámica de contenido, incluyendo metaetiquetas (descripción, OG image) y favicon.
*   **Acondicionamiento de la Interfaz del Previsualizador (`views/previsualizador.ejs`):**
    *   Se ocultaron los elementos de UI relacionados con el prompt de IA para enfocarse en el flujo manual.
    *   Se implementó un acordeón de Bootstrap para organizar los campos de entrada manual, correspondiendo cada panel del acordeón a una sección de la plantilla base (Configuración General, Navbar, Contenido Principal, Footer, Estilos/Scripts).
    *   Se añadió un botón "Previsualizar Cambios en Iframe" para actualizar la vista previa.
*   **Lógica del Backend para Previsualización Manual (`routes/previewer.js`):**
    *   Se creó el nuevo archivo de rutas `routes/previewer.js`.
    *   Se implementó la ruta `POST /admin/previewer/render-manual`, protegida por `requireLogin`. Esta ruta:
        *   Recibe los datos del formulario del acordeón desde el frontend.
        *   Lee la plantilla base `digital-card-v1.html`.
        *   Reemplaza todos los placeholders con los datos recibidos.
        *   Inyecta el CSS personalizado (envuelto en `<style>`) y el JavaScript personalizado (envuelto en `<script>`) directamente en el HTML resultante.
        *   Devuelve el HTML completo y procesado.
    *   Este nuevo router se montó en `app.js` bajo la ruta `/admin/previewer`.
*   **Lógica del Frontend para Previsualización Manual (`public/js/admin-previsualizador.js`):**
    *   Al cargar la página, se realiza un `fetch` a la URL pública de la plantilla base (`/templates/digital-card-v1/index.html`) y su contenido se carga en el `iframe` de previsualización.
    *   Se añadió un event listener al botón "Previsualizar Cambios en Iframe" que:
        *   Recolecta todos los datos de los campos del acordeón.
        *   Envía estos datos mediante `POST` a la ruta `/admin/previewer/render-manual`.
        *   Carga el HTML procesado devuelto por el backend en el `iframe`.
    *   Se desactivó la carga automática de datos de ejemplo y la previsualización automática al inicio para permitir la entrada manual desde cero. La función `loadExampleData()` se mantiene pero no se llama automáticamente.
*   **Lógica de Guardado para Tarjetas Manuales (Nueva Ruta en `routes/previewer.js`):**
    *   Se implementó la nueva ruta `POST /admin/previewer/save-card`, protegida por `requireLogin`. Esta ruta:
        *   Recibe `title` (del modal de guardado) y `finalHtmlContent` (el HTML completo del iframe) desde el frontend.
        *   Obtiene `userId` y `userProfileSlug` de la sesión.
        *   Genera un `cardSlug` único.
        *   Crea el directorio del usuario (`public/cards/USER_PROFILE_SLUG/`) si no existe, usando `fs-extra.ensureDir()`.
        *   Guarda el `finalHtmlContent` como `CARD_SLUG.html` en ese directorio (ej. `public/cards/luisflorez/mi-tarjeta.html`).
        *   **NO** crea archivos `style.css` o `script.js` separados, ya que el CSS/JS se asume inline en `finalHtmlContent`.
*   **Modificación de la Base de Datos (Migración):**
    *   Se modificó la migración existente `20250520183407_create_cards_table.cjs` para añadir el campo `file_path` (String, nullable) a la tabla `cards`.
*   **Lógica de Inserción en BD (en `POST /admin/previewer/save-card`):**
    *   Al guardar una tarjeta, se inserta un registro en la tabla `cards` con `user_id`, `title`, `slug`, `status: 'published'`, y el nuevo `file_path` (ruta relativa al archivo HTML guardado).
    *   `tokens_cost` se establece en `0`. Otros campos como `original_prompt` y `content_json` usan sus valores por defecto de la BD (probablemente `null`).
    *   Se corrigió la obtención del `insertedCardId` para ser compatible con MySQL, eliminando el uso de `.returning('id')` en la inserción de Knex y usando el resultado directo.
*   **Ajuste en Frontend (`public/js/admin-previsualizador.js` para Guardar):**
    *   Se modificó el event listener de `#confirmSaveCardBtn` para enviar solo `title` y `finalHtmlContent` a la nueva ruta `/admin/previewer/save-card`.
*   **Ajustes en la Lista de Tarjetas (`views/admin/cards.ejs` y `public/js/admin-cards.js`):**
    *   **Tabla (`views/admin/cards.ejs`):** Se actualizaron las columnas para mostrar: Título, Enlace (usando el nuevo `card.file_path`), Costo Tokens, Estado y Fecha de Creación.
    *   **Acciones (`views/admin/cards.ejs`):**
        *   Se omitió el botón "Editar" por ahora.
        *   Se mantuvieron/ajustaron los botones para "Eliminar".
        *   Se añadieron nuevos botones (estructura HTML) para "Compartir" y "Código QR".
        *   Se incluyó la librería `qrcode.js` vía CDN en la vista.
    *   **JavaScript (`public/js/admin-cards.js`):**
        *   Se añadió la lógica básica para el botón "Compartir" (copiar URL de la tarjeta al portapapeles).
        *   Se añadió la lógica para el botón "Código QR" (generar el QR usando `qrcode.js` con la URL de la tarjeta y mostrarlo en un modal).
*   **Ajuste en la Lógica de Eliminación (`routes/cards.js` - Ruta `DELETE /:id`):**
    *   Se modificó para que elimine el archivo HTML individual (`public/CARDS_FILE_PATH`) en lugar de la carpeta completa del slug de la tarjeta.
*   **Resolución de Problemas:**
    *   Se diagnosticó y resolvió el error `EPERM mkdir` que ocurría durante el guardado. La solución fue corregir la lógica de creación de rutas en `routes/previewer.js` para que el `cardSlug` sea parte del nombre del archivo (`cardSlug.html`) y no un subdirectorio, asegurando que solo se cree el directorio del `userProfileSlug` (`public/cards/USER_PROFILE_SLUG/`).
    *   Se eliminó una alerta (`alert()`) innecesaria que aparecía desde los datos de ejemplo en el previsualizador.

## 4. Puntos Pendientes y Próximas Mejoras (Revisado)

**Prioridad Alta:**
*   **Confirmar Flujo de Creación de Tarjetas con Tokens Reales:** Realizar una prueba completa para asegurar que el `tokens_cost` real de la IA se guarda en `cards.tokens_cost` y que `users.tokens_used` se incrementa correctamente.
*   **Asegurar Enlaces CSS/JS en HTML Generado:** Verificar que el último `systemPrompt` y la lógica actual de `aiService.js` resulten consistentemente en que el `html_code` incluya los enlaces a `style.css` y `script.js`. Si no, considerar inyección de estos enlaces en el backend (`routes/cards.js`) como fallback.
*   **Implementar Edición de Tarjetas:**
    *   Flujo para cargar datos de tarjeta existente en el previsualizador (`GET /admin/cards/content/:id` o similar).
    *   Lógica para regenerar contenido con IA si el prompt se edita.
    *   Ruta `PUT /admin/cards/:id` para guardar cambios, actualizar archivos, actualizar `cards.tokens_cost` con el costo de la nueva regeneración, e incrementar `users.tokens_used` por el costo de esa regeneración.
*   **Previsualizador - Carga de Tarjeta Existente:** Implementar la carga de una tarjeta existente para edición (ej. `/admin/previsualizador?editCardId=:cardId`).

**Prioridad Media:**
*   **Visualización Pública de Tarjetas:** Crear ruta pública (ej. `GET /cards/:profile_slug/:card_slug`) que sirva el `index.html` de la tarjeta.
*   **Sistema de Cuota de Tokens por Usuario:** Implementar lógica para `tokens_available` y verificar cuota antes de operaciones de IA.

**Prioridad Baja / Mantenimiento:**
*   **Almacén de Sesiones Persistente.**
*   **Guía para crear primera tarjeta.**
*   Revisar `DeprecationWarning: The \`util.isArray\` API is deprecated`.
*   Otras mejoras mencionadas anteriormente.

Este avance.md debería estar ahora mucho más detallado y al día.

---
{
    "id": "6209db7a-207f-4626-b9a4-4ebf60acb0c3",
    "created": 1747878138,
    "model": "llama3.1-70b",
    "object": "chat.completion",
    "system_fingerprint": null,
    "choices": [
        {
            "finish_reason": "tool_calls",
            "index": 0,
            "message": {
                "content": null,
                "role": "assistant",
                "tool_calls": [
                    {
                        "index": 0,
                        "function": {
                            "arguments": "{\"html_code\": \"<!DOCTYPE html><html lang=\", \"css_code\": \"body {font-family: Arial, sans-serif;}h1 {color: #00698f;}ul {list-style-type: none;}li {display: inline-block; margin-right: 20px;}\", \"js_code\": \"function openTab(tabName) {var i;var x = document.getElementsByClassName(\"}",
                            "name": "generate_web_content"
                        },
                        "id": "call_8hSgui9k6bOK078fFgB3ctp7",
                        "type": "function"
                    }
                ],
                "function_call": null
            }
        }
    ],
    "usage": {
        "completion_tokens": 95,
        "prompt_tokens": 348,
        "total_tokens": 443,
        "completion_tokens_details": null,
        "prompt_tokens_details": null
    }
}
