import axios from 'axios';
import db from '../db.cjs'; // Importar la instancia de Knex

async function getLlamaApiConfig() {
  const configsArray = await db('configs').where('section_key', 'ia_model_config').first();
  if (!configsArray || !configsArray.fields_config_json) {
    throw new Error('Configuración de ia_model_config no encontrada o sin campos.');
  }

  const fields = JSON.parse(configsArray.fields_config_json);
  let apiUrl = '';
  let apiKey = '';
  let systemPrompt = '';

  fields.forEach(field => {
    if (field.key === 'IA_API_URL') apiUrl = field.value;
    if (field.key === 'IA_API_KEY') apiKey = field.value;
    if (field.key === 'IA_SYSTEM_PROMPT') systemPrompt = field.value;
  });

  if (!apiUrl || !apiKey || !systemPrompt) {
    throw new Error('URL, API Key o System Prompt de la IA no configuradas en la BD para ia_model_config.');
  }
  return { apiUrl, apiKey, systemPrompt };
}

async function generateLlamaCompletion(userPrompt) {
  const { apiUrl, apiKey, systemPrompt } = await getLlamaApiConfig();

  const payload = {
    model: "llama3-8b", // Asumiendo este modelo por ahora
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    stream: false
  };

  try {
    console.log('Llamando a Llama API (desde aiService) URL:', `${apiUrl}/chat/completions`);
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

    // Procesar la respuesta para extraer el código
    if (llamaResponse.data && llamaResponse.data.choices && llamaResponse.data.choices[0] && llamaResponse.data.choices[0].message && llamaResponse.data.choices[0].message.content) {
      const contentString = llamaResponse.data.choices[0].message.content;
      let parsedContent;

      try {
        // Intento 1: Parsear directamente como JSON (esperado según el system prompt)
        parsedContent = JSON.parse(contentString);
      } catch (e) {
        // Intento 2: Si falla el JSON.parse, intentar con regex (para el caso donde la IA devuelve un string con formato de objeto JS y backticks o comillas)
        console.warn("JSON.parse falló para la respuesta directa de la IA, intentando regex para extraer contenido. Error de parseo:", e.message);
        console.warn("Content string que falló JSON.parse:", contentString);

        const extractWithRegex = (key, str) => {
          // Prioriza backticks si existen para un campo.
          let regex = new RegExp(`"${key}"\\s*:\\s*\`([\\s\\S]*?)\``);
          let match = str.match(regex);
          if (match && match[1]) return match[1].trim();

          // Fallback a comillas dobles si no se encontraron backticks para esta clave
          // Esta regex captura contenido entre comillas dobles, manejando comillas escapadas dentro.
          regex = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
          match = str.match(regex);
          if (match && match[1]) {
            // La cadena capturada (match[1]) ya está decodificada de escapes como \\ y \".
            // Para decodificar \n, \t, etc., necesitamos parsearla como una cadena JSON.
            try {
              return JSON.parse(`"${match[1].replace(/"/g, '\\"')}"`); // Re-escapar comillas internas para el parse
            } catch (jsonParseError) {
              console.error(`Error al parsear valor de regex para ${key}:`, jsonParseError, "Valor original:", match[1]);
              return match[1]; // Devolver el valor tal cual si el parseo de la subcadena falla
            }
          }
          return ''; // Devolver cadena vacía si no hay coincidencia
        };
        
        parsedContent = {
          html_code: extractWithRegex("html_code", contentString),
          css_code: extractWithRegex("css_code", contentString),
          js_code: extractWithRegex("js_code", contentString)
        };
      }

      // Verificar si se extrajo al menos el html_code
      if (parsedContent && (parsedContent.html_code || parsedContent.html_code === '')) { // Permitir html_code vacío
        return {
          html_code: parsedContent.html_code,
          css_code: parsedContent.css_code || '',
          js_code: parsedContent.js_code || ''
          // No hay información de tokens_cost aquí por ahora
        };
      } else {
        console.error("No se pudo extraer contenido válido de la respuesta de la IA. Respuesta original:", contentString, "Contenido parseado/extraído:", parsedContent);
        throw new Error('La respuesta de la IA no pudo ser procesada para extraer el contenido HTML.');
      }
    } else {
      console.error("Unexpected IA response structure in aiService:", llamaResponse.data);
      throw new Error('Respuesta inesperada del API de IA, no se encontró el contenido del mensaje.');
    }
  } catch (error) {
    console.error('Error en aiService llamando a Llama API:', error.response ? error.response.data : error.message);
    // Re-lanzar el error para que la ruta lo maneje o devolver una estructura de error más específica
    if (error.response) {
        // El request se hizo y el servidor respondió con un status code que cae fuera del rango de 2xx
        throw new Error(`Error de API Llama: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
        // El request se hizo pero no se recibió respuesta
        throw new Error('Error de API Llama: No se recibió respuesta del servidor.');
    } else {
        // Algo pasó al configurar el request que disparó un Error
        throw new Error(`Error de API Llama: ${error.message}`);
    }
  }
}

export { generateLlamaCompletion };
