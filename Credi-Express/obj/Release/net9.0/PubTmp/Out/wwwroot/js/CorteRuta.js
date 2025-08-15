// ================================
// ARCHIVO: corteruta.js
// Sistema completo de corte de caja por gestor
// ================================

// Variables globales
let datosCorteGeneral = {};
let gestoresData = [];
let fechaCorteActual = new Date().toISOString().split('T')[0];

// Inicialización del sistema
$(document).ready(function () {
    console.log('Inicializando sistema de corte por gestor...');

    if (typeof $ === 'undefined') {
        console.error('jQuery no está cargado');
        return;
    }

    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 no está cargado');
        return;
    }

    inicializarSistemaCorte();
    configurarEventos();
});

// ================================
// FUNCIONES PRINCIPALES
// ================================

function inicializarSistemaCorte() {
    actualizarFechaHora();
    establecerFechaDefecto();
    cargarDatosCorteGeneral();
}

function actualizarFechaHora() {
    const ahora = new Date();
    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    $('#fechaCorte').text(ahora.toLocaleDateString('es-ES', opciones));
    $('#horaCorte').text(ahora.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    }));
}

function establecerFechaDefecto() {
    const hoy = new Date();
    const fechaFormateada = hoy.toISOString().split('T')[0];
    $('#fechaCorteSelect').val(fechaFormateada);
    fechaCorteActual = fechaFormateada;
}

function cargarDatosCorteGeneral() {
    const fechaSeleccionada = $('#fechaCorteSelect').val();

    if (!fechaSeleccionada) {
        mostrarError('Fecha Requerida', 'Por favor seleccione una fecha para el corte');
        return;
    }

    mostrarLoading();

    fetch(`/Auxiliares/GetMovimientosDiarios?fecha=${fechaSeleccionada}`)
        .then(response => response.json())
        .then(data => {
            console.log('Datos generales recibidos:', data);

            if (data.success) {
                datosCorteGeneral = data;
                gestoresData = data.gestores || [];

                actualizarResumenGeneral();
                generarCortesPorGestor();
                actualizarDesglobeDetallado();
                actualizarFechaCorte(fechaSeleccionada);
            } else {
                mostrarError('Error', data.message || 'Error al cargar los datos del corte');
            }
        })
        .catch(error => {
            console.error('Error al cargar datos:', error);
            mostrarError('Error de Conexión', 'No se pudo conectar con el servidor');
        })
        .finally(() => {
            ocultarLoading();
        });
}

function actualizarResumenGeneral() {
    const resumen = datosCorteGeneral.resumen;

    $('#totalIngresosGeneral').text(`$${resumen.ingresos.total.toFixed(2)}`);
    $('#cantidadIngresosGeneral').text(`${resumen.ingresos.cantidad} transacciones`);

    $('#totalEgresosGeneral').text(`$${resumen.egresos.total.toFixed(2)}`);
    $('#cantidadEgresosGeneral').text(`${resumen.egresos.cantidad} transacciones`);

    $('#balanceNetoGeneral').text(`$${resumen.balanceNeto.toFixed(2)}`);
    $('#totalGestores').text(gestoresData.length);
}

