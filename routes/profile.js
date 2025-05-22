import express from 'express';
import { createRequire } from 'module';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra'; // Usamos fs-extra para asegurar que fs.unlink no falle si el archivo no existe y para otras utilidades

const require = createRequire(import.meta.url);
const db = require('../db.cjs'); // Ajusta la ruta si es necesario

const router = express.Router();

// Configuración de Multer para la subida de avatares
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'public/uploads';
        fs.mkdirsSync(uploadPath); // Asegurar que el directorio exista
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')); // Nombre de archivo único
    }
});

const fileFilter = (req, file, cb) => {
    // Aceptar solo imágenes
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('¡Solo se permiten archivos de imagen!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

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
router.post('/edit', upload.single('avatarFile'), async (req, res) => {
    if (!req.session.user) {
        req.flash('errorMessage', 'Sesión no encontrada.');
        return res.redirect('/login');
    }

    const { first_name, last_name, phone } = req.body;
    const userId = req.session.user.id;
    const oldAvatarUrl = req.session.user.avatar_url; // Avatar actual antes de la actualización

    try {
        if (!first_name || !last_name) {
            // Si hay un archivo subido y la validación falla, eliminar el archivo subido para no dejar basura
            if (req.file) {
                await fs.unlink(req.file.path);
            }
            req.flash('errorMessage', 'Nombre y Apellidos son obligatorios.');
            return res.redirect('/admin/profile/edit');
        }

        const updatedUserFields = {
            first_name,
            last_name,
            phone: phone || null,
            updated_at: new Date()
        };

        if (req.file) { // Si se subió un nuevo avatar
            updatedUserFields.avatar_url = `uploads/${req.file.filename}`; // Guardar la ruta relativa

            // Eliminar el avatar anterior si existe y no es una URL externa o un placeholder default
            if (oldAvatarUrl && !oldAvatarUrl.startsWith('http') && oldAvatarUrl !== 'null' && oldAvatarUrl !== '/images/avatar.svg') {
                const oldAvatarPath = path.join('public', oldAvatarUrl);
                try {
                    if (await fs.pathExists(oldAvatarPath)) {
                        await fs.unlink(oldAvatarPath);
                        console.log(`Avatar anterior eliminado: ${oldAvatarPath}`);
                    }
                } catch (unlinkError) {
                    console.error(`Error al eliminar el avatar anterior ${oldAvatarPath}:`, unlinkError);
                    // No bloquear la actualización del perfil por esto, solo loguear.
                }
            }
        } else {
            // Si no se sube un nuevo archivo, mantener el avatar_url existente
            // No es necesario añadir avatar_url a updatedUserFields si no cambia
            // O si se quiere permitir borrar el avatar, se necesitaría un campo/botón para ello.
            // Por ahora, si no hay req.file, no se toca avatar_url.
        }

        await db('users').where({ id: userId }).update(updatedUserFields);

        // Actualizar la sesión del usuario con los nuevos datos
        // Es importante obtener los datos actualizados de la BD para asegurar consistencia,
        // especialmente si avatar_url no se tocó o si hay otros campos que no se envían.
        const updatedUserFromDb = await db('users').where({ id: userId }).first();
        if (updatedUserFromDb) {
            // Conservar campos de sesión que no se editan aquí (como id, username, email, role)
            // y actualizar los que sí se editan.
            req.session.user.first_name = updatedUserFromDb.first_name;
            req.session.user.last_name = updatedUserFromDb.last_name;
            req.session.user.phone = updatedUserFromDb.phone;
            req.session.user.avatar_url = updatedUserFromDb.avatar_url; 
            // No es necesario actualizar updated_at en la sesión a menos que se use en el frontend.
        }


        req.flash('successMessage', 'Perfil actualizado exitosamente.');
        res.redirect('/admin/profile/edit');

    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        // Si el error es de multer (ej. tipo de archivo no permitido)
        if (error instanceof multer.MulterError) {
            req.flash('errorMessage', `Error de subida: ${error.message}`);
        } else if (error.message === '¡Solo se permiten archivos de imagen!') {
             req.flash('errorMessage', error.message);
        } else {
            req.flash('errorMessage', 'Error al actualizar el perfil. Inténtalo de nuevo.');
        }
        // Si hay un archivo subido y ocurre un error después de la validación de campos pero antes de guardar en BD
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error al eliminar archivo subido tras error de actualización de perfil:', unlinkError);
            }
        }
        res.redirect('/admin/profile/edit');
    }
});

export default router;
