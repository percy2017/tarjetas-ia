import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path'; // Importar path
import fs from 'fs'; // Importar fs
import authRoutes from './routes/auth.js';
import bodyParser from 'body-parser';
import session from 'express-session';
import engine from 'ejs-mate';
import multer from 'multer';
import mimeTypes from 'mime-types';
import db from './db.cjs'; // Importar la instancia de Knex
// axios ya no se usa directamente aquí para la llamada a Llama, se usa desde aiService
// import axios from 'axios'; 
import { generateLlamaCompletion } from './services/aiService.js'; // Importar el servicio de IA

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: process.env.SESSION_SECRET || 'default_fallback_secret', resave: false, saveUninitialized: false }));

// Middleware para pasar datos del usuario a las vistas
app.use((req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;
  } else {
    res.locals.currentUser = null;
  }
  next();
});

app.use('/', authRoutes); // Rutas de autenticación primero

// TODO: Configurar conexión a MySQL usando variables de entorno
// import mysql from 'mysql2/promise'; // o el driver que prefieras
// const dbConfig = {
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME
// };
// async function testDbConnection() {
//   try {
//     const connection = await mysql.createConnection(dbConfig);
//     console.log('Conectado a MySQL DB!');
//     await connection.end();
//   } catch (error) {
//     console.error('Error conectando a MySQL DB:', error);
//   }
// }
// testDbConnection(); // Descomentar para probar la conexión al iniciar

const requireLogin = (req, res, next) => {
  if (req.session && req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};

app.get('/admin', requireLogin, (req, res) => {
  // currentUser estará disponible en la plantilla gracias al middleware
  res.render('admin', { title: 'Admin Dashboard', currentPage: 'Dashboard' });
});

// Esta es la ruta GET /admin/previsualizador original que debe ser eliminada o reemplazada.
// La nueva versión está más abajo. Para evitar duplicados, la eliminaremos aquí.
// app.get('/admin/previsualizador', requireLogin, (req, res) => {
//   // currentUser estará disponible en la plantilla
//   res.render('previsualizador', { title: 'Previsualizador de Páginas', currentPage: 'Previsualizador de Páginas' });
// });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); // Files will be uploaded to the 'public/uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original file name
  }
});

const upload = multer({ storage: storage });

app.get('/admin/multimedia', requireLogin, (req, res) => {
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('Error reading uploads directory:', err);
      res.render('multimedia', { title: 'Gestión de Multimedia', files: [] });
      return;
    }

    const multimediaFiles = files.map(file => {
      const mimeType = mimeTypes.lookup(file) || 'unknown';
      return {
        filename: file,
        mimeType: mimeType // Aquí podríamos añadir más info si la tuviéramos del fs.statSync
      };
    });
    // currentUser estará disponible en la plantilla
    res.render('multimedia', { title: 'Gestión de Multimedia', files: multimediaFiles, currentPage: 'Multimedia' });
  });
});

app.post('/admin/multimedia/upload', requireLogin, upload.array('multimediaFiles'), (req, res) => {
  // Files have been uploaded and are available in req.files
  console.log('Archivos subidos:', req.files);
  res.redirect('/admin/multimedia');
});

// fs y path ya están importados arriba

app.get('/admin/ventas', requireLogin, (req, res) => {
  const ventasData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'data', 'ventas.json'), 'utf-8'));
  // currentUser estará disponible en la plantilla
  res.render('ventas', { title: 'Ventas', ventas: ventasData, currentPage: 'Ventas' });
});

app.get('/admin/configuracion', requireLogin, async (req, res) => {
  try {
    const sections = await db('configs').orderBy('display_order');
    // Parsear el JSON de cada sección
    const sectionsWithParsedJson = sections.map(section => ({
      ...section,
      fields_config_json: JSON.parse(section.fields_config_json)
    }));
    res.render('configuracion', { 
      title: 'Configuración', 
      currentPage: 'Configuración',
      sections: sectionsWithParsedJson,
      successMessage: req.session.successMessage, // Para mensajes flash
      errorMessage: req.session.errorMessage
    });
    // Limpiar mensajes flash de la sesión
    req.session.successMessage = null;
    req.session.errorMessage = null;
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    res.render('configuracion', { 
      title: 'Configuración', 
      currentPage: 'Configuración',
      sections: [],
      errorMessage: 'Error al cargar las configuraciones.'
    });
  }
});

app.post('/admin/configuracion/guardar/:section_key', requireLogin, async (req, res) => {
  const { section_key } = req.params;
  const formData = req.body;

  try {
    const section = await db('configs').where({ section_key }).first();
    if (!section) {
      req.session.errorMessage = 'Sección de configuración no encontrada.';
      return res.redirect('/admin/configuracion');
    }

    let fieldsConfig = JSON.parse(section.fields_config_json);

    // Actualizar los valores en el JSON
    fieldsConfig = fieldsConfig.map(field => {
      if (formData.hasOwnProperty(field.name)) {
        return { ...field, value: formData[field.name] };
      }
      return field;
    });

    await db('configs')
      .where({ section_key })
      .update({ fields_config_json: JSON.stringify(fieldsConfig) });

    req.session.successMessage = `Configuración de "${section.section_title}" guardada exitosamente.`;
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    req.session.errorMessage = 'Error al guardar la configuración.';
  }
  res.redirect('/admin/configuracion');
});

// La ruta POST /admin/previsualizador original se elimina completamente.
// La nueva ruta POST /admin/previsualizador (que llama a la IA) está definida más abajo.

