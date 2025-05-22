$(document).ready(function() {
    // Manejar el envío del formulario para añadir un nuevo ítem
    $('#addMenuItemForm').on('submit', function(event) {
        event.preventDefault(); // Evitar el envío tradicional

        const formData = {
            title: $('#addItemTitle').val(),
            path: $('#addItemPath').val(),
            roles: $('#addItemRoles').val(),
            display_order: parseInt($('#addItemOrder').val(), 10),
            icon_class: $('#addItemIcon').val(),
            parent_id: $('#addItemParentId').val() ? parseInt($('#addItemParentId').val(), 10) : null
        };

        fetch('/admin/menu-editor/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                $('#addMenuItemModal').modal('hide');
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: data.message || 'Ítem de menú añadido correctamente.',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    location.reload();
                });
                $('#addMenuItemForm')[0].reset();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'No se pudo añadir el ítem de menú.'
                });
            }
        })
        .catch(error => {
            console.error('Error en la petición AJAX:', error);
            let errorMessage = 'Ocurrió un error al contactar al servidor.';
            if (error && error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: errorMessage
            });
        });
    });

    // Manejador para el botón de editar
    $('.edit-item-btn').on('click', function() {
        const itemId = $(this).data('id');
        
        fetch('/admin/menu-editor/items/' + itemId)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.item) {
                    const item = data.item;
                    $('#editItemId').val(item.id);
                    $('#editItemTitle').val(item.title);
                    $('#editItemPath').val(item.path);
                    const rolesString = Array.isArray(item.roles) ? item.roles.join(',') : (typeof item.roles === 'string' ? JSON.parse(item.roles).join(',') : '');
                    $('#editItemRoles').val(rolesString);
                    $('#editItemOrder').val(item.display_order);
                    $('#editItemIcon').val(item.icon_class);
                    $('#editItemParentId').val(item.parent_id);
                    $('#editMenuItemForm').attr('action', '/admin/menu-editor/items/' + item.id);
                } else {
                     Swal.fire('Error', data.message || 'No se pudieron cargar los datos del ítem.', 'error');
                }
            })
            .catch(error => {
                console.error('Error al cargar datos para editar:', error);
                Swal.fire('Error', 'No se pudieron cargar los datos del ítem para editar.', 'error');
            });
    });

    // Manejar el envío del formulario de edición
    $('#editMenuItemForm').on('submit', function(event) {
        event.preventDefault();
        const actionUrl = $(this).attr('action');

        const formData = {
            title: $('#editItemTitle').val(),
            path: $('#editItemPath').val(),
            roles: $('#editItemRoles').val(),
            display_order: parseInt($('#editItemOrder').val(), 10),
            icon_class: $('#editItemIcon').val(),
            parent_id: $('#editItemParentId').val() ? parseInt($('#editItemParentId').val(), 10) : null
        };

        fetch(actionUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                $('#editMenuItemModal').modal('hide');
                Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: data.message || 'Ítem de menú actualizado correctamente.',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire('Error', data.message || 'No se pudo actualizar el ítem.', 'error');
            }
        })
        .catch(error => {
            console.error('Error al actualizar ítem:', error);
             let errorMessage = 'Ocurrió un error al contactar al servidor.';
            if (error && error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            Swal.fire('Error de Conexión', errorMessage, 'error');
        });
    });

    // Manejador para el botón de eliminar
    $('.delete-item-btn').on('click', function() {
        const itemId = $(this).data('id');
        const listItem = $(this).closest('li'); // Para removerlo del DOM si es exitoso

        Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch('/admin/menu-editor/items/' + itemId, {
                    method: 'DELETE',
                    headers: {
                        // 'CSRF-Token': 'tu-token-csrf-aqui' // Si usas CSRF
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => { throw err; });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        Swal.fire(
                            '¡Eliminado!',
                            data.message || 'El ítem de menú ha sido eliminado.',
                            'success'
                        );
                        listItem.remove(); // Eliminar el ítem de la lista en el frontend
                        // Opcionalmente, recargar la página: location.reload();
                    } else {
                        Swal.fire(
                            'Error',
                            data.message || 'No se pudo eliminar el ítem.',
                            'error'
                        );
                    }
                })
                .catch(error => {
                    console.error('Error al eliminar ítem:', error);
                    let errorMessage = 'Ocurrió un error al contactar al servidor.';
                    if (error && error.message) {
                        errorMessage = error.message;
                    } else if (typeof error === 'string') {
                        errorMessage = error;
                    }
                    Swal.fire('Error de Conexión', errorMessage, 'error');
                });
            }
        });
    });

    console.log("Page scripts for menu-editor fully loaded with all handlers.");

    // Inicializar SortableJS para la lista de ítems del menú
    const menuList = document.getElementById('menuItemsList');
    if (menuList) {
        new Sortable(menuList, {
            animation: 150, // ms, animation speed moving items when sorting, `0` — without animation
            ghostClass: 'bg-info', // Class name for the drop placeholder
            onEnd: function (evt) {
                // evt.oldIndex; // element's old index within parent
                // evt.newIndex; // element's new index within parent
                // evt.item; // dragged HTMLElement
                
                const items = [];
                menuList.querySelectorAll('li.list-group-item').forEach((itemEl, index) => {
                    items.push({
                        id: itemEl.getAttribute('data-id'),
                        display_order: index 
                    });
                });

                // Enviar la nueva ordenación al backend
                sendReorderRequest(items);
            }
        });
    }

    function sendReorderRequest(orderedItems) {
        fetch('/admin/menu-editor/items/reorder', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: orderedItems })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Orden Actualizado!',
                    text: data.message || 'El orden de los ítems del menú ha sido actualizado.',
                    timer: 1500,
                    showConfirmButton: false
                });
                // No es necesario recargar la página, el orden visual ya cambió.
                // Pero si el texto "(Orden: X)" debe actualizarse, se necesitaría recargar o actualizarlo manualmente.
                // Por ahora, lo dejamos así para simplicidad. Si se recarga, se pierde el feedback inmediato.
                // location.reload(); 
            } else {
                Swal.fire('Error', data.message || 'No se pudo actualizar el orden.', 'error');
            }
        })
        .catch(error => {
            console.error('Error al reordenar ítems:', error);
            let errorMessage = 'Ocurrió un error al contactar al servidor para reordenar.';
            if (error && error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            Swal.fire('Error de Conexión', errorMessage, 'error');
        });
    }
});
