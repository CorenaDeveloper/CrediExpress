// Función para mostrar alertas
function showAlert(type, message) {
    var iconClass;
    var bgColorClass;

    // Asignar clases de iconos y colores de fondo según el tipo de alerta
    switch (type) {
        case 'success':
            iconClass = 'fas fa-check-circle';
            bgColorClass = 'bg-success';
            break;
        case 'info':
            iconClass = 'fas fa-info-circle';
            bgColorClass = 'bg-info';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-circle';
            bgColorClass = 'bg-warning';
            break;
        case 'danger':
            iconClass = 'fas fa-times-circle';
            bgColorClass = 'bg-danger';
            break;
        default:
            iconClass = 'fas fa-info-circle';
            bgColorClass = 'bg-secondary';
            break;
    }

    // Crear el HTML de la alerta
    var alertHtml = `
        <div class="alert alert-${type} border-0 d-flex align-items-center" role="alert">
            <div class="${bgColorClass} me-3 icon-item">
                <span class="${iconClass} text-white fs-6"></span>
            </div>
            <p class="mb-0 flex-1">${message}</p>
            <button class="btn-close" type="button" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    // Insertar la alerta en el contenedor
    $("#alertContainer").html(alertHtml);

    if (bgColorClass != "bg-danger") {
        setTimeout(function () {
            $("#alertContainer").html(""); // Limpiar la alerta
        }, 4000);
    }

}