// Nueva ruta GET /admin/previsualizador (maneja preview_url, mensajes flash y carga automática)
app.get('/admin/previsualizador', requireLogin, (req, res) => {
  let previewUrlFromSession = req.session.preview_url; 
  const apiResponseData = req.session.apiResponseData;
  const successMessage = req.session.successMessage;
  const errorMessage = req.session.errorMessage;

  // Limpiar de la sesión inmediatamente
  req.session.preview_url = null;
  req.session.apiResponseData = null;
  req.session.successMessage = null;
  req.session.errorMessage = null;

  let finalPreviewUrl = previewUrlFromSession; // Usar el de la sesión si existe

  if (!finalPreviewUrl) { // Si no vino de la sesión (ej. carga directa de la página)
    const localPreviewFilePath = path.join(__dirname, 'public', 'cliente_prueba', 'index.html');
    if (fs.existsSync(localPreviewFilePath)) {
      finalPreviewUrl = '/cliente_prueba/index.html';
    }
  }

  res.render('previsualizador', { 
    title: 'Previsualizador de Páginas', 
    currentPage: 'Previsualizador de Páginas',
    previewUrl: finalPreviewUrl, // Usar la URL final determinada
    apiResponseData: apiResponseData,
    successMessage: successMessage,
    errorMessage: errorMessage
  });
});

app.post('/admin/previsualizador', requireLogin, async (req, res) => {
  const userPrompt = req.body.prompt;
  console.log('Prompt recibido para IA:', userPrompt);

  try {
    // 1. Llamar al servicio de IA (que ahora obtiene la config internamente)
    const generatedContent = await generateLlamaCompletion(userPrompt);

    // 2. Escribir archivos con el contenido generado
    const htmlFileContent = generatedContent.html || `<h1>Error al generar HTML</h1><p>Prompt: ${userPrompt}</p>`;
    const cssFileContent = generatedContent.css || '/* CSS no provisto o error */';
    const jsFileContent = generatedContent.js || '// JS no provisto o error';

    const clientDir = path.join(__dirname, 'public', 'cliente_prueba');
    try {
      fs.mkdirSync(clientDir, { recursive: true });
      fs.writeFileSync(path.join(clientDir, 'index.html'), htmlFileContent);
      fs.writeFileSync(path.join(clientDir, 'style.css'), cssFileContent);
      fs.writeFileSync(path.join(clientDir, 'script.js'), jsFileContent);

      req.session.preview_url = '/cliente_prueba/index.html'; // Para el iframe
      req.session.successMessage = 'Página generada por IA y archivos creados exitosamente.';
      req.session.apiResponseData = null; // Ya no necesitamos mostrar la respuesta cruda
    } catch (fileError) {
      console.error('Error escribiendo archivos generados por IA:', fileError);
      req.session.errorMessage = 'Error al escribir los archivos generados por la IA.';
    }

  } catch (error) {
    console.error('Error en POST /admin/previsualizador:', error.message);
    req.session.errorMessage = `Error al contactar el API de IA: ${error.message}`;
    if (error.response && error.response.data) {
        req.session.errorMessage += ` Detalles: ${JSON.stringify(error.response.data)}`;
    }
  }

  res.redirect('/admin/previsualizador');
});

app.post('/admin/configuracion/secciones/crear', requireLogin, async (req, res) => {
  const { section_key, section_title, display_order, fields_json_string } = req.body;

  if (!section_key || !section_title) {
    req.session.errorMessage = 'La clave y el título de la sección son obligatorios.';
    return res.redirect('/admin/configuracion');
  }

  try {
    // Verificar si la section_key ya existe
    const existingSection = await db('configs').where({ section_key }).first();
    if (existingSection) {
      req.session.errorMessage = `La clave de sección '${section_key}' ya existe.`;
      return res.redirect('/admin/configuracion');
    }

    // Parsear fields_json_string (debería ser un array de objetos campo)
    // El frontend se encargará de construir este JSON string correctamente.
    // Aquí solo lo guardamos. La validación del contenido del JSON puede ser más compleja.
    // Por ahora, confiamos en que el frontend envía un JSON válido para fields_config_json.
    // No es necesario parsearlo aquí si la columna es JSONB, Knex/PG lo manejan.
    // Pero si fields_json_string es un string que representa el array, y la columna es JSONB,
    // Knex/PG debería manejar la conversión. Si es un campo de texto, necesitaríamos JSON.parse.
    // Asumiendo que fields_config_json en la BD es de tipo JSON/JSONB.

    await db('configs').insert({
      section_key,
      section_title,
      display_order: parseInt(display_order, 10) || 0,
      fields_config_json: fields_json_string // El frontend debe enviar esto como un string JSON válido
    });

    req.session.successMessage = `Sección '${section_title}' creada exitosamente.`;
  } catch (error) {
    console.error('Error al crear nueva sección de configuración:', error);
    req.session.errorMessage = 'Error al crear la sección: ' + error.message;
  }
  res.redirect('/admin/configuracion');
});


// La ruta GET /profile se mantiene si es necesaria, o se elimina si no.
// Por ahora, la mantendré como estaba antes de mi cambio anterior.
app.get('/profile', requireLogin, (req, res) => {
  res.send('Profile page');
});

app.get('/', (req, res) => {
  res.render('index', { title: 'Hola Mundo' });
});

app.listen(port, () => {
  console.log(`La aplicación está escuchando en el puerto ${port}`);
});
