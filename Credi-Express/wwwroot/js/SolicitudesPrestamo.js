let tabla;
let solicitudActual = null;

$(document).ready(function () {
    // Establecer fechas por defecto al cargar la página
    const today = new Date();
    //const yearStart = new Date(today.getFullYear(), 0, 1); // 0 = enero
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()); // Un mes atrás

    // ÚLTIMO DÍA DEL MES ACTUAL
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Formato YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];

    $('#txtFechaDesde').val(formatDate(monthAgo));
    $('#txtFechaHasta').val(formatDate(lastDayOfMonth));

    $('#btnFiltrar').on('click', function () {
        const estado = $('#estadoFiltro').val();
        const fechaInicio = $('#txtFechaDesde').val();
        const fechaFin = $('#txtFechaHasta').val();
        const extra = $('#selectExtra').val();

        showLoadingSpinner();
        $.ajax({
            url: `/Auxiliares/GetSolicitudes?estado=${estado}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&extra=${extra}`,
            method: 'GET',
            success: function (data) {
                if ($.fn.dataTable.isDataTable('#tblSolicitudes')) {
                    $('#tblSolicitudes').DataTable().destroy();
                }

                $('#contenedorTabla').show();

                tabla = $('#tblSolicitudes').DataTable({
                    processing: true,
                    serverSide: false,
                    data: data,
                    dom: 'frtip',
                    "columns": [
                        {
                            "data": "id",
                            "title": "N° Solicitud",
                            "className": "tamano2"
                        },
                        {
                            "data": null,
                            "title": "Cliente",
                            "className": "tamano2",
                            "render": function (data, type, row, meta) {
                                return `<div class="info-user ms-3">
												<div class="username">${row.nombreCliente}</div>
												<div class="status">Tasa: ${row.tasa} %</div>
												<div class="status">Tasa Domicilio: ${row.tasaDomicilio ? row.tasaDomicilio : 0} %</div>
												<div class="status">Couta: $ ${(row.cuotas).toFixed(2)}</div>
											</div>`;
                            }
                        },
                        {
                            "data": "fecha",
                            "title": "Fecha",
                            "className": "tamano1"
                        },
                        {
                            "data": "monto",
                            "title": "Monto",
                            "className": "tamano1",
                            "render": function (data, type, row, meta) {
                                let monto = parseFloat(data).toFixed(2);
                                return `$ ${monto}`;
                            }
                        },
                        {
                            "data": "numCoutas",
                            "title": "Coutas",
                            "className": "tamano1"
                        },
                        {
                            "data": "aprobado",
                            "title": "Estado",
                            "className": "tamano1",
                            "render": function (data, type, row, meta) {
                                if (data && row.detalleAprobado === "APROBADO") {
                                    return `<span class="badge badge-success">${row.detalleAprobado}</span>`
                                } else if (data && row.detalleAprobado === "DESEMBOLSADO") {
                                    return `<span class="badge badge-primary">${row.detalleAprobado}</span>`
                                }
                                else if (row.detalleAprobado === "EN PROCESO") {
                                    return `<span class="badge badge-warning">${row.detalleAprobado}</span>`;
                                } else {
                                    return `<span class="badge badge-danger">${row.detalleAprobado}</span>`;
                                }
                               
                            }
                        },
                        {
                            "data": null,
                            "title": "Opciones",
                            "className": "dt-body-center tamano1",
                            "render": function (data, type, row, meta) {
                                return `<button type="button" class="btn btn-primary btn-sm" onclick="detalle(${meta.row})">
                                         <i class="fas fa-external-link-alt"></i>
                                       </button>`;
                            }
                        }
                    ],
                    order: [[0, 'desc']],
                    rowCallback: function (row, data, index) {
                        // if (data.activo === true) {
                        //     $(row).css('background-color', '#d1f2eb');
                        // }
                    },
                    initComplete: function () {
                        hideLoadingSpinner();
                    }

                });
            },
            error: function (xhr, status, error) {
                console.error('Error al cargar los préstamos:', error);
                $('#resultadoPrestamos').html('<p class="text-danger">Ocurrió un error al cargar los datos.</p>');
            }
        });
    });

    // Ejecutar clic automáticamente luego de 3 segundos (3000 ms)
    $('#btnFiltrar').trigger('click');
});

// Función para mostrar el detalle de la solicitud
function detalle(rowIndex) {
    // Obtener los datos de la fila seleccionada
    const rowData = tabla.row(rowIndex).data();
    solicitudActual = rowData;
    var montoIeres = (rowData.monto || 0) * ((rowData.tasa || 0) / 100);
    var montoDomicilio = (rowData.monto || 0) * ((rowData.tasaDomicilio || 0) / 100);
    var montototal = (rowData.monto || 0) + montoIeres + montoDomicilio;
    // Llenar los campos del modal con los datos
    $('#modalNumSolicitud').text(rowData.id || '-');
    $('#modalCliente').text(rowData.nombreCliente || '-');
    $('#modalMonto').text('$ ' + (parseFloat(rowData.monto || 0).toFixed(2)));
    $('#modalNumCuotas').text(rowData.numCoutas || '-');
    $('#modalValorCuota').text('$ ' + (parseFloat(rowData.cuotas || 0).toFixed(2)));
    $('#montoInteres').text('$ ' + (parseFloat(montoIeres || 0).toFixed(2)));
    $('#montoDomicilio').text('$ ' + (parseFloat(montoDomicilio || 0).toFixed(2)));
    $('#montoTotal').text('$ ' + (parseFloat(montototal || 0).toFixed(2)));
    $('#modalTasa').text((rowData.tasa || 0) + ' %');
    $('#modalTasaDomicilio').text((rowData.tasaDomicilio || 0) + ' %');
    $('#modalFecha').text(rowData.fechaCreadaFecha || '-');
    $('#fechaPrimerPago').text(rowData.fecha || '-');
    $('#txtTipoPrestamo').text(rowData.tipoPrestamo || '-');
    $('#txtObservacionRechazo').text(rowData.detalleRechazo || '-');
    $('#txtObservacion').text(rowData.observaciones || '-');
    $('#txtNombreCreador').text(rowData.nombreCreadoPor || '-');
    $('#txtNombreGestor').text(rowData.nombreGestor || '-');

    // Configurar el estado
    const estadoBadge = rowData.aprobado ?
        '<span class="badge bg-success">Aprobado</span>' :
        '<span class="badge bg-danger">Sin Aprobar</span>';
    $('#modalEstado').html(estadoBadge);
    $('#modalDetalleEstado').text(rowData.detalleAprobado || '-');

    // Mostrar u ocultar la sección de aprobación según el estado
    if (!rowData.aprobado && rowData.detalleAprobado === "EN PROCESO") {
        $('#seccionAprobacion').show();
        $('#btnAprobar').show();
        $('#btnRechazar').show();
        $('#btnReenvio').hide();
        $('#btnImprimirPagare').hide();
    } else if (!rowData.aprobado && rowData.detalleAprobado === "RECHAZADO") {
        $('#seccionAprobacion').hide();
        $('#btnAprobar').hide();
        $('#btnRechazar').hide();
        $('#btnReenvio').show();
        $('#btnImprimirPagare').hide();
    }
    else if (rowData.aprobado) {
        $('#seccionAprobacion').hide();
        $('#btnAprobar').hide();
        $('#btnRechazar').hide();
        $('#btnReenvio').hide();
        $('#btnImprimirPagare').show();
    } else {
        $('#seccionAprobacion').hide();
        $('#btnAprobar').hide();
        $('#btnRechazar').hide();
        $('#btnReenvio').show();
        $('#btnImprimirPagare').hide();
    }

    // Limpiar observaciones previas
    $('#observacionesAprobacion').val('');

    // Mostrar el modal
    $('#modalDetalleSolicitud').modal('show');
}

