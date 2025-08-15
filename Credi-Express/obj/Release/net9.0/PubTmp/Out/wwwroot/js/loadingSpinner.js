// Funciones para mostrar y ocultar el spinner de carga

function showLoadingSpinner() {
    // Crear el overlay si no existe
    if ($('#loadingSpinnerOverlay').length === 0) {
        const spinnerHTML = `
            <div id="loadingSpinnerOverlay" class="loadingspinner-overlay">
                <div class="loadingspinner">
                    <div id="square1"></div>
                    <div id="square2"></div>
                    <div id="square3"></div>
                    <div id="square4"></div>
                    <div id="square5"></div>
                </div>
            </div>
        `;
        $('body').append(spinnerHTML);
    }

    $('#loadingSpinnerOverlay').show();
}

function hideLoadingSpinner() {
    $('#loadingSpinnerOverlay').hide();
}

// Función para mostrar spinner con mensaje personalizado
function showLoadingWithMessage(message) {
    if ($('#loadingSpinnerOverlay').length === 0) {
        const spinnerHTML = `
            <div id="loadingSpinnerOverlay" class="loadingspinner-overlay">
                <div class="text-center">
                    <div class="loadingspinner">
                        <div id="square1"></div>
                        <div id="square2"></div>
                        <div id="square3"></div>
                        <div id="square4"></div>
                        <div id="square5"></div>
                    </div>
                    <div id="loadingMessage" class="mt-3 text-primary fw-bold">${message || 'Cargando...'}</div>
                </div>
            </div>
        `;
        $('body').append(spinnerHTML);
    } else {
        $('#loadingMessage').text(message || 'Cargando...');
    }

    $('#loadingSpinnerOverlay').show();
}