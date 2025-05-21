import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../db.cjs'); // Ajusta la ruta si es necesario

const router = express.Router();

import fs from 'fs-extra'; // Usaremos fs-extra para asegurar la creación de directorios
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware para asegurar que el usuario esté logueado (podríamos usar el de app.js si es global)
// Por ahora, definimos uno simple aquí o asumimos que se aplica antes en app.js para /admin
function requireLogin(req, res, next) {
    if (req.session && req.session.user && req.session.loggedIn) { // Asegurarse que user y loggedIn existan
        next();
    } else {
        req.flash('errorMessage', 'Debes iniciar sesión para ver esta página.');
        res.redirect('/login');
    }
}

router.use(requireLogin); // Aplicar a todas las rutas de cards

// GET /admin/cards - Muestra las tarjetas del usuario actual
router.get('/', async (req, res) => {
    try {
        const userCards = await db('cards').where({ user_id: req.session.user.id }).orderBy('created_at', 'desc');
        res.render('admin/cards', {
            title: 'Mis Tarjetas',
            currentPage: 'Mis Tarjetas',
            cards: userCards,
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Error al obtener las tarjetas del usuario:', error);
        req.flash('errorMessage', 'Error al cargar tus tarjetas.');
        res.redirect('/admin'); 
    }
});

// POST /admin/cards - Crea una nueva tarjeta
router.post('/', async (req, res) => {
    const { title, html_content, css_content, js_content, original_prompt } = req.body; // original_prompt añadido
    const userId = req.session.user.id;
    const userProfileSlug = req.session.user.profile_slug;

    if (!title) {
        // req.flash('errorMessage', 'El título de la tarjeta es obligatorio.'); // Flash no es ideal para respuestas JSON
        return res.status(400).json({ success: false, message: 'El título de la tarjeta es obligatorio.' });
    }

    if (!userProfileSlug) {
        // req.flash('errorMessage', 'No se pudo determinar el slug del perfil de usuario. Intenta iniciar sesión de nuevo.');
        return res.status(400).json({ success: false, message: 'No se pudo determinar el slug del perfil de usuario. Intenta iniciar sesión de nuevo.' });
    }

    try {
        // 1. Generar un card_slug (simple por ahora, se puede mejorar para unicidad)
        let cardSlug = title.toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[^\w-]+/g, '');
        
        // Asegurar unicidad del card_slug para este usuario
        let existingCard = await db('cards').where({ user_id: userId, slug: cardSlug }).first();
        let counter = 0;
        while (existingCard) {
            counter++;
            cardSlug = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${counter}`;
            existingCard = await db('cards').where({ user_id: userId, slug: cardSlug }).first();
        }

        // 2. Definir la ruta de la carpeta
        const cardDirectoryPath = path.join(__dirname, '..', 'public', 'cards', userProfileSlug, cardSlug);
        const relativeCardPath = `/cards/${userProfileSlug}/${cardSlug}`;

        // 3. Crear el directorio
        await fs.ensureDir(cardDirectoryPath);

        // 4. Escribir los archivos
        await fs.writeFile(path.join(cardDirectoryPath, 'index.html'), html_content || '');
        await fs.writeFile(path.join(cardDirectoryPath, 'style.css'), css_content || '');
        await fs.writeFile(path.join(cardDirectoryPath, 'script.js'), js_content || '');

        // 5. Guardar en la base de datos
        const newCard = {
            user_id: userId,
            title,
            slug: cardSlug,
            // Podríamos guardar el contenido en la BD también si quisiéramos, o solo la ruta
            // html_content: html_content, 
            // css_content: css_content,
            // js_content: js_content,
            // file_path: relativeCardPath, // Eliminado, se construirá dinámicamente
            original_prompt: original_prompt || null, // Guardar el prompt original
            tokens_cost: 1, // Costo fijo de 1 token por tarjeta creada
            // Otros campos como template_id, settings_json, etc., pueden añadirse después
        };
        await db('cards').insert(newCard);

        // 6. Actualizar tokens_used (ejemplo: cada tarjeta cuesta 1 token)
        // Esta lógica podría ser más compleja (ej. tokens por IA, etc.)
        await db('users').where({ id: userId }).increment('tokens_used', 1);
        req.session.user.tokens_used = (req.session.user.tokens_used || 0) + 1; // Actualizar sesión

        // req.flash('successMessage', 'Tarjeta creada exitosamente.'); // Flash no es ideal para respuestas JSON
        // En su lugar, el frontend manejará el mensaje de éxito de la respuesta JSON.
        res.status(201).json({ success: true, message: 'Tarjeta creada exitosamente.', cardSlug: cardSlug, userProfileSlug: userProfileSlug });

    } catch (error) {
        console.error('Error al crear la tarjeta:', error);
        // req.flash('errorMessage', 'Error al crear la tarjeta: ' + error.message); // Flash no es ideal
        res.status(500).json({ success: false, message: 'Error al crear la tarjeta: ' + error.message });
    }
});


// Aquí irán las rutas para GET /new, GET /:id/edit, PUT /:id, DELETE /:id

export default router;
