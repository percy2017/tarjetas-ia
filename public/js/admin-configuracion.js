
jQuery(document).ready(function() {
    // Lógica para Alpaca (renderizar secciones existentes)
    let localSectionsData = []; 

    // Se espera que 'sections' sea una variable global definida en el EJS.
    if (typeof sections !== 'undefined' && Array.isArray(sections)) {
        localSectionsData = sections;
    } else {
        console.warn("La variable global 'sections' no se encontró o no es un array. Verifica tu plantilla configuracion.ejs.");
        // localSectionsData permanecerá como [] si 'sections' no está disponible,
        // lo cual es un comportamiento seguro para el resto del script.
    }
    
    if (Array.isArray(localSectionsData)) {
        localSectionsData.forEach(function(section) {
            if (!section || !section.fields_config_json) {
                console.warn("Skipping section due to missing fields_config_json:", section);
                return; 
            }

            const alpacaSchema = {
                "type": "object",
                "properties": {}
            };
            const alpacaOptions = {
                "fields": {}
            };
            const alpacaData = {};

            section.fields_config_json.forEach(function(field) {
                alpacaSchema.properties[field.name] = {
                    // "type": "string" // Default, se ajustará abajo
                };

                if (field.type === 'number') {
                    alpacaSchema.properties[field.name].type = "number";
                } else if (field.type === 'boolean') {
                    alpacaSchema.properties[field.name].type = "boolean";
                } else if (field.type === 'url') {
                    alpacaSchema.properties[field.name].type = "string";
                    alpacaSchema.properties[field.name].format = "uri";
                } else {
                    alpacaSchema.properties[field.name].type = "string"; // Default para text, textarea, password
                }
                
                let optionFieldType = field.type;
                if (field.type === 'boolean') {
                    optionFieldType = 'checkbox'; // Para que Alpaca renderice un checkbox
                } else if (field.type === 'url') {
                    optionFieldType = 'url'; // Alpaca tiene un tipo de campo URL
                }
                // textarea, password, number, text son tipos válidos para options.fields[...].type

                alpacaOptions.fields[field.name] = {
                    "label": field.label,
                    "placeholder": field.placeholder,
                    "type": optionFieldType
                };
                alpacaData[field.name] = field.value;
            });
        
            alpacaOptions.buttons = {}; 

            $("#form-container-" + section.section_key).alpaca({
                "schema": alpacaSchema,
                "options": alpacaOptions,
                "data": alpacaData,
                "view": "bootstrap-edit-horizontal"
            });
        });
    }

    // Lógica para el modal "Añadir Nueva Sección"
    $('#addNewFieldButton').on('click', function() {
        const newFieldRow = $('#fieldRowTemplate').clone().removeAttr('id').show();
        $('#fieldsDefinitionContainer').append(newFieldRow);
    });

    $('#fieldsDefinitionContainer').on('click', '.removeFieldButton', function() {
        $(this).closest('.row').remove();
    });

    $('#addSectionForm').on('submit', function(e) {
        const fieldsArray = [];
        $('#fieldsDefinitionContainer .row').each(function() {
            const fieldKey = $(this).find('.field-key').val();
            const fieldLabel = $(this).find('.field-label').val();
            const fieldType = $(this).find('.field-type').val();
            const fieldName = $(this).find('.field-name').val();
            const fieldPlaceholder = $(this).find('.field-placeholder').val();

            if (fieldKey && fieldLabel && fieldType && fieldName) { // Asegurar que los campos esenciales estén llenos
                fieldsArray.push({
                    key: fieldKey,
                    label: fieldLabel,
                    type: fieldType,
                    name: fieldName,
                    placeholder: fieldPlaceholder || '',
                    value: '' // Valor inicial siempre vacío para nuevos campos
                });
            }
        });
        $('#fields_json_string').val(JSON.stringify(fieldsArray));
        // El formulario se enviará normalmente (no e.preventDefault())
    });

    // Añadir un campo por defecto al abrir el modal si no hay ninguno
    $('#addSectionModal').on('show.bs.modal', function () {
        if ($('#fieldsDefinitionContainer .row').length === 0) {
            $('#addNewFieldButton').trigger('click');
        }
    });
});
