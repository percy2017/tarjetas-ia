jQuery(document).ready(function() {
    if ($('#cardsTable').length) { // Solo ejecutar si la tabla con ID 'cardsTable' existe en la página
        $('#cardsTable').DataTable({
            responsive: true,
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json" // Para traducción
            },
            // Asegurarse de que los botones se rendericen correctamente si se añaden dinámicamente
            // o si la tabla se redibuja.
            drawCallback: function() {
                // Re-bind events if necessary, though event delegation is better.
            }
        });

        // Manejar clic en botón de eliminar usando delegación de eventos
        // Asumimos que los botones de eliminar tienen la clase 'delete-card-btn'
        // y un atributo 'data-id' con el ID de la tarjeta.
        $('#cardsTable tbody').on('click', '.delete-card-btn', function() {
            const cardId = $(this).data('id');
            const row = $(this).closest('tr'); // Fila de la tabla a eliminar

            Swal.fire({
                title: '¿Estás seguro?',
                text: "¡No podrás revertir esta acción!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, ¡eliminar!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`/admin/cards/${cardId}`, {
                        method: 'DELETE',
                        headers: {
                            'Accept': 'application/json'
                            // Podrías necesitar un token CSRF aquí si tu app lo usa
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
                                '¡Eliminada!',
                                data.message || 'La tarjeta ha sido eliminada.',
                                'success'
                            );
                            // Eliminar la fila de DataTables
                            $('#cardsTable').DataTable().row(row).remove().draw(false);
                        } else {
                            Swal.fire(
                                'Error',
                                data.message || 'No se pudo eliminar la tarjeta.',
                                'error'
                            );
                        }
                    })
                    .catch(error => {
                        console.error('Error al eliminar la tarjeta:', error);
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

        // Manejar clic en botón de compartir
        $('#cardsTable tbody').on('click', '.share-card-btn', function() {
            const cardFileUrl = $(this).data('url');
            const cardTitle = $(this).data('title');

            if (!cardFileUrl) {
                Swal.fire('Error', 'No se pudo obtener la URL de la tarjeta para compartir.', 'error');
                return;
            }
            const fullUrl = window.location.origin + cardFileUrl;

            // Intentar copiar al portapapeles
            navigator.clipboard.writeText(fullUrl).then(function() {
                Swal.fire({
                    title: '¡Enlace Copiado!',
                    text: `El enlace a "${cardTitle}" se ha copiado al portapapeles: ${fullUrl}`,
                    icon: 'success',
                    timer: 3000,
                    timerProgressBar: true
                });
            }).catch(function(err) {
                console.error('Error al copiar el enlace: ', err);
                Swal.fire('Error', 'No se pudo copiar el enlace automáticamente. Por favor, cópialo manualmente: ' + fullUrl, 'error');
            });
        });

        // Manejar clic en botón de Código QR
        $('#cardsTable tbody').on('click', '.qr-code-btn', function() {
            const cardFileUrl = $(this).data('url');
            const cardTitle = $(this).closest('tr').find('td:first').text(); // Obtener título de la primera celda de la fila

            if (!cardFileUrl) {
                Swal.fire('Error', 'No se pudo obtener la URL de la tarjeta para el QR.', 'error');
                return;
            }
            const fullUrl = window.location.origin + cardFileUrl;

            $('#qrCodeModalLabel').text('Código QR para: ' + cardTitle);
            $('#qrLinkText').text(fullUrl);
            
            const qrcodeContainer = document.getElementById('qrcodeCanvas');
            qrcodeContainer.innerHTML = ''; // Limpiar QR anterior

            try {
                new QRCode(qrcodeContainer, {
                    text: fullUrl,
                    width: 190, // Ajustar tamaño para que quepa bien en el modal-sm
                    height: 190,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });

                const qrModalEl = document.getElementById('qrCodeModal');
                const qrModal = bootstrap.Modal.getInstance(qrModalEl) || new bootstrap.Modal(qrModalEl);
                qrModal.show();

            } catch (e) {
                console.error("Error al generar QRCode:", e);
                Swal.fire('Error', 'No se pudo generar el código QR.', 'error');
            }
        });
    }
});
