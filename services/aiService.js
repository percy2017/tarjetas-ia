import axios from 'axios';
import db from '../db.cjs'; // Importar la instancia de Knex

// Definimos el system_prompt exitoso directamente en el código.
const SUCCESSFUL_SYSTEM_PROMPT = `Eres un asistente de IA especializado en desarrollo web frontend. Tu única tarea es generar un objeto JSON que contenga el código HTML, CSS y JavaScript para una tarjeta de presentación digital, basado en la descripción proporcionada por el usuario.

REGLAS CRÍTICAS PARA TU RESPUESTA:
1.  Tu respuesta DEBE SER ÚNICA Y EXCLUSIVAMENTE un objeto JSON válido. NO incluyas ningún texto, explicación, saludo, despedida, markdown, ni ningún carácter antes del '{' inicial o después del '}' final del objeto JSON.
2.  El objeto JSON DEBE tener exactamente tres claves principales: "html_code", "css_code", y "js_code".
3.  Los valores para estas tres claves DEBEN ser strings que contengan el código correspondiente.
4.  El string de "html_code" DEBE ser un documento HTML5 completo y bien formado. En la sección <head> del HTML, DEBES incluir textualmente la etiqueta: <link rel="stylesheet" href="style.css">. Antes de la etiqueta de cierre </body>, DEBES incluir textualmente la etiqueta: <script src="script.js"></script>.
5.  El string de "css_code" DEBE contener el código CSS necesario para estilizar el HTML proporcionado.
6.  El string de "js_code" DEBE contener el código JavaScript. Si no se requiere JavaScript específico para la funcionalidad descrita, puede ser un string vacío o un simple console.log.
7.  Todas las claves del objeto JSON y todos los valores de tipo string dentro del JSON (incluyendo el código HTML, CSS y JS) DEBEN estar encerrados estrictamente en comillas dobles ("). NO uses comillas simples.

EJEMPLO DE LA ESTRUCTURA JSON EXACTA ESPERADA:
{
  "html_code": "<!DOCTYPE html><html lang=\\"es\\"><head><meta charset=\\"UTF-8\\"><meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\"><title>Mi Tarjeta</title><link rel=\\"stylesheet\\" href=\\"style.css\\"></head><body><div class=\\"tarjeta\\"><h1 class=\\"nombre\\">Nombre Apellido</h1><p class=\\"profesion\\">Profesión</p></div><script src=\\"script.js\\"></script></body></html>",
  "css_code": "body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f0f0f0; } .tarjeta { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; } .nombre { color: #333; } .profesion { color: #777; }",
  "js_code": "console.log('Tarjeta de presentación cargada.');"
}

Ahora, procesa la siguiente descripción del usuario y genera el objeto JSON correspondiente siguiendo todas estas reglas al pie de la letra.`;

async function getLlamaApiConfig() {
  const configsArray = await db('configs').where('section_key', 'ia_model_config').first();
  if (!configsArray || !configsArray.fields_config_json) {
    throw new Error('Configuración de ia_model_config no encontrada o sin campos.');
  }

  const fields = JSON.parse(configsArray.fields_config_json);
  let apiUrl = '';
  let apiKey = '';
  // Ya no necesitamos obtener el systemPrompt de la BD para esta función específica.
  // let systemPrompt = ''; 

  fields.forEach(field => {
    if (field.key === 'IA_API_URL') apiUrl = field.value;
    if (field.key === 'IA_API_KEY') apiKey = field.value;
    // if (field.key === 'IA_SYSTEM_PROMPT') systemPrompt = field.value;
  });

  if (!apiUrl || !apiKey) { // Solo verificamos apiUrl y apiKey
    throw new Error('URL o API Key de la IA no configuradas en la BD para ia_model_config.');
  }
  return { apiUrl, apiKey }; // Devolvemos solo apiUrl y apiKey
}

async function generateLlamaCompletion(userPrompt) {
  const { apiUrl, apiKey } = await getLlamaApiConfig();

  const payload = {
    model: "llama3.1-70b", 
    messages: [
      {
        role: "system",
        content: SUCCESSFUL_SYSTEM_PROMPT // Usar el system_prompt definido arriba
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    stream: false,
    // Eliminamos 'tools' y 'tool_choice'
    max_tokens: 3500,      // Ajustado según la prueba exitosa de Postman
    temperature: 0.2       // Ajustado según la prueba exitosa de Postman
    // Si la API soporta response_format: { type: "json_object" }, se añadiría aquí.
    // "response_format": { "type": "json_object" } 
  };

  try {
    console.log('Llamando a Llama API (aiService) con Solicitud Normal. URL:', `${apiUrl}/chat/completions`);
    console.log('Payload enviado a Llama API (Solicitud Normal):', JSON.stringify(payload, null, 2));
    
    const llamaResponse = await axios.post(
      `${apiUrl}/chat/completions`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Respuesta completa de Llama API (Solicitud Normal):', JSON.stringify(llamaResponse.data, null, 2));

    if (llamaResponse.data && llamaResponse.data.choices && llamaResponse.data.choices[0].message && llamaResponse.data.choices[0].message.content) {
      const messageContent = llamaResponse.data.choices[0].message.content;
      try {
        // Intentamos parsear directamente el contenido del mensaje.
        const parsedContent = JSON.parse(messageContent);
        const tokensConsumed = (llamaResponse.data.usage && llamaResponse.data.usage.total_tokens) 
                               ? llamaResponse.data.usage.total_tokens 
                               : 0; // Fallback a 0

        // Validar que el JSON parseado tenga la estructura esperada
        if (typeof parsedContent.html_code === 'string' &&
            typeof parsedContent.css_code === 'string' &&
            typeof parsedContent.js_code === 'string') {
          return {
            html_code: parsedContent.html_code,
            css_code: parsedContent.css_code,
            js_code: parsedContent.js_code,
            tokens_cost: tokensConsumed
          };
        } else {
          console.error("El JSON parseado de la IA no tiene la estructura esperada (html_code, css_code, js_code). Contenido:", parsedContent);
          throw new Error('El JSON devuelto por la IA no contiene las claves esperadas (html_code, css_code, js_code).');
        }
      } catch (e) {
        console.error("Error al parsear el contenido del mensaje de la IA:", e.message);
        console.error("Contenido recibido (string):", messageContent);
        throw new Error('La IA devolvió contenido en un formato JSON inválido o no esperado.');
      }
    } else {
      console.error("Respuesta inesperada de la IA, no se encontró message.content o estructura esperada:", JSON.stringify(llamaResponse.data, null, 2));
      throw new Error('Respuesta inesperada del API de IA, la estructura de respuesta es incorrecta.');
    }
  } catch (error) {
    console.error('Error en aiService llamando a Llama API:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    if (error.response) {
        throw new Error(`Error de API Llama: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
        throw new Error('Error de API Llama: No se recibió respuesta del servidor.');
    } else {
        throw new Error(`Error de API Llama: ${error.message}`);
    }
  }
}

export { generateLlamaCompletion };