// Limpiar datos al cerrar el modal
$('#modalDetalleSolicitud').on('hidden.bs.modal', function () {
    solicitudActual = null;
    $('#observacionesAprobacion').val('');
});

// JavaScript completo para botones Aprobar y Rechazar solicitudes
$(document).ready(function () {

    // ==================== BOTÓN IMPRIMIR PAGARÉ ====================
    $('#btnImprimirPagare').on('click', function () {
        if (solicitudActual) {
            generarPagarePDF(solicitudActual);
        } else {
            Swal.fire({
                title: 'Error',
                text: 'No hay datos de solicitud disponibles',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    });

    // ==================== BOTÓN APROBAR ====================
    $('#btnAprobar').on('click', function () {
        // Obtener datos antes de cerrar el modal
        const numeroSolicitud = $('#modalNumSolicitud').text();
        const nombreCliente = $('#modalCliente').text();
        const montoSolicitud = $('#modalMonto').text();
        const valorCuota = $('#modalValorCuota').text();

        // Cerrar el modal primero
        $('#modalDetalleSolicitud').modal('hide');

        // Esperar a que el modal se cierre completamente y abrir SweetAlert
        $('#modalDetalleSolicitud').on('hidden.bs.modal', function () {
            // Remover el event listener para evitar múltiples llamadas
            $(this).off('hidden.bs.modal');

            // Pequeño delay para asegurar que el modal se cerró completamente
            setTimeout(() => {
                mostrarAlertaAprobacion(numeroSolicitud, nombreCliente, montoSolicitud, valorCuota);
            }, 200);
        });
    });

    // ==================== BOTÓN RECHAZAR ====================
    $('#btnRechazar').on('click', function () {
        // Obtener datos antes de cerrar el modal
        const numeroSolicitud = $('#modalNumSolicitud').text();
        const nombreCliente = $('#modalCliente').text();

        // Cerrar el modal primero
        $('#modalDetalleSolicitud').modal('hide');

        // Esperar a que el modal se cierre completamente y abrir SweetAlert
        $('#modalDetalleSolicitud').on('hidden.bs.modal', function () {
            // Remover el event listener para evitar múltiples llamadas
            $(this).off('hidden.bs.modal');

            // Pequeño delay para asegurar que el modal se cerró completamente
            setTimeout(() => {
                mostrarAlertaRechazo(numeroSolicitud, nombreCliente);
            }, 200);
        });
    });

    // ==================== FUNCIÓN ALERTA APROBACIÓN ====================
    function mostrarAlertaAprobacion(numeroSolicitud, nombreCliente, montoSolicitud, valorCuota) {
        Swal.fire({
            title: '¿Aprobar Solicitud de Crédito?',
            html: `
                <div class="text-start">
                    <div class="alert alert-success mb-3">
                        <strong><i class="fas fa-file-invoice-dollar me-2"></i>Solicitud N°:</strong> ${numeroSolicitud}<br>
                        <strong><i class="fas fa-user me-2"></i>Cliente:</strong> ${nombreCliente}<br>
                        <strong><i class="fas fa-dollar-sign me-2"></i>Monto:</strong> ${montoSolicitud}<br>
                        <strong><i class="fas fa-calendar-alt me-2"></i>Cuota:</strong> ${valorCuota}
                    </div>
                    <label for="observacionesAprobacion" class="form-label fw-bold">
                        <i class="fas fa-clipboard-list me-2"></i>Observaciones de Aprobación:
                    </label>
                    <textarea 
                        id="observacionesAprobacion" 
                        class="form-control" 
                        rows="4" 
                        placeholder="Ingrese observaciones sobre la aprobación (condiciones, requisitos, etc.)..."
                        style="resize: vertical;"
                    ></textarea>
                    <small class="text-muted">
                        <i class="fas fa-info-circle me-1"></i>
                        Mínimo 10 caracteres - Estas observaciones quedarán registradas
                    </small>
                </div>
            `,
            icon: 'question',
            iconColor: '#198754',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-check me-1"></i> Aprobar Solicitud',
            cancelButtonText: '<i class="fas fa-arrow-left me-1"></i> Volver al Detalle',
            focusConfirm: false,
            allowOutsideClick: false,
            width: '650px',
            customClass: {
                confirmButton: 'btn btn-success btn-lg',
                cancelButton: 'btn btn-secondary'
            },
            didOpen: () => {
                // Focus automático en el textarea
                setTimeout(() => {
                    const textarea = document.getElementById('observacionesAprobacion');
                    if (textarea) {
                        textarea.focus();
                    }
                }, 100);
            },
            preConfirm: () => {
                const observaciones = document.getElementById('observacionesAprobacion').value.trim();
                if (!observaciones) {
                    Swal.showValidationMessage('Debe ingresar observaciones para la aprobación');
                    return false;
                }
                if (observaciones.length < 10) {
                    Swal.showValidationMessage('Las observaciones deben tener al menos 10 caracteres');
                    return false;
                }
                return observaciones;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const observaciones = result.value;

                // Confirmación final antes de aprobar
                Swal.fire({
                    title: '¿Confirmar Aprobación?',
                    html: `
                        <div class="text-center">
                            <div class="alert alert-warning mb-3">
                                <strong>⚠️ ACCIÓN IRREVERSIBLE</strong><br>
                                Una vez aprobada, la solicitud no se podrá modificar
                            </div>
                            <p><strong>Solicitud:</strong> ${numeroSolicitud}</p>
                            <p><strong>Cliente:</strong> ${nombreCliente}</p>
                            <div class="border rounded p-2 bg-light">
                                <small><strong>Observaciones:</strong></small><br>
                                <em>${observaciones}</em>
                            </div>
                        </div>
                    `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#198754',
                    cancelButtonColor: '#dc3545',
                    confirmButtonText: '<i class="fas fa-check-circle me-1"></i> SÍ, Aprobar Definitivamente',
                    cancelButtonText: '<i class="fas fa-times me-1"></i> Cancelar',
                    width: '600px'
                }).then((confirmResult) => {
                    if (confirmResult.isConfirmed) {
                        aprobarSolicitud(numeroSolicitud, observaciones);
                    }
                    // Si cancela la confirmación final, no hacer nada (se queda cerrado)
                });
            } else if (result.isDismissed) {
                // Si cancela, volver a abrir el modal
                $('#modalDetalleSolicitud').modal('show');
            }
        });
    }

    // ==================== FUNCIÓN ALERTA RECHAZO ====================
    function mostrarAlertaRechazo(numeroSolicitud, nombreCliente) {
        Swal.fire({
            title: '¿Rechazar Solicitud?',
            html: `
                <div class="text-start">
                    <div class="alert alert-warning mb-3">
                        <strong><i class="fas fa-exclamation-triangle me-2"></i>Solicitud N°:</strong> ${numeroSolicitud}<br>
                        <strong><i class="fas fa-user me-2"></i>Cliente:</strong> ${nombreCliente}
                    </div>
                    <label for="motivoRechazo" class="form-label fw-bold text-danger">
                        <i class="fas fa-ban me-2"></i>Motivo del Rechazo:
                    </label>
                    <textarea 
                        id="motivoRechazo" 
                        class="form-control" 
                        rows="4" 
                        placeholder="Ingrese el motivo detallado del rechazo (documentación, ingresos, historial, etc.)..."
                        style="resize: vertical;"
                    ></textarea>
                    <small class="text-muted">
                        <i class="fas fa-info-circle me-1"></i>
                        Mínimo 10 caracteres - Sea específico para que el cliente comprenda
                    </small>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-ban me-1"></i> Rechazar Solicitud',
            cancelButtonText: '<i class="fas fa-arrow-left me-1"></i> Volver al Detalle',
            focusConfirm: false,
            allowOutsideClick: false,
            width: '600px',
            didOpen: () => {
                setTimeout(() => {
                    const textarea = document.getElementById('motivoRechazo');
                    if (textarea) {
                        textarea.focus();
                    }
                }, 100);
            },
            preConfirm: () => {
                const motivo = document.getElementById('motivoRechazo').value.trim();
                if (!motivo) {
                    Swal.showValidationMessage('Debe ingresar un motivo para el rechazo');
                    return false;
                }
                if (motivo.length < 10) {
                    Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres');
                    return false;
                }
                return motivo;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const motivoRechazo = result.value;
                rechazarSolicitud(numeroSolicitud, motivoRechazo);
            } else if (result.isDismissed) {
                // Si cancela, volver a abrir el modal
                $('#modalDetalleSolicitud').modal('show');
            }
        });
    }

    // ==================== FUNCIÓN APROBAR SOLICITUD ====================
    function aprobarSolicitud(numeroSolicitud, observaciones) {
        Swal.fire({
            title: 'Procesando Aprobación...',
            html: `
                <div class="text-center">
                    <div class="spinner-border text-success mb-3" role="status">
                        <span class="visually-hidden">Procesando...</span>
                    </div>
                    <p>Aprobando solicitud de crédito</p>
                    <small class="text-muted">Por favor espere...</small>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false
        });

        $.ajax({
            url: '/Auxiliares/AprobarSolicitud',
            type: 'POST',
            data: {
                numeroSolicitud: numeroSolicitud,
                observaciones: observaciones
            },
            success: function (response) {
                if (response.success) {
                    Swal.fire({
                        title: '¡Solicitud Aprobada! 🎉',
                        html: `
                            <div class="text-center">
                                <div class="alert alert-success mb-3">
                                    <i class="fas fa-check-circle fa-3x text-success mb-2"></i><br>
                                    <strong>La solicitud ha sido aprobada exitosamente</strong>
                                </div>
                                <p><strong>Solicitud N°:</strong> ${numeroSolicitud}</p>
                                <p><strong>Fecha:</strong> ${response.data?.fechaAprobacion || new Date().toLocaleString()}</p>
                            </div>
                        `,
                        icon: 'success',
                        confirmButtonColor: '#198754',
                        confirmButtonText: '<i class="fas fa-thumbs-up me-1"></i> Entendido',
                        width: '500px'
                    }).then(() => {
                        // Recargar tabla si existe
                        $('#btnFiltrar').trigger('click');
                    });
                } else {
                    Swal.fire({
                        title: 'Error en la Aprobación',
                        text: response.message || 'Error al aprobar la solicitud',
                        icon: 'error',
                        confirmButtonColor: '#dc3545'
                    });
                }
            },
            error: function (xhr, status, error) {
                let errorMessage = 'No se pudo conectar con el servidor.';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    title: 'Error de Conexión',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
                console.error('Error AJAX:', error);
            }
        });
    }


    // ==================== BOTÓN REENVÍO ====================
    $('#btnReenvio').on('click', function () {
        // Obtener datos antes de cerrar el modal
        const numeroSolicitud = $('#modalNumSolicitud').text();
        const nombreCliente = $('#modalCliente').text();

        // Cerrar el modal primero
        $('#modalDetalleSolicitud').modal('hide');

        // Esperar a que el modal se cierre completamente y abrir SweetAlert
        $('#modalDetalleSolicitud').on('hidden.bs.modal', function () {
            // Remover el event listener para evitar múltiples llamadas
            $(this).off('hidden.bs.modal');

            // Pequeño delay para asegurar que el modal se cerró completamente
            setTimeout(() => {
                mostrarAlertaReenvio(numeroSolicitud, nombreCliente);
            }, 200);
        });
    });

    // ==================== FUNCIÓN ALERTA REENVÍO ====================
    function mostrarAlertaReenvio(numeroSolicitud, nombreCliente) {
        Swal.fire({
            title: '¿Reenviar Solicitud?',
            html: `
            <div class="text-start">
                <div class="alert alert-info mb-3">
                    <strong><i class="fas fa-redo me-2"></i>Solicitud N°:</strong> ${numeroSolicitud}<br>
                    <strong><i class="fas fa-user me-2"></i>Cliente:</strong> ${nombreCliente}
                </div>
                <div class="alert alert-warning mb-3">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Esta solicitud será enviada nuevamente para evaluación</strong>
                </div>
                <label for="comentarioReenvio" class="form-label fw-bold text-primary">
                    <i class="fas fa-comment me-2"></i>Comentario del Reenvío:
                </label>
                <textarea 
                    id="comentarioReenvio" 
                    class="form-control" 
                    rows="4" 
                    placeholder="Explique por qué se reenvía la solicitud (documentación adicional, correcciones, etc.)..."
                    style="resize: vertical;"
                ></textarea>
                <small class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    Mínimo 10 caracteres - Este comentario se agregará al historial
                </small>
            </div>
        `,
            icon: 'question',
            iconColor: '#17a2b8',
            showCancelButton: true,
            confirmButtonColor: '#17a2b8',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-paper-plane me-1"></i> Reenviar Solicitud',
            cancelButtonText: '<i class="fas fa-arrow-left me-1"></i> Volver al Detalle',
            focusConfirm: false,
            allowOutsideClick: false,
            width: '600px',
            customClass: {
                confirmButton: 'btn btn-info btn-lg',
                cancelButton: 'btn btn-secondary'
            },
            didOpen: () => {
                // Focus automático en el textarea
                setTimeout(() => {
                    const textarea = document.getElementById('comentarioReenvio');
                    if (textarea) {
                        textarea.focus();
                    }
                }, 100);
            },
            preConfirm: () => {
                const comentario = document.getElementById('comentarioReenvio').value.trim();
                if (!comentario) {
                    Swal.showValidationMessage('Debe ingresar un comentario para el reenvío');
                    return false;
                }
                if (comentario.length < 10) {
                    Swal.showValidationMessage('El comentario debe tener al menos 10 caracteres');
                    return false;
                }
                return comentario;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const comentarioReenvio = result.value;

                // Confirmación final antes de reenviar
                Swal.fire({
                    title: '¿Confirmar Reenvío?',
                    html: `
                    <div class="text-center">
                        <div class="alert alert-info mb-3">
                            <strong>📋 SOLICITUD SERÁ REENVIADA</strong><br>
                            La solicitud volverá a estado "EN PROCESO" para nueva evaluación
                        </div>
                        <p><strong>Solicitud:</strong> ${numeroSolicitud}</p>
                        <p><strong>Cliente:</strong> ${nombreCliente}</p>
                        <div class="border rounded p-2 bg-light">
                            <small><strong>Comentario:</strong></small><br>
                            <em>${comentarioReenvio}</em>
                        </div>
                    </div>
                `,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonColor: '#17a2b8',
                    cancelButtonColor: '#dc3545',
                    confirmButtonText: '<i class="fas fa-check-circle me-1"></i> SÍ, Reenviar',
                    cancelButtonText: '<i class="fas fa-times me-1"></i> Cancelar',
                    width: '600px'
                }).then((confirmResult) => {
                    if (confirmResult.isConfirmed) {
                        reenviarSolicitud(numeroSolicitud, comentarioReenvio);
                    }
                    // Si cancela la confirmación final, no hacer nada (se queda cerrado)
                });
            } else if (result.isDismissed) {
                // Si cancela, volver a abrir el modal
                $('#modalDetalleSolicitud').modal('show');
            }
        });
    }

    // ==================== FUNCIÓN REENVIAR SOLICITUD ====================
    function reenviarSolicitud(numeroSolicitud, comentarioReenvio) {
        Swal.fire({
            title: 'Procesando Reenvío...',
            html: `
            <div class="text-center">
                <div class="spinner-border text-info mb-3" role="status">
                    <span class="visually-hidden">Procesando...</span>
                </div>
                <p>Reenviando solicitud para evaluación</p>
                <small class="text-muted">Por favor espere...</small>
            </div>
        `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false
        });

        $.ajax({
            url: '/Auxiliares/ReenvioSolicitud',
            type: 'POST',
            data: {
                numeroSolicitud: numeroSolicitud,
                comentarioReenvio: comentarioReenvio
            },
            success: function (response) {
                if (response.success) {
                    Swal.fire({
                        title: '¡Solicitud Reenviada! 📤',
                        html: `
                        <div class="text-center">
                            <div class="alert alert-success mb-3">
                                <i class="fas fa-paper-plane fa-3x text-info mb-2"></i><br>
                                <strong>La solicitud ha sido reenviada exitosamente</strong>
                            </div>
                            <p><strong>Solicitud N°:</strong> ${numeroSolicitud}</p>
                            <p><strong>Nuevo Estado:</strong> EN PROCESO</p>
                            <p><strong>Fecha:</strong> ${response.data?.fechaReenvio || new Date().toLocaleString()}</p>
                        </div>
                    `,
                        icon: 'success',
                        confirmButtonColor: '#198754',
                        confirmButtonText: '<i class="fas fa-thumbs-up me-1"></i> Entendido',
                        width: '500px'
                    }).then(() => {
                        // Recargar tabla si existe
                        $('#btnFiltrar').trigger('click');
                    });
                } else {
                    Swal.fire({
                        title: 'Error en el Reenvío',
                        text: response.message || 'Error al reenviar la solicitud',
                        icon: 'error',
                        confirmButtonColor: '#dc3545'
                    });
                }
            },
            error: function (xhr, status, error) {
                let errorMessage = 'No se pudo conectar con el servidor.';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    title: 'Error de Conexión',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
                console.error('Error AJAX:', error);
            }
        });
    }
    // ==================== FUNCIÓN RECHAZAR SOLICITUD ====================
    function rechazarSolicitud(numeroSolicitud, motivoRechazo) {
        Swal.fire({
            title: 'Procesando Rechazo...',
            html: `
                <div class="text-center">
                    <div class="spinner-border text-danger mb-3" role="status">
                        <span class="visually-hidden">Procesando...</span>
                    </div>
                    <p>Rechazando solicitud de crédito</p>
                    <small class="text-muted">Por favor espere...</small>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false
        });

        $.ajax({
            url: '/Auxiliares/RechazarSolicitud',
            type: 'POST',
            data: {
                numeroSolicitud: numeroSolicitud,
                motivoRechazo: motivoRechazo
            },
            success: function (response) {
                if (response.success) {
                    Swal.fire({
                        title: 'Solicitud Rechazada',
                        html: `
                            <div class="text-center">
                                <div class="alert alert-warning mb-3">
                                    <i class="fas fa-ban fa-3x text-warning mb-2"></i><br>
                                    <strong>La solicitud ha sido rechazada</strong>
                                </div>
                                <p><strong>Solicitud N°:</strong> ${numeroSolicitud}</p>
                                <p><strong>Fecha:</strong> ${response.data?.fechaRechazo || new Date().toLocaleString()}</p>
                            </div>
                        `,
                        icon: 'info',
                        confirmButtonColor: '#198754',
                        confirmButtonText: '<i class="fas fa-check me-1"></i> Entendido',
                        width: '500px'
                    }).then(() => {
                        // Recargar tabla si existe
                        $('#btnFiltrar').trigger('click');
                    });
                } else {
                    Swal.fire({
                        title: 'Error en el Rechazo',
                        text: response.message || 'Error al rechazar la solicitud',
                        icon: 'error',
                        confirmButtonColor: '#dc3545'
                    });
                }
            },
            error: function (xhr, status, error) {
                let errorMessage = 'No se pudo conectar con el servidor.';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    title: 'Error de Conexión',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
                console.error('Error AJAX:', error);
            }
        });
    }

    // ==================== FUNCIÓN GENERAR PAGARÉ PDF ====================
    function generarPagarePDF(solicitud) {
        // Mostrar loading
        Swal.fire({
            title: 'Generando Pagaré...',
            html: `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Generando...</span>
                </div>
                <p>Creando documento PDF</p>
                <small class="text-muted">Por favor espere...</small>
            </div>
        `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false
        });

        // EXTRAER DUI DEL NOMBRE
        const nombreCompleto = solicitud.nombreCliente || '';
        let dui = '';

        // Buscar DUI entre paréntesis: (01872757-7)
        const duiMatch = nombreCompleto.match(/\(([^)]+)\)/);
        if (duiMatch) {
            dui = duiMatch[1]; // Extraer solo el DUI sin paréntesis
        }

        if (!dui) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudo extraer el DUI del nombre del cliente',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

  
        // LLAMADA AJAX PARA OBTENER DATOS COMPLETOS DEL CLIENTE
        $.ajax({
            url: `/Auxiliares/GetClienteDetalle?dui=${dui}`,
            method: 'GET',
            success: function (clienteDetalle) {
                crearPDFConDatos(solicitud, clienteDetalle);
            },
            error: function (xhr, status, error) {
                console.error('Error al obtener datos del cliente:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudieron obtener los datos completos del cliente',
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    // FUNCIÓN PARA CREAR EL PDF CON TODOS LOS DATOS
    function crearPDFConDatos(solicitud, clienteDetalle) {
        try {
            // Calcular valores del préstamo
            const monto = parseFloat(solicitud.monto || 0);
            const tasa = parseFloat(solicitud.tasa || 0);
            const tasaDomicilio = parseFloat(solicitud.tasaDomicilio || 0);
            const numCuotas = parseInt(solicitud.numCoutas || 1);
            const cuotaMensual = parseFloat(solicitud.cuotas || 0);

            const montoInteres = monto * (tasa / 100);
            const montoDomicilio = monto * (tasaDomicilio / 100);
            const montoTotal = monto + montoInteres + montoDomicilio;
            const interesTotal = tasa + tasaDomicilio;
            // Obtener fecha actual para el pagaré
            const fechaActual = new Date();
            const dia = fechaActual.getDate();
            const mes = fechaActual.toLocaleString('es-ES', { month: 'long' });
            const año = fechaActual.getFullYear();

            // Calcular fecha de vencimiento (30 días después)
            const fechaVencimiento = new Date(fechaActual);
            fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

            // DATOS DEL CLIENTE (ahora completos desde la API)
            const nombreCompleto = `${clienteDetalle.nombre || ''} ${clienteDetalle.apellido || ''}`.trim();
            const dui = clienteDetalle.dui || '';
            const nit = clienteDetalle.nit || '';
            const direccion = clienteDetalle.direccion || '';
            const departamento = clienteDetalle.departamentoNombre || '';
            const telefono = clienteDetalle.telefono || '';
            const celular = clienteDetalle.celular || '';
            const profesion = clienteDetalle.profesion || '_______________________________________';

            // Variable que calcula la edad de forma segura
            const edad = (() => {
                // Verificar si fechaNacimiento existe y no está vacía
                if (!clienteDetalle.fechaNacimiento ||
                    clienteDetalle.fechaNacimiento === '' ||
                    clienteDetalle.fechaNacimiento === null ||
                    clienteDetalle.fechaNacimiento === undefined) {
                    return ''; // Devolver vacío si no hay fecha
                }

                try {
                    const fechaNac = new Date(clienteDetalle.fechaNacimiento);

                    // Verificar que la fecha sea válida
                    if (isNaN(fechaNac.getTime())) {
                        return ''; // Devolver vacío si la fecha no es válida
                    }

                    const hoy = new Date();
                    let edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
                    const mesActual = hoy.getMonth();
                    const mesNacimiento = fechaNac.getMonth();

                    // Ajustar si aún no ha cumplido años este año
                    if (mesActual < mesNacimiento ||
                        (mesActual === mesNacimiento && hoy.getDate() < fechaNac.getDate())) {
                        edadCalculada--;
                    }

                    // Verificar que la edad sea razonable (entre 0 y 120 años)
                    if (edadCalculada < 0 || edadCalculada > 120) {
                        return ''; // Devolver vacío si la edad no es razonable
                    }

                    return edadCalculada;

                } catch (error) {
                    console.error('Error calculando edad:', error);
                    return ''; // Devolver vacío en caso de error
                }
            })();


            // Función para convertir números a texto - VERSIÓN COMPLETA
            function numeroATexto(numero) {
                // Convertir a entero si viene como decimal
                numero = Math.floor(numero);

                // Arrays de referencia
                const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
                const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
                const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
                const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];

                // Casos especiales
                if (numero === 0) return 'CERO';
                if (numero === 1) return 'UN'; // Para "UN dólar"
                if (numero === 100) return 'CIEN';
                if (numero === 1000) return 'MIL';

                // Función auxiliar para convertir números de 1 a 999
                function convertirCientos(num) {
                    if (num === 0) return '';
                    if (num === 100) return 'CIEN';

                    let resultado = '';

                    // Centenas
                    if (num >= 100) {
                        const cen = Math.floor(num / 100);
                        resultado += centenas[cen];
                        num = num % 100;
                        if (num > 0) resultado += ' ';
                    }

                    // Decenas y unidades
                    if (num >= 20) {
                        const dec = Math.floor(num / 10);
                        const uni = num % 10;
                        resultado += decenas[dec];
                        if (uni > 0) {
                            resultado += ' Y ' + unidades[uni];
                        }
                    } else if (num >= 10) {
                        resultado += especiales[num - 10];
                    } else if (num > 0) {
                        resultado += unidades[num];
                    }

                    return resultado;
                }

                // Convertir números hasta 999,999
                if (numero < 1000) {
                    return convertirCientos(numero);
                }

                if (numero < 1000000) {
                    const miles = Math.floor(numero / 1000);
                    const resto = numero % 1000;

                    let resultado = '';

                    if (miles === 1) {
                        resultado = 'MIL';
                    } else {
                        resultado = convertirCientos(miles) + ' MIL';
                    }

                    if (resto > 0) {
                        resultado += ' ' + convertirCientos(resto);
                    }

                    return resultado;
                }

                // Para números muy grandes, devolver el número como string
                return numero.toString();
            }

            // DEFINIR EL DOCUMENTO PDF CON DATOS COMPLETOS
            const docDefinition = {
                pageSize: 'LETTER',
                pageMargins: [40, 60, 40, 60],
                defaultStyle: {
                    fontSize: 10
                },
                content: [
                    // ENCABEZADO
                    {
                        text: 'PAGARÉ',
                        fontSize: 16,
                        bold: true,
                        decoration: 'underline',
                        alignment: 'center',
                        margin: [0, 0, 0, 20]
                    },

                    // MONTO
                    {
                        text: `POR $ ${monto.toFixed(2)}`,
                        fontSize: 12,
                        bold: true,
                        alignment: 'right',
                        margin: [0, 0, 0, 15]
                    },

                    // PRIMER PÁRRAFO CON DATOS REALES - CORREGIDO
                    {
                        text: [
                            'YO ',
                            { text: nombreCompleto.toUpperCase(), decoration: 'underline', bold: true },
                            ', de ',
                            { text: edad ? edad.toString() : '_____' },
                            ' años de edad, domicilio del distrito ',
                            { text: direccion || '_________________________', decoration: 'underline' },
                            ', municipio de ',
                            { text: departamento || '______________________', decoration: 'underline' },
                            ', de profesión u oficio ',
                            { text: profesion.toLowerCase() }, // ← USAR PROFESIÓN REAL
                            ', con Documento Único de Identidad homologado con mi número de identificación tributaria ',
                            { text: dui || '_________________________', decoration: 'underline', bold: true },
                            ' por este medio PAGARÉ, me obligo a pagar incondicionalmente a la orden de CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE, del domicilio de SONSONATE, la cantidad de '
                        ],
                        margin: [0, 0, 0, 10],
                        alignment: 'justify',
                        lineHeight: 1.3
                    },
                    // MONTO EN LETRAS Y NÚMEROS
                    {
                        text: [
                            { text: numeroATexto(Math.floor(monto)).toUpperCase(), decoration: 'underline', bold: true },
                            ' Dólares de los Estados Unidos de América (US$ ',
                            { text: monto.toFixed(2), decoration: 'underline', bold: true },
                            '), cantidad que devengará un interés nominal de ',
                            { text: numeroATexto(Math.floor(interesTotal)).toUpperCase(), decoration: 'underline', bold: true },
                            ' POR CIENTO MENSUAL (',
                            { text: interesTotal.toFixed(1) + '%', decoration: 'underline', bold: true },
                            ')'
                        ],
                        margin: [0, 0, 0, 10],
                        alignment: 'justify',
                        lineHeight: 1.3
                    },

                    // CLÁUSULA DE MORA
                    {
                        text: 'En caso de mora en el cumplimiento de mi obligación reconoceré el interés moratorio del TRES POR CIENTO MENSUAL (3%) señalo como domicilio especial el de la ciudad de Sonsonate a cuyos tribunales me someto siendo a mi cargo cualquier gasto que la sociedad CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE, hiciere en el cobro de deuda, inclusive los llamados personales y aun cuando no depositare haya condenación en costas y faculto a la sociedad CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE, para que designe la depositaria de los bienes que se embarguen a quien releva de la obligación de rendir fianza en la ciudad de SONSONATE a los ',
                        alignment: 'justify',
                        margin: [0, 0, 0, 15],
                        lineHeight: 1.3
                    },

                    // FECHA Y FIRMAS
                    {
                        columns: [
                            {
                                text: [
                                    { text: dia.toString(), decoration: 'underline' },
                                    ' días del mes de ',
                                    { text: mes.toUpperCase(), decoration: 'underline' },
                                    ' del año ',
                                    { text: año.toString(), decoration: 'underline' }
                                ],
                                width: '60%'
                            },
                            {
                                text: '',
                                width: '40%'
                            }
                        ],
                        margin: [0, 0, 0, 30]
                    },

                    // FIRMAS
                    {
                        columns: [
                            {
                                stack: [
                                    { text: 'F_____________________________________', margin: [0, 20, 0, 5] },
                                    { text: 'NOMBRE DEL DEUDOR:', bold: true },
                                    { text: nombreCompleto.toUpperCase(), decoration: 'underline' },
                                    {
                                        text: [
                                            'DUI: ',
                                            { text: dui || '___________________________________', bold: true }
                                        ],
                                        width: '50%'
                                    },
                                    {
                                        text: [
                                            'NIT: ',
                                            { text: nit || '____________________________________'}
                                        ],
                                        width: '50%'
                                    }
                                ],
                                width: '50%'
                            },
                            {
                                stack: [
                                    { text: 'F___________________________', margin: [0, 20, 0, 5] },
                                    { text: 'NOMBRE DEL AVALISTA:', bold: true },
                                    { text: '_____________________________________', margin: [0, 0, 0, 5] }
                                ],
                                width: '50%'
                            }
                        ],
                        margin: [0, 0, 0, 20]
                    },

                    

                    // NUEVA PÁGINA - CONTRATO DE MUTUO
                    { text: '', pageBreak: 'before' },

                    // SEGUNDO DOCUMENTO - CONTRATO DE MUTUO
                    {
                        text: 'CONTRATO DE MUTUO',
                        fontSize: 16,
                        bold: true,
                        decoration: 'underline',
                        alignment: 'center',
                        margin: [0, 0, 0, 20]
                    },

                    {
                        text: [
                            'YO ',
                            { text: nombreCompleto.toUpperCase(), decoration: 'underline', bold: true },
                            ', de ',
                            { text: edad ? edad.toString() : '_____' },
                            { text: 'años, '},
                            { text: profesion.toLowerCase() },
                            ', domicilio del distrito ',
                            { text: direccion || '_________________________', decoration: 'underline' },
                            ' municipio de ',
                            { text: departamento || '_________________________', decoration: 'underline' },
                            ' portador de mi Documento Único de Identidad homologado con mi número de identificación tributaria ',
                            { text: dui || '_____________________________', decoration: 'underline', bold: true },
                            ' quien en este documento me denominaré "EL DEUDOR", OTORGO:'
                        ],
                        margin: [0, 0, 0, 15],
                        alignment: 'justify',
                        lineHeight: 1.3
                    },

                    // CLÁUSULAS DEL CONTRATO EN TEXTO CORRIDO
                    {
                        text: [
                            { text: 'I) MONTO: ', bold: true },
                            'que recibo a título de MUTUO de CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE Que en adelante se denominare EL ACREEDOR La suma de ',
                            { text: numeroATexto(Math.floor(monto)), decoration: 'underline', bold: true },
                            ' Dólares de los Estados Unidos de América (US$ ',
                            { text: monto.toFixed(2), decoration: 'underline', bold: true },
                            ') ',

                            { text: 'II) DESTINO: ', bold: true },
                            'El deudor destinará la cantidad recibida para capital de trabajo. ',

                            { text: 'III) PLAZO: ', bold: true },
                            'El deudor se obliga a pagar dicha suma dentro del plazo de 30 DÍAS contados a partir de esta fecha, plazo que vence el día ',
                            { text: fechaVencimiento.toLocaleDateString('es-ES'), decoration: 'underline', bold: true },
                            ' ',

                            { text: 'IV) FORMA DE PAGO: ', bold: true },
                            'El Deudor podrá amortizar a la deuda en cualquier momento antes del vencimiento del plazo ',

                            { text: 'V) INTERESES: ', bold: true },
                            'El Deudor pagará sobre la suma mutuada el interés del ',
                            { text: tasa.toFixed(1) + '%', decoration: 'underline', bold: true },
                            ' mensual sobre saldos, pagadero al vencimiento del plazo antes mencionado los cuales se mantendrán fijos durante el plazo del presente crédito más un recargo por cobranza a domicilio de (US$',
                            { text: montoDomicilio.toFixed(2), decoration: 'underline', bold: true },
                            ') Todo cálculo de intereses se hará sobre la base de un año calendario, por el actual número de días hasta el pago del crédito incluyendo el primero y excluyendo el ultimo día que ocurra durante el periodo en que dichos intereses deben pagarse. En caso de mora sin perjuicio del derecho del ACREEDOR a entablar acción ejecutiva, la tasa de interés se aumentara en tres puntos porcentuales por arriba de la tasa vigente y se calculara sobre saldos de capital en mora, sin que ello signifique prórroga del plazo y sin perjuicio de los demás efectos legales de la mora ',

                            { text: 'VI) LUGAR E IMPUTACIÓN DE PAGOS: ', bold: true },
                            'Todo pago será recibido en el domicilio del negocio del DEUDOR, se imputara primeramente a intereses, luego a los recargos y el saldo remanente, si lo hubiere al capital. ',

                            { text: 'VII) PROCEDENCIA DE LOS FONDOS: ', bold: true },
                            'Los fondos provenientes de este crédito son propios de CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE: Las partes declaran que tanto el efectivo recibido o cualquier otro medio de pago, con el que el Deudor pagara su obligación crediticia tiene procedencia LICITA ',

                            { text: 'VIII) CADUCIDAD DEL PLAZO: ', bold: true },
                            'La obligación se volverá exigible inmediatamente y en su totalidad al final del plazo establecido en este contrato y por incumplimiento por parte del Deudor en cualquiera de las obligaciones que ha contraído por medio de este instrumento, también podrá exigirse el pago total por acción judicial contra el DEUDOR iniciada por terceros o por el mismo ACREEDOR ',

                            { text: 'IX) HONORARIOS Y GASTOS: ', bold: true },
                            'Serán por cuenta del DEUDOR los gastos honorarios de este instrumento, así como todos los gastos en que el ACREEDOR tenga que incurrir para el cobro de mismo ',

                            { text: 'X) DOMICILIO Y RENUNCIAS: ', bold: true },
                            'Para los efectos legales de este contrato, el DEUDOR señala la ciudad de Sonsonate como domicilio especial, a la jurisdicción de cuyos tribunales judiciales se someten expresamente. El ACREEDOR: será depositario de los bienes que se embarquen, sin la obligación de rendir fianza quien podrá designar un representante para tal efecto ',

                            { text: 'XI) GARANTIAS: ', bold: true },
                            'PRENDARIA, En garantía de la presente obligación EL DEUDOR constituirá PRENDA SIN DESPLAZAMIENTO a favor del ACREEDOR sobre los bienes descritos en el anexo 1 de este instrumento, el cual ha sido firmado por él y por agente del ACREEDOR y que forma parte del presente instrumento los bienes prendados radicaran en un inmueble ubicado en el domicilio del DEUDOR. La prenda que constituirá EL DEUDOR a favor del ACREEDOR, Estará vigente durante el plazo del presente contrato y mientras existan saldos pendientes de pago a cargo del DEUDOR y a favor del ACREEDOR: El DEUDOR deberá mantener el valor de la prenda durante la vigencia del presente crédito, para lo cual se obliga a realizar las sustituciones o renovaciones de los bienes que fueren necesarias, todo a efecto de salvaguardar el derecho preferente sobre la prenda si los bienes en garantía se sustituyeses o deteriorases, al grado que no seas suficiente para garantizar la obligación del DEUDOR el ACREEDOR tendrá derecho a exigir mejoras en la garantía, y si el DEUDOR no se allanare a ello, o no pudiere cumplir con tal requisito vencerá el plazo de este contrato y la obligación se volverá exigible en su totalidad como de plazo vencido El ACREEDOR en cualquier momento durante la vigencia del presente crédito podrá inspeccionar y revisar dichos bienes, por medio de sus empleados y si encontrare deficiencia, podrá exigir que se corrijan los defectos y El DEUDOR se obliga por este medio a aceptar la reclamación del ACREEDOR.'
                        ],
                        margin: [0, 0, 0, 20],
                        alignment: 'justify',
                        lineHeight: 1.3
                    },

                    // INFORMACIÓN ADICIONAL DEL CLIENTE
                    {
                        text: 'INFORMACIÓN DEL DEUDOR:',
                        fontSize: 12,
                        bold: true,
                        margin: [0, 20, 0, 10]
                    },

                    {
                        table: {
                            widths: ['30%', '70%'],
                            body: [
                                [{ text: 'Nombre Completo:', bold: true }, nombreCompleto.toUpperCase()],
                                [{ text: 'DUI:', bold: true }, dui],
                                [{ text: 'NIT:', bold: true }, nit || 'No proporcionado'],
                                [{ text: 'Edad:', bold: true }, edad ? `${edad} años` : 'No especificada'],
                                [{ text: 'Dirección:', bold: true }, direccion || 'No especificada'],
                                [{ text: 'Departamento:', bold: true }, departamento || 'No especificado'],
                                [{ text: 'Teléfono:', bold: true }, telefono || 'No proporcionado'],
                                [{ text: 'Celular:', bold: true }, celular || 'No proporcionado']
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    },

                    // RESUMEN DEL CRÉDITO
                    {
                        text: 'RESUMEN DEL CRÉDITO:',
                        fontSize: 12,
                        bold: true,
                        margin: [0, 20, 0, 10]
                    },

                    {
                        table: {
                            widths: ['40%', '60%'],
                            body: [
                                [{ text: 'Monto Principal:', bold: true }, `$ ${monto.toFixed(2)}`],
                                [{ text: 'Tasa de Interés:', bold: true }, `${tasa.toFixed(1)}% mensual`],
                                [{ text: 'Interés Total:', bold: true }, `$ ${montoInteres.toFixed(2)}`],
                                [{ text: 'Recargo Domicilio:', bold: true }, `$ ${montoDomicilio.toFixed(2)}`],
                                [{ text: 'Total a Pagar:', bold: true }, `$ ${montoTotal.toFixed(2)}`],
                                [{ text: 'Número de Cuotas:', bold: true }, `${numCuotas} cuotas`],
                                [{ text: 'Cuota Mensual:', bold: true }, `$ ${cuotaMensual.toFixed(2)}`]
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 30]
                    },

                    // FIRMAS FINALES
                    {
                        text: [
                            'En fe de lo cual firmamos el presente instrumento en la ciudad de SONSONATE a los ',
                            { text: dia.toString(), decoration: 'underline' },
                            ' días del mes de ',
                            { text: mes.toUpperCase(), decoration: 'underline' },
                            ' del año ',
                            { text: año.toString(), decoration: 'underline' }
                        ],
                        margin: [0, 0, 0, 40],
                        alignment: 'justify'
                    },

                    {
                        columns: [
                            {
                                stack: [
                                    { text: 'F_____________________________________', margin: [0, 20, 0, 5] },
                                    { text: 'EL DEUDOR', bold: true, alignment: 'center' },
                                    { text: nombreCompleto.toUpperCase(), alignment: 'center' }
                                ],
                                width: '50%'
                            },
                            {
                                stack: [
                                    { text: 'F_____________________________________', margin: [0, 20, 0, 5] },
                                    { text: 'EL ACREEDOR', bold: true, alignment: 'center' },
                                    { text: 'CREDI-EXPRESS DE EL SALVADOR', alignment: 'center', fontSize: 8 }
                                ],
                                width: '50%'
                            }
                        ]
                    }
                ]
            };

            // Generar y descargar el PDF
            setTimeout(() => {
                const nombreArchivo = `Pagare_${solicitud.id}_${nombreCompleto.replace(/\s+/g, '_')}_${dui}`;
                pdfMake.createPdf(docDefinition).download(`${nombreArchivo}.pdf`);

                Swal.fire({
                    title: '¡Pagaré Generado! 📄',
                    html: `
                    <div class="text-center">
                        <div class="alert alert-success mb-3">
                            <i class="fas fa-file-pdf fa-3x text-danger mb-2"></i><br>
                            <strong>El documento PDF se ha generado exitosamente</strong>
                        </div>
                        <p><strong>Solicitud N°:</strong> ${solicitud.id}</p>
                        <p><strong>Cliente:</strong> ${nombreCompleto}</p>
                        <p><strong>DUI:</strong> ${dui}</p>
                        <p><strong>Monto:</strong> $ ${monto.toFixed(2)}</p>
                    </div>
                `,
                    icon: 'success',
                    confirmButtonColor: '#198754',
                    confirmButtonText: '<i class="fas fa-check me-1"></i> Entendido',
                    width: '500px'
                });
            }, 1000);

        } catch (error) {
            console.error('Error generando PDF:', error);
            Swal.fire({
                title: 'Error al Generar PDF',
                text: 'Ocurrió un error al generar el documento. Intente nuevamente.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    }

});

