 // Almacenar el contenido generado por la IA
let currentGeneratedHTML = null;
let currentGeneratedCSS = null;
let currentGeneratedJS = null;
let currentPrompt = $("#prompt").val(); // Guardar el prompt inicial o cargado

// Actualizar el prompt actual si el usuario lo cambia
$("#prompt").on("input", function() {
    currentPrompt = $(this).val();
});

// Manejar el envío del prompt a la IA
$("form[action='/admin/previsualizador']").on("submit", function(event) {
    event.preventDefault();
    currentPrompt = $("#prompt").val(); // Asegurarse de tener el último prompt
    const formData = new FormData(this);
    $("#sendPromptBtn").prop("disabled", true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generando...');
    
    fetch("/admin/previsualizador", {
        method: "POST",
        body: new URLSearchParams(formData) // Enviar como form data
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw err; });
        }
        return response.json();
    })
    .then(data => {
        $("#sendPromptBtn").prop("disabled", false).html("Enviar Prompt a IA");
        if (data.success && data.generatedContent) {
            currentGeneratedHTML = data.generatedContent.html_code || "";
            currentGeneratedCSS = data.generatedContent.css_code || "";
            currentGeneratedJS = data.generatedContent.js_code || "";

            // Eliminar enlaces a styles.css y script.js del HTML base antes de escribir en el iframe
            currentGeneratedHTML = currentGeneratedHTML.replace(/<link\s+rel="stylesheet"\s+href="styles\.css"[^>]*>/gi, '');
            currentGeneratedHTML = currentGeneratedHTML.replace(/<script\s+src="script\.js"[^>]*><\/script>/gi, '');

            const iframe = document.getElementById("previewIframe");
            const iframeDoc = iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(currentGeneratedHTML); // Escribir solo el HTML base primero

            // Añadir CSS de forma más segura
            if (currentGeneratedCSS) {
                const styleEl = iframeDoc.createElement('style');
                styleEl.textContent = currentGeneratedCSS;
                iframeDoc.head.appendChild(styleEl);
            }

            // Añadir JS
            if (currentGeneratedJS) {
                const scriptEl = iframeDoc.createElement('script');
                scriptEl.textContent = currentGeneratedJS;
                iframeDoc.body.appendChild(scriptEl); // O head, dependiendo de cuándo deba ejecutarse
            }
            
            iframeDoc.close();
            $("#saveCardBtn").show();
            $(".placeholder-content").hide(); // Ocultar placeholder si existe
        } else {
            Swal.fire("Error", data.message || "No se pudo generar el contenido.", "error");
            $("#saveCardBtn").hide();
        }
    })
    .catch(error => {
        $("#sendPromptBtn").prop("disabled", false).html("Enviar Prompt a IA");
        console.error("Error al enviar prompt:", error);
        let msg = "Error al contactar la IA.";
        if(error && error.message) msg = error.message;
        Swal.fire("Error de Conexión", msg, "error");
        $("#saveCardBtn").hide();
    });
});

// Mostrar modal para guardar tarjeta
$("#saveCardBtn").on("click", function() {
    if (!currentGeneratedHTML) {
        Swal.fire("Atención", "Primero genera contenido con la IA antes de guardar.", "warning");
        return;
    }
    // Si estamos editando, podríamos pre-rellenar el título
    // const editingCardTitle = ... // Lógica para obtener el título si se está editando
    // $("#cardTitleInput").val(editingCardTitle || "");
    new bootstrap.Modal(document.getElementById("cardTitleModal")).show();
});

// Confirmar y guardar tarjeta
$("#confirmSaveCardBtn").on("click", function() {
    const cardTitle = $("#cardTitleInput").val();
    if (!cardTitle.trim()) {
        Swal.fire("Error", "El título de la tarjeta es obligatorio.", "error");
        return;
    }

    const cardData = {
        title: cardTitle,
        html_content: currentGeneratedHTML,
        css_content: currentGeneratedCSS,
        js_content: currentGeneratedJS,
        original_prompt: currentPrompt // Enviar el prompt actual
    };
    
    // Determinar si es POST (nueva) o PUT (actualizar)
    // Esto necesitaría que se pase `editingCard.id` a la vista si se está editando
    let method = "POST";
    let url = "/admin/cards";
    const editingCardId = $("input[name=editingCardId]").val(); // Asumiendo que tienes un input hidden con este id si editas

    if (editingCardId) { // Lógica para modo edición (a implementar completamente)
            // method = "PUT";
            // url = "/admin/cards/" + editingCardId;
            // Por ahora, la creación es el foco principal
            console.warn("Modo edición aún no completamente implementado para guardar.");
            // return; // Descomentar si no se quiere permitir guardar en modo edición aún
    }


    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById("cardTitleModal")).hide();
            Swal.fire("¡Guardado!", data.message || "Tarjeta guardada exitosamente.", "success")
                .then(() => {
                    window.location.href = "/admin/cards"; // Redirigir a la lista de tarjetas
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
const urlParams = new URLSearchParams(window.location.search);
const action = urlParams.get("action");
const editCardId = urlParams.get("editCardId");

if (action === "new") {
    $("#prompt").val(""); // Limpiar prompt
    currentGeneratedHTML = null; // Resetear contenido
    currentGeneratedCSS = null;
    currentGeneratedJS = null;
    currentPrompt = "";
    const iframe = document.getElementById("previewIframe");
    iframe.src = "about:blank"; // Limpiar iframe
    $("#saveCardBtn").hide(); // Ocultar botón de guardar hasta que se genere contenido
    $(".placeholder-content").show();
} else if (editCardId) {
    // Aquí iría la lógica para cargar los datos de 
    console.log("Modo edición: Cargar datos para tarjeta ID:", editCardId);
        $(".placeholder-content").hide();
} else {
    // Carga normal, podría cargar la última tarjeta del usuario si esa es la lógica deseada
    // o simplemente mostrar el placeholder si previewUrl no está definido.
    if (!$("#previewIframe").attr("src") || $("#previewIframe").attr("src") === "about:blank") {
            $(".placeholder-content").show();
    } else {
            $(".placeholder-content").hide();
    }
}
