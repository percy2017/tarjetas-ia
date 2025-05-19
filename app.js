import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import bodyParser from 'body-parser';
import session from 'express-session';
import engine from 'ejs-mate';
import multer from 'multer';
import mimeTypes from 'mime-types';

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
app.use('/', authRoutes);

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
  console.log(req.session);
  res.render('admin', { title: 'Admin Dashboard', user: 'admin', currentPage: 'Dashboard' });
});

app.get('/admin/previsualizador', requireLogin, (req, res) => {
  res.render('previsualizador', { title: 'Previsualizador de Páginas', currentPage: 'Previsualizador de Páginas' });
});

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
        mimeType: mimeType
      };
    });

    res.render('multimedia', { title: 'Gestión de Multimedia', files: multimediaFiles, currentPage: 'Multimedia' });
  });
});

app.post('/admin/multimedia/upload', requireLogin, upload.array('multimediaFiles'), (req, res) => {
  // Files have been uploaded and are available in req.files
  console.log('Archivos subidos:', req.files);
  res.redirect('/admin/multimedia');
});

import fs from 'fs';
import path from 'path';

app.get('/admin/ventas', requireLogin, (req, res) => {
  const ventasData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'data', 'ventas.json'), 'utf-8'));
  res.render('ventas', { title: 'Ventas', ventas: ventasData, currentPage: 'Ventas' });
});

app.get('/admin/configuracion', requireLogin, (req, res) => {
  res.render('configuracion', { title: 'Configuración', currentPage: 'Configuración' });
});

app.post('/admin/previsualizador', requireLogin, (req, res) => {
  const prompt = req.body.prompt;
  console.log('Prompt recibido:', prompt);

  const clientDir = path.join(__dirname, 'public', 'cliente_prueba');
  const htmlContent = `<!DOCTYPE html><html><body><h1>${prompt}</h1></body></html>`;
  const cssContent = `body { background-color: lightblue; }`;
  const jsContent = `console.log('Página generada para: ${prompt}');`;

  fs.mkdir(clientDir, { recursive: true }, (err) => {
    if (err) {
      console.error('Error creating client directory:', err);
      res.redirect('/admin/previsualizador');
      return;
    }

    fs.writeFileSync(path.join(clientDir, 'index.html'), htmlContent);
    fs.writeFileSync(path.join(clientDir, 'style.css'), cssContent);
    fs.writeFileSync(path.join(clientDir, 'script.js'), jsContent);

    res.redirect('/admin/previsualizador');
  });
});

app.get('/profile', requireLogin, (req, res) => {
  res.send('Profile page');
});

app.get('/', (req, res) => {
  res.render('index', { title: 'Hola Mundo' });
});

app.listen(port, () => {
  console.log(`La aplicación está escuchando en el puerto ${port}`);
});
