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
      try {
        const contentJsonString = llamaResponse.data.choices[0].message.content;
        const parsedContent = JSON.parse(contentJsonString);
        return {
          html: parsedContent.html_code || '',
          css: parsedContent.css_code || '',
          js: parsedContent.js_code || ''
        };
      } catch (parseError) {
        console.error("Error parsing IA response content JSON en aiService:", parseError);
        console.error("IA response content string:", llamaResponse.data.choices[0].message.content);
        throw new Error('La respuesta de la IA no tuvo el formato JSON esperado en su contenido.');
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
