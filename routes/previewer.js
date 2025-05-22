import express from 'express';
const router = express.Router();
import fsExtra from 'fs-extra'; // Usar fs-extra para ensureDir
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module'; // Para importar db.cjs

// Determinar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar db.cjs
const require = createRequire(import.meta.url);
const db = require('../db.cjs');


// Middleware de autenticación (ejemplo, el usuario debe ajustarlo a su implementación real)
// Se asume que req.session.loggedIn y req.session.user existen y son gestionados por express-session
const requireLogin = (req, res, next) => {
    if (req.session && req.session.loggedIn && req.session.user) {
        next();
    } else {
        // Para una API llamada por fetch desde el cliente, devolver un error JSON es más apropiado
        // que una redirección, ya que el cliente (JS) manejará la respuesta.
        res.status(401).json({ success: false, message: 'Acceso no autorizado. Por favor, inicie sesión.' });
    }
};

// Ruta: POST /admin/previewer/render-manual
router.post('/render-manual', requireLogin, async (req, res) => {
    try {
        // __dirname en routes/previewer.js es c:/Users/Percy/Desktop/tarjetaas-ia/routes
        // Necesitamos subir un nivel para llegar a la raíz del proyecto y luego a public/templates...
        const templatePath = path.join(__dirname, '..', 'public', 'templates', 'digital-card-v1', 'index.html');
        let templateContent = await fs.readFile(templatePath, 'utf8');
        
        const data = req.body;

        templateContent = templateContent.replace('<!-- PAGE_TITLE -->', data.pageTitle || 'Sin Título');
        templateContent = templateContent.replace('<!-- THEME_MODE -->', data.themeMode || 'light'); // Placeholder para data-bs-theme
        templateContent = templateContent.replace('<!-- META_DESCRIPTION -->', data.metaDescription || '');
        templateContent = templateContent.replace('<!-- OG_IMAGE_URL -->', data.ogImageUrl || '');
        templateContent = templateContent.replace('<!-- FAVICON_URL -->', data.faviconUrl || '');
        templateContent = templateContent.replace('<!-- NAV_BRAND_TEXT_PLACEHOLDER -->', data.navBrandText || '');
        templateContent = templateContent.replace('<!-- NAV_ITEMS_PLACEHOLDER -->', data.navItemsHtml || '');
        templateContent = templateContent.replace('<!-- MAIN_SECTIONS_PLACEHOLDER -->', data.mainSectionsHtml || '');
        templateContent = templateContent.replace('<!-- FOOTER_TEXT_PLACEHOLDER -->', data.footerText || '');

        if (data.customStyles) {
            templateContent = templateContent.replace('<!-- CUSTOM_STYLES_PLACEHOLDER -->', `<style>\n${data.customStyles}\n</style>`);
        } else {
            templateContent = templateContent.replace('<!-- CUSTOM_STYLES_PLACEHOLDER -->', ''); 
        }

        if (data.customScripts) {
            templateContent = templateContent.replace('<!-- CUSTOM_SCRIPTS_PLACEHOLDER -->', `<script>\n${data.customScripts}\n</script>`);
        } else {
            templateContent = templateContent.replace('<!-- CUSTOM_SCRIPTS_PLACEHOLDER -->', '');
        }

        res.send(templateContent);

    } catch (error) {
        console.error('Error en /admin/previewer/render-manual:', error);
        res.status(500).send('Error al generar la previsualización.');
    }
});

// Ruta: POST /admin/previewer/save-card
router.post('/save-card', requireLogin, async (req, res) => {
    const { title, finalHtmlContent } = req.body;
    const userId = req.session.user.id;
    const userProfileSlug = req.session.user.profile_slug;

    if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'El título de la tarjeta es obligatorio.' });
    }
    if (!finalHtmlContent) {
        return res.status(400).json({ success: false, message: 'El contenido HTML de la tarjeta es obligatorio.' });
    }
    if (!userProfileSlug) {
        return res.status(400).json({ success: false, message: 'No se pudo determinar el slug del perfil de usuario.' });
    }

    console.log('--- DEBUG PREVIEWER SAVE CARD ---');
    console.log('User ID:', userId);
    console.log('User Profile Slug:', userProfileSlug);
    console.log('Card Title (from modal):', title);
    // console.log('Final HTML Content (length):', finalHtmlContent ? finalHtmlContent.length : 0); // Log length to avoid huge output

    try {
        // 1. Generar un card_slug
        let baseSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        if (!baseSlug) baseSlug = 'tarjeta-digital'; // Fallback si el título no genera un slug válido
        let cardSlug = baseSlug;
        
        let existingCard = await db('cards').where({ user_id: userId, slug: cardSlug }).first();
        let counter = 0;
        while (existingCard) {
            counter++;
            cardSlug = `${baseSlug}-${counter}`;
            existingCard = await db('cards').where({ user_id: userId, slug: cardSlug }).first();
        }
        console.log('Generated Card Slug:', cardSlug);

        // 2. Definir ruta del directorio del USUARIO y ruta del ARCHIVO de la tarjeta
        const userDirectoryPath = path.join(__dirname, '..', 'public', 'cards', userProfileSlug);
        const cardFilePath = path.join(userDirectoryPath, `${cardSlug}.html`); // cardSlug es parte del nombre del archivo
        
        console.log('User directory path to ensure:', userDirectoryPath);
        console.log('Attempting to write file to:', cardFilePath);
        console.log('--- END DEBUG PRE-OPERATION ---');

        // 3. Crear el directorio del USUARIO (si no existe)
        await fsExtra.ensureDir(userDirectoryPath);
        console.log('User directory ensured/created:', userDirectoryPath);

        // 4. Guardar el archivo de la tarjeta (ej. test-01.html)
        await fs.writeFile(cardFilePath, finalHtmlContent);
        console.log('Card HTML file written to:', cardFilePath);

        // 5. Guardar en la base de datos
        const relativeFilePath = `cards/${userProfileSlug}/${cardSlug}.html`;
        const newCardDataForDB = {
            user_id: userId,
            title: title,
            slug: cardSlug,
            status: 'published',
            file_path: relativeFilePath, // Guardar la ruta relativa del archivo
            // Los campos como original_prompt, tokens_cost, content_json, is_default
            // usarán sus valores por defecto definidos en la BD o serán null.
        };
        
        // Corrección para MySQL: .returning('id') no funciona como se espera.
        // Knex para MySQL devuelve un array con el ID del primer registro insertado.
        const result = await db('cards').insert(newCardDataForDB);
        const insertedCardId = result[0]; 
        console.log('Card data inserted into DB, ID:', insertedCardId);


        res.status(201).json({ 
            success: true, 
            message: 'Tarjeta guardada exitosamente!',
            cardId: insertedCardId,
            cardSlug: cardSlug,
            userProfileSlug: userProfileSlug,
            filePath: relativeFilePath 
        });

    } catch (error) {
        console.error('[SAVE CARD DEBUG] Error details in catch block:', error);
        console.error('Error en /admin/previewer/save-card:', error.message); // Log solo el mensaje para no duplicar el stack si es un error EPERM
        res.status(500).json({ 
            success: false, 
            message: 'Error al guardar la tarjeta: ' + error.message,
            errorDetails: { 
                code: error.code, 
                syscall: error.syscall, 
                path: error.path,
                stack: error.stack // Incluir stack para más detalles si no es EPERM
            }
        });
    }
});

export default router;
