import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../db.cjs'); // Ajusta la ruta si es necesario

const router = express.Router();

// Middleware para asegurar que el usuario esté logueado
// (Asumiendo que tienes un middleware requireLogin similar al de auth.js o app.js)
// Si no, necesitaremos importarlo o definirlo aquí.
// Por ahora, lo comentaré y asumiré que se maneja globalmente o en app.js para /admin/*
/*
const requireLogin = (req, res, next) => {
  if (req.session && req.session.user && req.session.loggedIn) {
    next();
  } else {
    req.flash('errorMessage', 'Debes iniciar sesión para acceder a esta página.');
    res.redirect('/login');
  }
};
router.use(requireLogin); // Aplicar a todas las rutas de este router
*/

// GET /admin/profile/edit - Mostrar formulario de edición de perfil
router.get('/edit', (req, res) => {
    // currentUser ya debería estar en res.locals gracias al middleware en app.js
    if (!req.session.user) {
        req.flash('errorMessage', 'Sesión no encontrada.');
        return res.redirect('/login');
    }
    res.render('admin/edit-profile', {
        title: 'Editar Perfil',
        currentPage: 'Editar Perfil',
        // currentUser es pasado automáticamente a las vistas por el middleware global
    });
});

// POST /admin/profile/edit - Procesar actualización de perfil
router.post('/edit', async (req, res) => {
    if (!req.session.user) {
        req.flash('errorMessage', 'Sesión no encontrada.');
        return res.redirect('/login');
    }

    const { first_name, last_name, phone, avatar_url } = req.body;
    const userId = req.session.user.id;

    try {
        // Validaciones básicas (puedes expandirlas)
        if (!first_name || !last_name) {
            req.flash('errorMessage', 'Nombre y Apellidos son obligatorios.');
            return res.redirect('/admin/profile/edit');
        }
        // Podrías añadir validación de URL para avatar_url si lo deseas

        const updatedUserFields = {
            first_name,
            last_name,
            phone: phone || null,
            avatar_url: avatar_url || null,
            updated_at: new Date() // Actualizar timestamp
        };

        await db('users').where({ id: userId }).update(updatedUserFields);

        // Actualizar la sesión del usuario con los nuevos datos
        req.session.user = {
            ...req.session.user, // Mantener datos existentes (id, username, email, role, etc.)
            ...updatedUserFields // Sobrescribir con los campos actualizados
        };
        // Asegurar que req.session.user.phone y avatar_url se actualicen incluso si son null
        req.session.user.phone = updatedUserFields.phone;
        req.session.user.avatar_url = updatedUserFields.avatar_url;


        req.flash('successMessage', 'Perfil actualizado exitosamente.');
        res.redirect('/admin/profile/edit');

    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        req.flash('errorMessage', 'Error al actualizar el perfil. Inténtalo de nuevo.');
        res.redirect('/admin/profile/edit');
    }
});

export default router;
