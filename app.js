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
import adminMenuRouter from './routes/adminMenu.js'; // Importar el router del editor de menú
import cardsRouter from './routes/cards.js'; // Importar el router de tarjetas
import flash from 'connect-flash'; // Importar connect-flash

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json()); // Middleware para parsear JSON bodies
app.use(session({ secret: process.env.SESSION_SECRET || 'default_fallback_secret', resave: false, saveUninitialized: false }));
app.use(flash()); // Configurar connect-flash DESPUÉS de session

// Middleware para pasar datos del usuario y mensajes flash a las vistas
app.use((req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;
  } else {
    res.locals.currentUser = null;
  }
  res.locals.successMessage = req.flash('successMessage');
  res.locals.errorMessage = req.flash('errorMessage');
  next();
});

// Middleware para cargar ítems del menú dinámico para el panel de administración
app.use(async (req, res, next) => {
  if (req.session && req.session.user) {
    try {
      const userRole = req.session.user.role;
      // Obtener todos los ítems y filtrar en la lógica de la plantilla o aquí mismo
      // Por ahora, obtenemos todos los que no tienen parent_id (nivel superior)
      // y luego en la plantilla se podría decidir si mostrar o no según el rol.
      // O filtrar aquí: .whereJsonSuperset('roles', [userRole]).orWhereJsonSuperset('roles', ['all'])
      // Knex no tiene un `whereJsonContains` directo para arrays simples de strings como "admin", "client".
      // Una forma es obtener todos y filtrar en JS, o usar raw SQL si la lógica de roles es compleja.
      // Para simplificar, obtendremos todos los ítems ordenados y el layout se encargará de filtrar por rol.
      
      const allMenuItems = await db('admin_menu_items').orderBy('display_order', 'asc');
      
      // Filtrar ítems basados en el rol del usuario
      // Un ítem se muestra si su array de roles incluye el rol del usuario actual,
      // o si el array de roles está vacío o contiene 'all' (lo que implicaría visible para todos los logueados)
      res.locals.adminMenuItems = allMenuItems.filter(item => {
        if (!item.roles || item.roles.length === 0) return true; // Visible para todos si no hay roles definidos
        try {
          const itemRoles = JSON.parse(item.roles); // Roles se guarda como JSON string
          return itemRoles.includes(userRole) || itemRoles.includes('all');
        } catch (e) {
          console.error('Error parseando roles del menú:', item.roles, e);
          return false; // No mostrar si hay error en los roles
        }
      });

    } catch (error) {
      console.error("Error al cargar ítems del menú:", error);
      res.locals.adminMenuItems = [];
    }
  } else {
    res.locals.adminMenuItems = [];
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

// Definir la ruta específica para el dashboard /admin ANTES del router más general
app.get('/admin', requireLogin, (req, res) => {
  // currentUser estará disponible en la plantilla gracias al middleware
  res.render('admin', { title: 'Admin Dashboard', currentPage: 'Dashboard' });
});

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); // Files will be uploaded to the 'public/uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original file name
  }
});
const upload = multer({ storage: storage });

// Definir otras rutas específicas de /admin/* ANTES del adminMenuRouter
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
        mimeType: mimeType
      };
    });
    res.render('multimedia', { title: 'Gestión de Multimedia', files: multimediaFiles, currentPage: 'Multimedia' });
  });
});

app.post('/admin/multimedia/upload', requireLogin, upload.array('multimediaFiles'), (req, res) => {
  console.log('Archivos subidos:', req.files);
  res.redirect('/admin/multimedia');
});

app.get('/admin/ventas', requireLogin, (req, res) => {
  const ventasData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'data', 'ventas.json'), 'utf-8'));
  res.render('ventas', { title: 'Ventas', ventas: ventasData, currentPage: 'Ventas' });
});

app.get('/admin/configuracion', requireLogin, async (req, res) => {
  try {
    const sections = await db('configs').orderBy('display_order');
    const sectionsWithParsedJson = sections.map(section => ({
      ...section,
      fields_config_json: JSON.parse(section.fields_config_json)
    }));
    res.render('configuracion', { 
      title: 'Configuración', 
      currentPage: 'Configuración',
      sections: sectionsWithParsedJson
    });
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
      req.flash('errorMessage', 'Sección de configuración no encontrada.');
      return res.redirect('/admin/configuracion');
    }
    let fieldsConfig = JSON.parse(section.fields_config_json);
    fieldsConfig = fieldsConfig.map(field => {
      if (formData.hasOwnProperty(field.name)) {
        return { ...field, value: formData[field.name] };
      }
      return field;
    });
    await db('configs')
      .where({ section_key })
      .update({ fields_config_json: JSON.stringify(fieldsConfig) });
    req.flash('successMessage', `Configuración de "${section.section_title}" guardada exitosamente.`);
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    req.flash('errorMessage', 'Error al guardar la configuración.');
  }
  res.redirect('/admin/configuracion');
});

