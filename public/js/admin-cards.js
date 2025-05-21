jQuery(document).ready(function() {
    if ($('#cardsTable').length) { // Solo ejecutar si la tabla con ID 'cardsTable' existe en la página
        $('#cardsTable').DataTable({
            responsive: true,
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json" // Para traducción
            }
        });
    }
});
