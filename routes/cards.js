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
            title: 'Tarjetas',
            currentPage: 'Tarjetas',
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
    // Añadir tokens_cost a la desestructuración de req.body
    const { title, html_content, css_content, js_content, original_prompt, tokens_cost } = req.body; 
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
            tokens_cost: parseInt(tokens_cost, 10) || 1, // Usar el costo de tokens recibido, con fallback a 1
            // Otros campos como template_id, settings_json, etc., pueden añadirse después
        };
        await db('cards').insert(newCard);

        // 6. Actualizar tokens_used con el costo real
        const actualTokensCost = parseInt(tokens_cost, 10) || 1;
        await db('users').where({ id: userId }).increment('tokens_used', actualTokensCost);
        req.session.user.tokens_used = (req.session.user.tokens_used || 0) + actualTokensCost; // Actualizar sesión

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

// DELETE /admin/cards/:id - Elimina una tarjeta
router.delete('/:id', async (req, res) => {
    const cardId = req.params.id;
    const userId = req.session.user.id;
    const userProfileSlug = req.session.user.profile_slug;

    if (!userProfileSlug) {
        return res.status(400).json({ success: false, message: 'No se pudo determinar el slug del perfil de usuario.' });
    }

    try {
        // 1. Obtener la tarjeta para asegurarse de que pertenece al usuario y obtener el card_slug
        const card = await db('cards').where({ id: cardId, user_id: userId }).first();

        if (!card) {
            return res.status(404).json({ success: false, message: 'Tarjeta no encontrada o no tienes permiso para eliminarla.' });
        }

        // 2. Construir la ruta al archivo HTML de la tarjeta usando card.file_path
        // card.file_path es relativo a 'public', ej: 'cards/luisflorez/asdfasdf.html'
        // __dirname está en /routes, '..' sube a la raíz del proyecto
        let cardFilePath = null;
        if (card.file_path) {
            cardFilePath = path.join(__dirname, '..', 'public', card.file_path);
        }
        
        // 3. Eliminar el archivo HTML de la tarjeta
        try {
            if (cardFilePath && await fs.pathExists(cardFilePath)) {
                await fs.remove(cardFilePath); // fs.remove de fs-extra puede eliminar archivos o carpetas
                console.log(`Archivo de tarjeta eliminado: ${cardFilePath}`);
                
                // Opcional: Verificar si el directorio del usuario (userProfileSlug) está vacío y eliminarlo.
                // const userDirPath = path.dirname(cardFilePath);
                // const filesInUserDir = await fs.readdir(userDirPath);
                // if (filesInUserDir.length === 0) {
                //     await fs.remove(userDirPath);
                //     console.log(`Directorio de usuario vacío eliminado: ${userDirPath}`);
                // }

            } else {
                console.log(`El archivo de la tarjeta no existía o file_path no definido: ${cardFilePath || 'file_path no definido en la BD'}`);
            }
        } catch (fsError) {
            console.error(`Error al eliminar el archivo de la tarjeta ${cardFilePath}:`, fsError);
            // Continuar para eliminar de la BD de todas formas, pero loguear el error.
        }

        // 4. Eliminar la tarjeta de la base de datos
        const deletedCount = await db('cards').where({ id: cardId, user_id: userId }).del();

        if (deletedCount > 0) {
            // Opcional: Revertir tokens_used si es necesario
            // await db('users').where({ id: userId }).decrement('tokens_used', card.tokens_cost || 1);
            // req.session.user.tokens_used = Math.max(0, (req.session.user.tokens_used || 0) - (card.tokens_cost || 1));
            
            res.json({ success: true, message: 'Tarjeta eliminada exitosamente.' });
        } else {
            // Esto no debería suceder si la encontramos antes, pero es una salvaguarda.
            res.status(404).json({ success: false, message: 'Tarjeta no encontrada para eliminar de la base de datos.' });
        }

    } catch (error) {
        console.error(`Error al eliminar la tarjeta ${cardId}:`, error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar la tarjeta.' });
    }
});

export default router;
