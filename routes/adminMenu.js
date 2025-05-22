import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../db.cjs'); // Ajusta la ruta si es necesario

const router = express.Router();

// Middleware para asegurar que solo los admins puedan acceder a esta sección
// Podríamos crear uno más genérico si es necesario.
function requireAdminRole(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        const accessDeniedMessage = 'Acceso denegado. Se requiere rol de Administrador.';
        req.flash('errorMessage', accessDeniedMessage);
        
        // Verificar si la solicitud espera una respuesta JSON (típico de AJAX/Fetch)
        if (req.accepts('json')) {
            // Para solicitudes AJAX, enviar una respuesta de error JSON
            res.status(403).json({ success: false, message: accessDeniedMessage });
        } else {
            // Para solicitudes de navegador normales, redirigir
            res.redirect('/admin');
        }
    }
}

// Aplicar el middleware de rol de admin a todas las rutas de este router
router.use(requireAdminRole);

// GET /admin/menu-editor - Muestra la página del editor de menús
router.get('/menu-editor', async (req, res) => {
    try {
        const menuItems = await db('admin_menu_items').orderBy('display_order', 'asc');
        res.render('admin/menu-editor', { 
            title: 'Editor de Menú del Panel',
            currentPage: 'Editor de Menú', // Añadido para el breadcrumb
            menuItems: menuItems,
            successMessage: req.flash('successMessage')[0],
            errorMessage: req.flash('errorMessage')[0],
            currentUser: req.session.user // Para el layout
        });
    } catch (error) {
        console.error('Error al obtener los ítems del menú:', error);
        req.flash('errorMessage', 'Error al cargar el editor de menú.');
        res.redirect('/admin'); // O a una página de error
    }
});

// Aquí irán las rutas POST para crear, actualizar, eliminar y reordenar ítems

// POST /admin/menu-editor/items - Crea un nuevo ítem de menú
router.post('/menu-editor/items', async (req, res) => {
    const { title, path, roles, display_order, icon_class, parent_id } = req.body;

    // Validación básica (puedes expandirla)
    if (!title || !path) {
        return res.status(400).json({ success: false, message: 'Título y Ruta son obligatorios.' });
    }

    try {
        // Procesar roles: si es una cadena separada por comas, convertirla a array
        let rolesArray = roles;
        if (typeof roles === 'string' && roles.trim() !== '') {
            rolesArray = roles.split(',').map(role => role.trim());
        } else if (roles === '' || roles === undefined) {
            rolesArray = []; // O un valor por defecto si lo prefieres, ej: ['client']
        }
        // Si ya es un array (por si el frontend lo envía así), no hacer nada.

        const newItem = {
            title,
            path,
            roles: JSON.stringify(rolesArray), // Guardar como JSON string en la BD
            display_order: parseInt(display_order, 10) || 0,
            icon_class: icon_class || 'fas fa-link',
            parent_id: parent_id ? parseInt(parent_id, 10) : null
        };

        const [insertedId] = await db('admin_menu_items').insert(newItem);
        
        // Podrías devolver el ítem completo si lo necesitas en el frontend
        // const createdItem = await db('admin_menu_items').where('id', insertedId).first();

        res.status(201).json({ 
            success: true, 
            message: 'Ítem de menú añadido correctamente.',
            itemId: insertedId 
        });

    } catch (error) {
        console.error('Error al crear el ítem de menú:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al crear el ítem.' });
    }
});

// GET /admin/menu-editor/items/:id - Obtiene un ítem de menú específico para editar
router.get('/menu-editor/items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const item = await db('admin_menu_items').where({ id }).first();
        if (item) {
            // La columna 'roles' se almacena como JSON string, parsearla antes de enviar si es necesario
            // o dejar que el frontend lo maneje. Para consistencia, podríamos parsearla aquí.
            // item.roles = JSON.parse(item.roles); // Descomentar si el frontend espera un array directamente
            res.json({ success: true, item });
        } else {
            res.status(404).json({ success: false, message: 'Ítem de menú no encontrado.' });
        }
    } catch (error) {
        console.error(`Error al obtener el ítem de menú ${id}:`, error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener el ítem.' });
    }
});

// PUT /admin/menu-editor/items/reorder - Reordena los ítems del menú
// ESTA RUTA DEBE IR ANTES DE LA RUTA /items/:id para que no sea interpretada como un ID
router.put('/menu-editor/items/reorder', async (req, res) => {
    const { items } = req.body; // Se espera un array de objetos: [{ id: X, display_order: Y }, ...]

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Se requiere una lista de ítems para reordenar.' });
    }

    try {
        await db.transaction(async trx => {
            const queries = items.map(item => {
                return db('admin_menu_items')
                    .where('id', item.id)
                    .update({ display_order: item.display_order })
                    .transacting(trx);
            });
            await Promise.all(queries);
        });
        res.json({ success: true, message: 'Orden de los ítems actualizado correctamente.' });
    } catch (error) {
        console.error('Error al reordenar los ítems del menú:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al reordenar los ítems.' });
    }
});

// PUT /admin/menu-editor/items/:id - Actualiza un ítem de menú existente
router.put('/menu-editor/items/:id', async (req, res) => {
    const { id } = req.params;
    const { title, path, roles, display_order, icon_class, parent_id } = req.body;

    if (!title || !path) {
        return res.status(400).json({ success: false, message: 'Título y Ruta son obligatorios.' });
    }

    try {
        let rolesArray = roles;
        if (typeof roles === 'string' && roles.trim() !== '') {
            rolesArray = roles.split(',').map(role => role.trim());
        } else if (roles === '' || roles === undefined) {
            rolesArray = [];
        }

        const updatedItemData = {
            title,
            path,
            roles: JSON.stringify(rolesArray),
            display_order: parseInt(display_order, 10) || 0,
            icon_class: icon_class || 'fas fa-link',
            parent_id: parent_id ? parseInt(parent_id, 10) : null
        };

        const count = await db('admin_menu_items').where({ id }).update(updatedItemData);

        if (count > 0) {
            res.json({ success: true, message: 'Ítem de menú actualizado correctamente.' });
        } else {
            res.status(404).json({ success: false, message: 'Ítem de menú no encontrado para actualizar.' });
        }
    } catch (error) {
        console.error(`Error al actualizar el ítem de menú ${id}:`, error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar el ítem.' });
    }
});

// DELETE /admin/menu-editor/items/:id - Elimina un ítem de menú
router.delete('/menu-editor/items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Opcional: Verificar si el ítem tiene hijos y manejarlo (ej. impedir borrado o borrar en cascada)
        // const children = await db('admin_menu_items').where({ parent_id: id });
        // if (children.length > 0) {
        //     return res.status(400).json({ success: false, message: 'No se puede eliminar un ítem con sub-ítems. Elimine los sub-ítems primero.' });
        // }

        const count = await db('admin_menu_items').where({ id }).del();

        if (count > 0) {
            res.json({ success: true, message: 'Ítem de menú eliminado correctamente.' });
        } else {
            res.status(404).json({ success: false, message: 'Ítem de menú no encontrado para eliminar.' });
        }
    } catch (error) {
        console.error(`Error al eliminar el ítem de menú ${id}:`, error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar el ítem.' });
    }
});

export default router;