// Nueva ruta GET /admin/previsualizador
app.get('/admin/previsualizador', requireLogin, (req, res) => {
  const previewUrlFromSession = req.session.preview_url; 
  const apiResponseData = req.session.apiResponseData;
  req.session.preview_url = null;
  req.session.apiResponseData = null;
  let finalPreviewUrl = previewUrlFromSession;
  if (!finalPreviewUrl) {
    const localPreviewFilePath = path.join(__dirname, 'public', 'cliente_prueba', 'index.html');
    if (fs.existsSync(localPreviewFilePath)) {
      finalPreviewUrl = '/cliente_prueba/index.html';
    }
  }
  res.render('previsualizador', { 
    title: 'Previsualizador de Páginas', 
    currentPage: 'Previsualizador de Páginas',
    previewUrl: finalPreviewUrl,
    apiResponseData: apiResponseData
  });
});

app.post('/admin/previsualizador', requireLogin, async (req, res) => {
  const userPrompt = req.body.prompt;
  try {
    const generatedContent = await generateLlamaCompletion(userPrompt);
    console.log("Respuesta completa de generateLlamaCompletion:", JSON.stringify(generatedContent, null, 2)); // <--- CONSOLE.LOG AÑADIDO
    // generatedContent debería tener una estructura como { html_code: "...", css_code: "...", js_code: "..." }
    // o similar, según lo devuelva tu servicio aiService.js

    if (generatedContent && generatedContent.html_code) { // Asumiendo que html_code es el campo principal
      res.json({ 
        success: true, 
        message: 'Contenido generado por IA exitosamente.', 
        generatedContent: generatedContent // Enviar todo el objeto
      });
    } else {
      // Si generatedContent no tiene la estructura esperada o falta html_code
      console.error('Respuesta inesperada de generateLlamaCompletion:', generatedContent);
      res.status(500).json({ 
        success: false, 
        message: 'Error: La IA no devolvió contenido HTML válido.',
        generatedContent: generatedContent // Enviar lo que se haya recibido para depuración
      });
    }
  } catch (error) {
    console.error('Error en POST /admin/previsualizador llamando a IA:', error);
    let detailedError = `Error al contactar el API de IA: ${error.message || 'Error desconocido'}`;
    // No intentar acceder a error.response.data si error.response no existe
    if (error.response && error.response.data) {
        detailedError += ` Detalles: ${JSON.stringify(error.response.data)}`;
    }
    res.status(500).json({ success: false, message: detailedError });
  }
});

app.post('/admin/configuracion/secciones/crear', requireLogin, async (req, res) => {
  const { section_key, section_title, display_order, fields_json_string } = req.body;
  if (!section_key || !section_title) {
    req.flash('errorMessage', 'La clave y el título de la sección son obligatorios.');
    return res.redirect('/admin/configuracion');
  }
  try {
    const existingSection = await db('configs').where({ section_key }).first();
    if (existingSection) {
      req.flash('errorMessage', `La clave de sección '${section_key}' ya existe.`);
      return res.redirect('/admin/configuracion');
    }
    await db('configs').insert({
      section_key,
      section_title,
      display_order: parseInt(display_order, 10) || 0,
      fields_config_json: fields_json_string
    });
    req.flash('successMessage', `Sección '${section_title}' creada exitosamente.`);
  } catch (error) {
    console.error('Error al crear nueva sección de configuración:', error);
    req.flash('errorMessage', 'Error al crear la sección: ' + error.message);
  }
  res.redirect('/admin/configuracion');
});

// El adminMenuRouter debe ir DESPUÉS de las rutas específicas de /admin/*
app.use('/admin/cards', cardsRouter); // Rutas para la gestión de tarjetas
app.use('/admin', adminMenuRouter); // Rutas para el editor de menú y otras bajo /admin/*

// Esta es la ruta GET /admin/previsualizador original que debe ser eliminada o reemplazada.
// La nueva versión está más abajo. Para evitar duplicados, la eliminaremos aquí.
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
