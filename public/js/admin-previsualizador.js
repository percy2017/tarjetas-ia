// Variables globales para el contenido manual (reemplazan a las de IA por ahora)
// let currentGeneratedHTML = null; // Ya no se usa para la previsualización manual directa
// let currentGeneratedCSS = null;
// let currentGeneratedJS = null;
// let currentPrompt = $("#prompt").val(); // El prompt de IA no se usa por ahora
// let currentTokensCost = 0; 

// --- INICIO: Nuevo código para flujo manual ---

function loadExampleData() {
    console.log('loadExampleData: Iniciando carga de datos de ejemplo...');
    try {
        $('#pageTitle').val('Tarjeta de Ejemplo - AutoCargada');
        $('#themeMode').val('dark');
        $('#metaDescription').val('Esta es una tarjeta de ejemplo con datos cargados automáticamente para facilitar las pruebas.');
    $('#ogImageUrl').val('https://via.placeholder.com/1200x630/007bff/ffffff?text=OG+Ejemplo');
    $('#faviconUrl').val('https://via.placeholder.com/32x32/007bff/ffffff?text=Fv');
    $('#navBrandText').val('Marca Ejemplo');
    $('#navItemsHtml').val(
        '<li class="nav-item"><a class="nav-link active" href="#">Inicio Ejemplo</a></li>\n' +
        '<li class="nav-item"><a class="nav-link" href="#seccion1">Sección 1</a></li>\n' +
        '<li class="nav-item"><a class="nav-link" href="#seccion2">Sección 2</a></li>'
    );
    $('#mainSectionsHtml').val(
        '<div id="seccion1" class="container py-4 text-center">\n' +
        '  <h1>Contenido Principal de Ejemplo</h1>\n' +
        '  <p>Este es el contenido principal autogenerado para la tarjeta.</p>\n' +
        '  <img src="https://via.placeholder.com/600x300/6c757d/ffffff?text=Imagen+Ejemplo" class="img-fluid my-3" alt="Ejemplo"/>\n' +
        '</div>\n' +
        '<div id="seccion2" class="container py-4 bg-light text-center">\n' +
        '  <h2>Otra Sección de Ejemplo</h2>\n' +
        '  <p>Más contenido de prueba aquí.</p>\n' +
        '</div>'
    );
    $('#footerText').val('&copy; 2025 Pruebas Inc. Todos los derechos reservados.');
    $('#customStyles').val(
        'body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }\n' +
        '.container h1 { color: #0056b3; }\n' +
        '#seccion2 { border-top: 2px solid #dee2e6; }'
    );
    $('#customScripts').val("console.log('Scripts de ejemplo ejecutados para la tarjeta.');\nconsole.log('Datos de ejemplo cargados y previsualizados (alerta eliminada).');");
    
        console.log('loadExampleData: Intento de carga de datos de ejemplo finalizado.');
    } catch (e) {
        console.error('loadExampleData: Error durante la carga de datos de ejemplo:', e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded: Evento disparado.'); // <-- Log añadido
    let baseTemplateLoaded = false;
    // 1. Cargar plantilla base en el iframe al iniciar
    try {
        console.log('DOMContentLoaded: Intentando cargar plantilla base en iframe...'); // <-- Log añadido
        const response = await fetch('/templates/digital-card-v1/index.html'); // URL pública de la plantilla
        if (!response.ok) {
            throw new Error(`Error al cargar plantilla base: ${response.status} ${response.statusText}`);
        }
        const baseHtml = await response.text();
        const iframe = document.getElementById('previewIframe');
        if (iframe) {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(baseHtml);
            iframeDoc.close();
            $(".placeholder-content").hide(); // Ocultar placeholder si la carga es exitosa
            baseTemplateLoaded = true; // Marcar que la plantilla base se cargó
            console.log('DOMContentLoaded: Plantilla base cargada en iframe.'); // <-- Log añadido
        } else {
            console.error('DOMContentLoaded: Elemento iframe #previewIframe no encontrado.');
        }
    } catch (error) {
        console.error('DOMContentLoaded: Error cargando plantilla en iframe:', error); // <-- Log mejorado
        Swal.fire("Error de Carga", "No se pudo cargar la plantilla base en la previsualización.", "error");
        $(".placeholder-content").show(); // Mostrar placeholder si falla la carga
    }

    // Si la plantilla base se cargó, proceder a cargar datos de ejemplo y previsualizar
    if (baseTemplateLoaded) {
        // console.log('DOMContentLoaded: Plantilla base cargada, llamando a loadExampleData().'); // Desactivada carga automática de ejemplos
        // loadExampleData(); // Desactivada carga automática de ejemplos
        
        // Simular clic en el botón de previsualizar para que los datos de ejemplo se procesen
        // setTimeout(() => { // Desactivada previsualización automática
        //     console.log('DOMContentLoaded: Intentando simular clic en #previewManualCardBtn.'); 
        //     const previewButton = document.getElementById('previewManualCardBtn');
        //     if (previewButton) {
        //         previewButton.click();
        //         console.log('DOMContentLoaded: Previsualización de datos de ejemplo disparada automáticamente.'); 
        //     } else {
        //         console.error('DOMContentLoaded: Botón #previewManualCardBtn no encontrado para simular clic.'); 
        //     }
        // }, 200); 
        console.log('DOMContentLoaded: Carga automática de datos de ejemplo y previsualización automática DESACTIVADAS.');
    } else {
        console.log('DOMContentLoaded: Plantilla base NO cargada, no se realizarán acciones automáticas.'); // Log ajustado
    }

    // Lógica para cargar datos si se está editando (ej. ?editCardId=...)
    // Esto se mantiene conceptualmente, pero los datos se cargarían en los campos del acordeón
    const urlParams = new URLSearchParams(window.location.search);
    const editCardId = urlParams.get("editCardId");
    if (editCardId) {
        console.log("Modo edición: Cargar datos para tarjeta ID:", editCardId, "en los campos del acordeón.");
        // Aquí iría la lógica para hacer fetch de los datos de la tarjeta con `editCardId`
        // y poblar los campos del acordeón: $('#pageTitle').val(data.pageTitle), etc.
        // Por ahora, solo un log.
        // fetch(`/admin/cards/data/${editCardId}`).then(res => res.json()).then(cardToEdit => { ... });
    } else if (urlParams.get("action") === "new") {
        // Limpiar campos del acordeón si es una tarjeta nueva explícitamente
        $('#cardCustomizationForm')[0].reset(); // Resetea el formulario del acordeón
         // El iframe ya se carga con la plantilla base, no es necesario about:blank aquí
        $("#saveCardBtn").hide(); 
    }


    // 2. Event Listener para el botón "Previsualizar Cambios en Iframe"
    const previewManualCardBtn = document.getElementById('previewManualCardBtn');
    if (previewManualCardBtn) {
        previewManualCardBtn.addEventListener('click', async () => {
            const formData = {
                pageTitle: document.getElementById('pageTitle').value,
                themeMode: document.getElementById('themeMode').value,
                metaDescription: document.getElementById('metaDescription').value,
                ogImageUrl: document.getElementById('ogImageUrl').value,
                faviconUrl: document.getElementById('faviconUrl').value,
                navBrandText: document.getElementById('navBrandText').value,
                navItemsHtml: document.getElementById('navItemsHtml').value,
                mainSectionsHtml: document.getElementById('mainSectionsHtml').value,
                footerText: document.getElementById('footerText').value,
                customStyles: document.getElementById('customStyles').value,
                customScripts: document.getElementById('customScripts').value
            };

            try {
                const response = await fetch('/admin/previewer/render-manual', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                if (!response.ok) {
                    // Intentar parsear el error si es JSON
                    try {
                        const errData = await response.json();
                        throw new Error(errData.message || `Error del servidor: ${response.statusText}`);
                    } catch (e) {
                         throw new Error(`Error del servidor: ${response.statusText} (Respuesta no JSON)`);
                    }
                }
                const processedHtml = await response.text();
                
                const iframe = document.getElementById('previewIframe');
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write(processedHtml);
                iframeDoc.close();
                $("#saveCardBtn").show(); // Mostrar botón de guardar después de previsualizar
                $(".placeholder-content").hide();
            } catch (error) {
                console.error('Error en previsualización manual:', error);
                Swal.fire("Error de Previsualización", error.message || "No se pudo generar la previsualización.", "error");
            }
        });
    }
});

// --- FIN: Nuevo código para flujo manual ---


// // Actualizar el prompt actual si el usuario lo cambia (SECCIÓN IA - COMENTADA)
// $("#prompt").on("input", function() {
//     currentPrompt = $(this).val();
// });

// // Manejar el envío del prompt a la IA (SECCIÓN IA - COMENTADA)
// $("form[action='/admin/previsualizador']").on("submit", function(event) { 
//     // ... (código original de IA omitido por brevedad, pero debería estar comentado o eliminado si no se usa)
// });


// Mostrar modal para guardar tarjeta
$("#saveCardBtn").on("click", function() {
    // Ya no dependemos de currentGeneratedHTML para el flujo manual
    // if (!currentGeneratedHTML) { 
    //     Swal.fire("Atención", "Primero genera contenido con la IA antes de guardar.", "warning");
    //     return;
    // }
    new bootstrap.Modal(document.getElementById("cardTitleModal")).show();
});

// Confirmar y guardar tarjeta
$("#confirmSaveCardBtn").on("click", function() {
    const cardTitle = $("#cardTitleInput").val();
    if (!cardTitle.trim()) {
        Swal.fire("Error", "El título de la tarjeta es obligatorio.", "error");
        return;
    }

    // Obtener el HTML final del iframe
    const iframe = document.getElementById('previewIframe');
    let finalHtmlContent = '';
    if (iframe && iframe.contentDocument && iframe.contentDocument.documentElement) {
        finalHtmlContent = iframe.contentDocument.documentElement.outerHTML;
    } else {
        Swal.fire("Error", "No se pudo obtener el contenido de la previsualización.", "error");
        console.error("Error: Iframe o su contenido no está accesible para guardar.");
        return;
    }

    const cardData = {
        title: cardTitle, // Título oficial de la tarjeta desde el modal
        finalHtmlContent: finalHtmlContent // HTML completo del iframe
        // No se envían los campos individuales del acordeón, ya que el backend reconstruirá la tarjeta
        // o los guardará si se decide implementar eso en la ruta de guardado.
        // Por ahora, solo title y el HTML final.
    };
    
    const method = "POST";
    const url = "/admin/previewer/save-card"; // Nueva URL para guardar la tarjeta manual

    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("cardTitleModal"));
            if (modalInstance) {
                modalInstance.hide();
            }
            Swal.fire("¡Guardado!", data.message || "Tarjeta guardada exitosamente.", "success")
                .then(() => {
                    window.location.href = "/admin/cards"; 
                });
        } else {
            Swal.fire("Error", data.message || "No se pudo guardar la tarjeta.", "error");
        }
    })
    .catch(error => {
        console.error("Error al guardar tarjeta:", error);
        Swal.fire("Error de Conexión", "No se pudo contactar al servidor para guardar la tarjeta.", "error");
    });
});

// Lógica para cargar tarjeta si se accede con ?editCardId= o ?action=new
// Esta lógica se movió parcialmente al DOMContentLoaded para la carga inicial de datos de edición.
// La limpieza para ?action=new también se maneja allí.

// // Código original de manejo de URL params (revisado y parcialmente integrado arriba)
// const urlParams = new URLSearchParams(window.location.search);
// const action = urlParams.get("action");
// const editCardId = urlParams.get("editCardId");
// if (action === "new") { ... } 
// else if (editCardId) { ... } 
// else { ... }