function generarCortesPorGestor() {
    const contenedor = $('#cortesGestores');
    contenedor.empty();

    if (gestoresData.length === 0) {
        contenedor.html(`
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle fa-2x mb-3"></i>
                <h5>No hay movimientos registrados</h5>
                <p class="mb-0">No se encontraron transacciones para la fecha seleccionada</p>
            </div>
        `);
        return;
    }

    gestoresData.forEach(gestor => {
        const neto = gestor.ingresos - gestor.egresos;
        const movimientosValidados = gestor.movimientosValidados || 0;
        const movimientosPendientes = gestor.movimientosPendientes;
        const estaValidado = movimientosPendientes == 0 && gestor.transacciones > 0;

        const estadoBadge = estaValidado ?
            '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Validado</span>' :
            '<span class="badge bg-warning"><i class="fas fa-clock me-1"></i>Pendiente</span>';

        const botonAccion = estaValidado ?
            `<button class="btn btn-success btn-sm" disabled>
                <i class="fas fa-check-circle me-1"></i>Corte Validado
            </button>
            <button class="btn btn-outline-primary btn-sm ms-2" onclick="generarReporteGestor(${gestor.idGestor}, '${gestor.nombre}')">
                <i class="fas fa-file-pdf me-1"></i>Reporte
            </button>` :
            `<button class="btn btn-primary btn-sm" onclick="validarCorteGestor(${gestor.idGestor}, '${gestor.nombre}')">
                <i class="fas fa-check me-1"></i>Validar Corte
            </button>
            <button class="btn btn-outline-secondary btn-sm ms-2" onclick="verDetalleGestor(${gestor.idGestor}, '${gestor.nombre}')">
                <i class="fas fa-eye me-1"></i>Ver Detalle
            </button>`;

        const colorCard = estaValidado ? 'border-success' : 'border-warning';
        const colorIcon = neto >= 0 ? 'text-success' : 'text-danger';

        const cardGestor = `
            <div class="card ${colorCard} mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">
                            <i class="fas fa-user-tie me-2"></i>
                            ${gestor.nombre}
                        </h6>
                        <small class="text-muted">${gestor.transacciones} transacciones</small>
                    </div>
                    <div>
                        ${estadoBadge}
                    </div>
                </div>
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="text-success">
                                    <i class="fas fa-arrow-down me-1"></i>
                                    <strong>$${gestor.ingresos.toFixed(2)}</strong>
                                </div>
                                <small class="text-muted">Ingresos</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="text-danger">
                                    <i class="fas fa-arrow-up me-1"></i>
                                    <strong>$${gestor.egresos.toFixed(2)}</strong>
                                </div>
                                <small class="text-muted">Egresos</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="${colorIcon}">
                                    <i class="fas fa-balance-scale me-1"></i>
                                    <strong>$${neto.toFixed(2)}</strong>
                                </div>
                                <small class="text-muted">Balance</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                ${botonAccion}
                            </div>
                        </div>
                    </div>
                    
                    ${!estaValidado ? `
                    <div class="mt-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <small class="text-muted">Progreso de validación</small>
                            <small class="text-muted">${movimientosValidados}/${gestor.transacciones}</small>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar bg-warning" style="width: ${(movimientosValidados / gestor.transacciones) * 100}%"></div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        contenedor.append(cardGestor);
    });
}

// ================================
// FUNCIONES DE VALIDACIÓN
// ================================

function validarCorteGestor(idGestor, nombreGestor) {
    const fechaSeleccionada = $('#fechaCorteSelect').val();

    Swal.fire({
        title: `¿Validar corte de ${nombreGestor}?`,
        html: `
            <div class="text-start">
                <p><strong>Gestor:</strong> ${nombreGestor}</p>
                <p><strong>Fecha:</strong> ${$('#fechaCorte').text()}</p>
                <hr>
                <p class="text-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Esta acción marcará todos los movimientos del gestor como procesados y no se podrá deshacer
                </p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, validar corte',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d'
    }).then((result) => {
        if (result.isConfirmed) {
            procesarValidacionGestor(fechaSeleccionada, idGestor, nombreGestor);
        }
    });
}

function procesarValidacionGestor(fecha, idGestor, nombreGestor) {
    mostrarLoading();
    console.log(fecha, idGestor, nombreGestor)
    fetch('/Auxiliares/ValidarCorteGestor', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fechaCorte: fecha,
            idGestor: idGestor
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    title: '¡Corte Validado!',
                    html: `
                    <div class="text-center">
                        <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
                        <p><strong>Gestor:</strong> ${nombreGestor}</p>
                        <p><strong>Movimientos validados:</strong> ${data.data.movimientosValidados}</p>
                        <p><strong>Balance final:</strong> $${data.data.balanceNeto.toFixed(2)}</p>
                    </div>
                `,
                    icon: 'success',
                    timer: 4000,
                    showConfirmButton: true,
                    confirmButtonText: 'Entendido'
                });

                cargarDatosCorteGeneral();
            } else {
                mostrarError('Error', data.message || 'Error al validar el corte del gestor');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarError('Error de Conexión', 'No se pudo conectar con el servidor');
        })
        .finally(() => {
            ocultarLoading();
        });
}

function verDetalleGestor(idGestor, nombreGestor) {
    const gestorData = gestoresData.find(g => g.idGestor === idGestor);

    if (!gestorData) {
        mostrarError('Error', 'No se encontraron datos del gestor');
        return;
    }

    let detalleHTML = `
        <div class="text-start">
            <h6><i class="fas fa-user me-2"></i>${nombreGestor}</h6>
            <hr>
            <div class="row mb-3">
                <div class="col-6">
                    <strong>Total Ingresos:</strong><br>
                    <span class="text-success">$${gestorData.ingresos.toFixed(2)}</span>
                </div>
                <div class="col-6">
                    <strong>Total Egresos:</strong><br>
                    <span class="text-danger">$${gestorData.egresos.toFixed(2)}</span>
                </div>
            </div>
    `;

    if (gestorData.movimientos && gestorData.movimientos.length > 0) {
        detalleHTML += `
            <h6>Últimas Transacciones:</h6>
            <div style="max-height: 200px; overflow-y: auto;">
        `;

        gestorData.movimientos.slice(0, 5).forEach(mov => {
            const tipoIcon = mov.tipo === 'INGRESO' ? 'fa-arrow-down text-success' : 'fa-arrow-up text-danger';
            detalleHTML += `
                <div class="d-flex justify-content-between border-bottom py-2">
                    <div>
                        <i class="fas ${tipoIcon} me-2"></i>
                        ${mov.concepto}
                    </div>
                    <strong>$${mov.monto.toFixed(2)}</strong>
                </div>
            `;
        });

        detalleHTML += '</div>';
    }

    detalleHTML += '</div>';

    Swal.fire({
        title: 'Detalle del Gestor',
        html: detalleHTML,
        icon: 'info',
        width: '500px',
        confirmButtonText: 'Cerrar'
    });
}

function generarReporteGestor(idGestor, nombreGestor) {
    Swal.fire({
        title: 'Generar Reporte',
        text: `Generando reporte para ${nombreGestor}...`,
        icon: 'info',
        confirmButtonText: 'Entendido'
    });
}

// ================================
// FUNCIONES AUXILIARES
// ================================

function actualizarDesglobeDetallado() {
    if (datosCorteGeneral.resumen.totalMovimientos > 0) {
        $('#desglobeDetallado').show();

        const resumen = datosCorteGeneral.resumen;
        $('#totalCapital').text(`$${resumen.ingresos.capital.toFixed(2)}`);
        $('#totalInteres').text(`$${resumen.ingresos.interes.toFixed(2)}`);
        $('#totalMora').text(`$${resumen.ingresos.mora.toFixed(2)}`);
        $('#totalDesembolsos').text(`$${resumen.egresos.desembolsos.toFixed(2)}`);

        const movimientos = datosCorteGeneral.data || [];
        $('#cantidadCapital').text(movimientos.filter(m => m.Capital > 0).length);
        $('#cantidadInteres').text(movimientos.filter(m => m.Interes > 0).length);
        $('#cantidadMora').text(movimientos.filter(m => m.Mora > 0).length);
        $('#cantidadDesembolsos').text(movimientos.filter(m => m.Tipo === 'EGRESO').length);
    } else {
        $('#desglobeDetallado').hide();
    }
}

function actualizarFechaCorte(fechaSeleccionada) {
    const fecha = new Date(fechaSeleccionada + 'T00:00:00');
    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    $('#fechaCorte').text(fecha.toLocaleDateString('es-ES', opciones));
}

function configurarEventos() {
    $('#fechaCorteSelect').on('change', function () {
        fechaCorteActual = $(this).val();
        cargarDatosCorteGeneral();
    });
}

function mostrarLoading() {
    $('#loadingOverlay').css('display', 'flex');
}

function ocultarLoading() {
    $('#loadingOverlay').hide();
}

function mostrarError(titulo, mensaje) {
    Swal.fire({
        title: titulo,
        text: mensaje,
        icon: 'error',
        confirmButtonText: 'Entendido'
    });
}

// Hacer funciones globales para onclick
window.validarCorteGestor = validarCorteGestor;
window.verDetalleGestor = verDetalleGestor;
window.generarReporteGestor = generarReporteGestor;