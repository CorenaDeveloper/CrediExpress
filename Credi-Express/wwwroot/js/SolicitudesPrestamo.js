let tabla;
let solicitudActual = null;
let solicitudEditando = null;

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
                                } else if (row.detalleAprobado === "EN PROCESO") {
                                    return `<span class="badge badge-info">${row.detalleAprobado}</span>`;
                                } else if (row.detalleAprobado === "EN PROCESO (REENVIO)") {
                                    return `<span class="badge badge-warning">${row.detalleAprobado}</span>`
                                } else if (data && row.detalleAprobado === "DESEMBOLSADO") {
                                    return `<span class="badge badge-primary">${row.detalleAprobado}</span>`
                                } 
                                else {
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
        $('#btnImprimirManifiesto').hide();
    } else if (!rowData.aprobado && rowData.detalleAprobado === "RECHAZADO") {
        $('#seccionAprobacion').hide();
        $('#btnAprobar').hide();
        $('#btnRechazar').hide();
        $('#btnReenvio').show();
        $('#btnImprimirPagare').hide();
        $('#btnImprimirManifiesto').hide();
    } else if (!rowData.aprobado && rowData.detalleAprobado === "EN PROCESO (REENVIO)") {
        $('#seccionAprobacion').show();
        $('#btnAprobar').show();
        $('#btnRechazar').show();
        $('#btnReenvio').hide();
        $('#btnImprimirPagare').hide();
        $('#btnImprimirManifiesto').hide();
    }
    else if (rowData.aprobado) {
        $('#seccionAprobacion').hide();
        $('#btnAprobar').hide();
        $('#btnRechazar').hide();
        $('#btnReenvio').hide();
        $('#btnImprimirPagare').show();
        $('#btnImprimirManifiesto').show();
    } else {
        $('#seccionAprobacion').hide();
        $('#btnAprobar').hide();
        $('#btnRechazar').hide();
        $('#btnReenvio').show();
        $('#btnImprimirPagare').hide();
        $('#btnImprimirManifiesto').hide();
    }

    // Limpiar observaciones previas
    $('#observacionesAprobacion').val('');


    configurarBotonEditar(rowData);
    // Mostrar el modal
    $('#modalDetalleSolicitud').modal('show');
}


// ==================== CONFIGURAR BOTÓN EDITAR ====================
function configurarBotonEditar(rowData) {
    // Mostrar botón editar solo si la solicitud no está aprobada
    const puedeEditar = !rowData.aprobado;

    if (puedeEditar) {
        // Agregar botón editar si no existe
        if ($('#btnEditarSolicitud').length === 0) {
            const botonEditar = `
                <button type="button" class="btn btn-warning me-2" id="btnEditarSolicitud">
                    <i class="fas fa-edit me-1"></i>Modificar
                </button>
            `;
            // Insertar antes del botón aprobar o al inicio del footer
            if ($('#btnAprobar').length > 0) {
                $('#btnAprobar').before(botonEditar);
            } else {
                $('.modal-footer').prepend(botonEditar);
            }
        }
        $('#btnEditarSolicitud').show();
    } else {
        $('#btnEditarSolicitud').hide();
    }
}


// ==================== EVENTO BOTÓN EDITAR ====================
$(document).on('click', '#btnEditarSolicitud', function () {
    if (solicitudActual) {
        abrirModalEdicion(solicitudActual);
        $('#modalDetalleSolicitud').modal('hide');
    }
});

// ==================== ABRIR MODAL DE EDICIÓN ====================
function abrirModalEdicion(solicitudData) {
    solicitudEditando = solicitudData;

    // Llenar campos del modal
    $('#editNumSolicitud').text(solicitudData.id);
    $('#editNombreCliente').text(solicitudData.nombreCliente);
    $('#editIdSolicitud').val(solicitudData.id);
    $('#editMonto').val(solicitudData.monto);
    $('#editNumCuotas').val(solicitudData.numCoutas);
    $('#editTasa').val(solicitudData.tasa);
    $('#editTasaDomicilio').val(solicitudData.tasaDomicilio);
    $('#editMotivo').val('');

    // Calcular valores iniciales
    calcularValoresEdicion();

    // Mostrar modal
    $('#modalEditarSolicitud').modal('show');
}

// ==================== CALCULAR VALORES EN TIEMPO REAL ====================
function calcularValoresEdicion() {
    const monto = parseFloat($('#editMonto').val()) || 0;
    const tasaInteresMensual = parseFloat($('#editTasa').val()) || 0;
    const tasaDomicilio = parseFloat($('#editTasaDomicilio').val()) || 0;
    const cuotas = parseInt($('#editNumCuotas').val()) || 1;

    const tipoPrestamo = $('#txtTipoPrestamo').text().trim().toUpperCase();

    if (monto > 0 && cuotas > 0) {
        // Usar la misma lógica que calcularCuota()
        let baseInteres = 0;
        let interesxTiempo = 0;
        let baseDomicilio = 0;
        let domicilioxTiempo = 0;

        switch (tipoPrestamo.toUpperCase()) {
            case 'DIARIO':
                // Interés aplicado tasa diaria
                baseInteres = (tasaInteresMensual / 100) / cuotas;
                interesxTiempo = baseInteres * cuotas;
                // Domicilio aplicado a tasa diaria
                baseDomicilio = (tasaDomicilio / 100) / cuotas;
                domicilioxTiempo = baseDomicilio * cuotas;
                break;

            case 'SEMANAL':
                // Interés mensual equivalente a 4 semanas
                baseInteres = (tasaInteresMensual / 100) / 4;
                interesxTiempo = baseInteres * cuotas;
                // Domicilio mensual equivalente a 4 semanas
                baseDomicilio = (tasaDomicilio / 100) / 4;
                domicilioxTiempo = baseDomicilio * cuotas;
                break;

            case 'QUINCENAL':
                // Interés mensual equivalente a 2 semanas
                baseInteres = (tasaInteresMensual / 100) / 2;
                interesxTiempo = baseInteres * cuotas;
                // Domicilio mensual equivalente a 2 semanas
                baseDomicilio = (tasaDomicilio / 100) / 2;
                domicilioxTiempo = baseDomicilio * cuotas;
                break;

            case 'MENSUAL':
            default:
                // Interés mensual
                baseInteres = (tasaInteresMensual / 100) / 1;
                interesxTiempo = baseInteres * cuotas;
                // Domicilio 
                baseDomicilio = (tasaDomicilio / 100) / 1;
                domicilioxTiempo = baseDomicilio * cuotas;
                break;
        }

        // Total a pagar (igual que en calcularCuota)
        const interesTotal = interesxTiempo * monto;
        const domicilioTotal = domicilioxTiempo * monto;
        const totalAPagar = monto + interesTotal + domicilioTotal;
        const cuotaFinal = totalAPagar / cuotas;

        // Actualizar la vista
        $('#calcInteres').val(interesTotal.toFixed(2));
        $('#calcDomicilio').val(domicilioTotal.toFixed(2));
        $('#calcTotal').val(totalAPagar.toFixed(2));
        $('#calcCuota').val(cuotaFinal.toFixed(2));

    } else {
        $('#calcInteres').val('$0.00');
        $('#calcDomicilio').val('$0.00');
        $('#calcTotal').val('$0.00');
        $('#calcCuota').val('0.00');
    }
}




// Recalcular en tiempo real
$(document).on('input', '#editMonto, #editTasa, #editTasaDomicilio, #editNumCuotas', calcularValoresEdicion);


// ==================== GUARDAR CAMBIOS ====================
$(document).on('click', '#btnGuardarCambios', function () {

    const datosEdit = {
        idSolicitud: $('#editIdSolicitud').val(),
        monto: parseFloat($('#editMonto').val()),
        numCuotas: parseInt($('#editNumCuotas').val()),
        tasa: parseFloat($('#editTasa').val()),
        tasaDomicilio: parseFloat($('#editTasaDomicilio').val()),
        motivo: $('#editMotivo').val().trim(),
        montoCuota: parseFloat($('#calcCuota').val())
    };

    // Confirmar cambios
    Swal.fire({
        title: '¿Confirmar Modificaciones?',
        html: `
            <div class="text-start">
                <p><strong>Se modificarán:</strong></p>
                <ul>
                    <li>Monto: $${datosEdit.monto.toFixed(2)}</li>
                    <li>Cuotas: ${datosEdit.numCuotas}</li>
                    <li>Tasa Interés: ${datosEdit.tasa}%</li>
                    <li>Tasa Domicilio: ${datosEdit.tasaDomicilio}%</li>
                    <li>Monto Cuota: ${datosEdit.montoCuota}%</li>
                </ul>
                <p><strong>Motivo:</strong> ${datosEdit.motivo}</p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            guardarModificaciones(datosEdit);
        }
    });
});

// ==================== ENVIAR AL SERVIDOR ====================
function guardarModificaciones(datos) {
    Swal.fire({
        title: 'Guardando...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    $.ajax({
        url: '/Auxiliares/EditarSolicitudPrestamo',
        type: 'POST',
        data: datos,
        success: function (response) {
            if (response.success) {
                Swal.fire({
                    title: 'Éxito',
                    text: 'La solicitud ha sido actualizada',
                    icon: 'success'
                }).then(() => {
                    $('#modalEditarSolicitud').modal('hide');
                    $('#btnFiltrar').trigger('click'); // Recargar tabla
                });
            } else {
                Swal.fire('Error', response.message || 'Error al guardar', 'error');
            }
        },
        error: function (xhr, status, error) {
            Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
        }
    });
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
    // ==================== BOTÓN IMPRIMIR AUTORIZACION ====================
    $('#btnImprimirManifiesto').on('click', function () {
        if (solicitudActual) {
            generarManifiestoDomicilio(solicitudActual);
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

    // ==================== MEJORAR RECHAZO (OPCIONAL) ====================
    // Reemplazar tu evento del botón rechazar existente con este:
    $('#btnRechazar').off('click').on('click', function () {
        const numeroSolicitud = $('#modalNumSolicitud').text();
        const nombreCliente = $('#modalCliente').text();

        $('#modalDetalleSolicitud').modal('hide');

        $('#modalDetalleSolicitud').on('hidden.bs.modal', function () {
            $(this).off('hidden.bs.modal');
            setTimeout(() => {
                // Dar opción de modificar o rechazar directamente
                Swal.fire({
                    title: '¿Qué desea hacer?',
                    html: `
                    <p><strong>Solicitud:</strong> ${numeroSolicitud}</p>
                    <p><strong>Cliente:</strong> ${nombreCliente}</p>
                `,
                    icon: 'question',
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: 'Confirmar Rechazo',
                    cancelButtonText: 'Volver'
                }).then((result) => {
                    if (result.isConfirmed) {
                        mostrarAlertaRechazo(numeroSolicitud, nombreCliente);
                    }else {
                        $('#modalDetalleSolicitud').modal('show');
                    }
                });
            }, 200);
        });
    });

    // ==================== LIMPIAR AL CERRAR ====================
    $('#modalEditarSolicitud').on('hidden.bs.modal', function () {
        $('#formEditarSolicitud')[0].reset();
        solicitudEditando = null;
    });

    $('#modalDetalleSolicitud').on('hidden.bs.modal', function () {
        solicitudActual = null;
        $('#btnEditarSolicitud').remove(); // Limpiar botón dinámico
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

    // ==================== FUNCIÓN GENERAR AUTORIZACION PDF ====================

    function generarManifiestoDomicilio(solicitud) {
        // Mostrar loading
        Swal.fire({
            title: 'Generando Manifiesto...',
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
                crearManifiestoDomicilio(solicitud, clienteDetalle);
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
            const numCuotas = parseInt(solicitud.numCoutas || 1);
            const cuotaMensual = parseFloat(solicitud.cuotas || 0);

            const montoInteres = monto * (tasa / 100);
            const montoTotal = monto + montoInteres;

            // Obtener fecha actual para el pagaré
            const fechaActual = new Date();
            const dia = fechaActual.getDate();
            const mes = fechaActual.toLocaleString('es-ES', { month: 'long' });
            const año = fechaActual.getFullYear();

            // Calcular fecha de vencimiento (basada en el plazo del préstamo)
            const fechaVencimiento = new Date(fechaActual);
            fechaVencimiento.setDate(fechaVencimiento.getDate() + (numCuotas * 30));

            const diaVencimiento = fechaVencimiento.getDate();
            const mesVencimiento = fechaVencimiento.toLocaleString('es-ES', { month: 'long' });
            const añoVencimiento = fechaVencimiento.getFullYear();

            // DATOS DEL CLIENTE
            const nombreCompleto = `${clienteDetalle.nombre || ''} ${clienteDetalle.apellido || ''}`.trim();
            const dui = clienteDetalle.dui || '';
            const nit = clienteDetalle.nit || '';
            const direccion = clienteDetalle.direccion || '';
            const departamento = clienteDetalle.departamentoNombre || '';
            const edad = clienteDetalle.edad || '';
            const profesion = clienteDetalle.profesion || 'comerciante';

            // Convertir números a letras para el monto
            function numeroALetras(num) {
                const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
                const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
                const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
                const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

                if (num === 0) return 'CERO';

                let letras = '';
                let entero = Math.floor(num);

                if (entero >= 1000000) {
                    let millones = Math.floor(entero / 1000000);
                    letras += numeroALetras(millones) + ' MILLÓN ';
                    if (millones > 1) letras = letras.replace('MILLÓN', 'MILLONES');
                    entero = entero % 1000000;
                }

                if (entero >= 1000) {
                    let miles = Math.floor(entero / 1000);
                    if (miles === 1) {
                        letras += 'MIL ';
                    } else {
                        letras += numeroALetras(miles) + ' MIL ';
                    }
                    entero = entero % 1000;
                }

                if (entero >= 100) {
                    let cientos = Math.floor(entero / 100);
                    if (entero === 100) {
                        letras += 'CIEN ';
                    } else {
                        letras += centenas[cientos] + ' ';
                    }
                    entero = entero % 100;
                }

                if (entero >= 20) {
                    let dec = Math.floor(entero / 10);
                    let uni = entero % 10;
                    letras += decenas[dec];
                    if (uni > 0) {
                        letras += ' Y ' + unidades[uni];
                    }
                    letras += ' ';
                } else if (entero >= 10) {
                    letras += especiales[entero - 10] + ' ';
                } else if (entero > 0) {
                    letras += unidades[entero] + ' ';
                }

                return letras.trim();
            }

            const montoEnLetras = numeroALetras(monto);

            // CREAR DOCUMENTO PDF CON LA ESTRUCTURA EXACTA DEL PAGARÉ
            const docDefinition = {
                pageSize: 'LETTER',
                pageMargins: [40, 40, 40, 40],
                defaultStyle: {
                    fontSize: 11,
                    lineHeight: 1.4
                },
                content: [
                    // PRIMER PAGARÉ
                    {
                        text: 'PAGARE',
                        fontSize: 14,
                        bold: true,
                        alignment: 'left',
                        margin: [0, 0, 0, 20]
                    },
                    {
                        text: `POR $ ${monto.toFixed(2)}`,
                        fontSize: 12,
                        alignment: 'right',
                        margin: [0, -40, 0, 20]
                    },
                    {
                        text: [
                            'YO ',
                            { text: nombreCompleto, decoration: 'underline' },
                            ', de ',
                            { text: edad.toString(), decoration: 'underline' },
                            ' años de edad, domicilio del distrito ',
                            { text: direccion, decoration: 'underline' },
                            ', municipio de ',
                            { text: departamento, decoration: 'underline' },
                            ', de profesión u oficio ',
                            { text: profesion },
                            ', con Documento Único de Identidad homologado con mi número de identificación tributaria ',
                            { text: nit, decoration: 'underline' },
                            ' por este medio PAGARE, me obligo a pagar incondicionalmente a la orden de CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE, del domicilio de SONSONATE, la cantidad de ',
                            { text: montoEnLetras, decoration: 'underline' },
                            ' Dólares de los Estados Unidos de América (US$ ',
                            { text: monto.toFixed(2), decoration: 'underline' },
                            '), cantidad que devengara un interés nominal de ',
                            { text: tasa.toString(), decoration: 'underline' },
                            ' POR CIENTO MENSUAL (',
                            { text: tasa.toString() + '%', decoration: 'underline' },
                            ') En caso de mora en el cumplimiento de mi obligación reconoceré el interés moratorio del TRES POR CIENTO MENSUAL (3%) señalo como domicilio especial el de la ciudad de Sonsonate a cuyos tribunales me someto siendo a mi cargo cualquier gasto que la sociedad CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE, hiciere en el cobro de deuda, inclusive los llamados personales y aun cuando no depositare haya condenación en costas y faculto a la sociedad CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE, para que designe la depositaria de los bienes que se embarguen a quien releva de la obligación de rendir fianza en la ciudad de SONSONATE a los ',
                            { text: dia.toString(), decoration: 'underline' },
                            ' días del mes de ',
                            { text: mes, decoration: 'underline' },
                            ' del año ',
                            { text: año.toString(), decoration: 'underline' }
                        ],
                        fontSize: 11,
                        alignment: 'justify',
                        lineHeight: 1.4,
                        margin: [0, 0, 0, 30]
                    },
                    // Firmas del primer pagaré
                    {
                        columns: [
                            {
                                width: '50%',
                                text: [
                                    'F',
                                    { text: '                                   ', decoration: 'underline' },
                                    '\nNOMBRE DEL DEUDOR: \n',
                                    { text: nombreCompleto, decoration: 'underline' }
                                ],
                                fontSize: 10
                            },
                            {
                                width: '50%',
                                text: [
                                    'POR AVAL F',
                                    { text: '                                   ', decoration: 'underline' },
                                    '\nNOMBRE DEL AVALISTA: ',
                                    { text: '                                   ', decoration: 'underline' },
                                    '\nDUI: ',
                                    { text: '                                      ', decoration: 'underline' },
                                    '\nNIT: ',
                                    { text: '                                      ', decoration: 'underline' }
                                ],
                                fontSize: 10
                            }
                        ],
                        margin: [0, 0, 0, 40]
                    },
                    //Salto de página
                    {
                        text: '',
                        pageBreak: 'before'
                    },
                    // SEGUNDO DOCUMENTO (CONTRATO)
                    {
                        text: [
                            'YO ',
                            { text: nombreCompleto, decoration: 'underline' },
                            ', de ',
                            { text: edad.toString(), decoration: 'underline' },
                            ' años, ',
                            { text: profesion },
                            ', domicilio del distrito ',
                            { text: direccion, decoration: 'underline' },
                            ' municipio de ',
                            { text: departamento, decoration: 'underline' },
                            ' portador de mi Documento Único de Identidad homologado con mi número de identificación tributaria ',
                            { text: nit, decoration: 'underline' },
                            ' quien en este documento me denominaré "EL DEUDOR", OTORGO:'
                        ],
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 15]
                    },

                    // Cláusulas del contrato
                    {
                        text: [
                            'I) MONTO: que recibo a título de MUTUO de CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE Que en adelante se denominare EL ACREEDOR La suma de ',
                            { text: montoEnLetras, decoration: 'underline' },
                            ' Dólares de los Estados Unidos de América'
                        ],
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: 'II) DESTINO: El deudor destinara la cantidad recibida para capital de trabajo.',
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: [
                            'III) PLAZO: El deudor se obliga a pagar dicha suma dentro del plazo de ',
                            { text: (numCuotas * 30).toString(), decoration: 'underline' },
                            ' DIAS contados a partir de esta fecha, plazo que vence el día ',
                            { text: `${diaVencimiento} de ${mesVencimiento} de ${añoVencimiento}`, decoration: 'underline' }
                        ],
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: 'IV) FORMA DE PAGO: El Deudor podrá amortizar a la deuda en cualquier momento antes del vencimiento del plazo',
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: [
                            'V) INTERESES: El Deudor pagara sobre la suma mutuada el interés del ',
                            { text: tasa.toString() + '%', decoration: 'underline' },
                            ' mensual sobre saldos, pagadero al vencimiento del plazo antes mencionado los cuales se mantendrán fijos durante el plazo del presente crédito más un recargo por cobranza a domicilio de (US$',
                            { text: '    ', decoration: 'underline' },
                            ') Todo cálculo de intereses se hará sobre la base de un año calendario, por el actual número de días hasta el pago del crédito incluyendo el primero y excluyendo el ultimo día que ocurra durante el periodo en que dichos intereses deben pagarse. En caso de mora sin perjuicio del derecho del ACREEDOR a entablar acción ejecutiva, la tasa de interés se aumentara en tres puntos porcentuales por arriba de la tasa vigente y se calculara sobre saldos de capital en mora, sin que ello signifique prórroga del plazo y sin perjuicio de los demás efectos legales de la mora'
                        ],
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: 'VI) LUGAR E IMPUTACION DE PAGOS: Todo pago será recibido en el domicilio del negocio del DEUDOR, se imputara primeramente a intereses, luego a los recargos y el saldo remanente, si lo hubiere al capital.',
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: 'VII) PROCEDENCIA DE LOS FONDOS: Los fondos provenientes de este crédito son propios de CREDI-EXPRESS DE EL SALVADOR SOCIEDAD ANONIMA DE CAPITAL VARIABLE: Las partes declaran que tanto el efectivo recibido o cualquier otro medio de pago, con el que el Deudor pagara su obligación crediticia tiene procedencia LICITA',
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: 'VIII) CADUCIDAD DEL PLAZO: La obligación se volverá exigible inmediatamente y en su totalidad al final del plazo establecido en este contrato y por incumplimiento por parte del Deudor en cualquiera de las obligaciones que ha contraído por medio de este instrumento, también podrá exigirse el pago total por acción judicial contra el DEUDOR iniciada por terceros o por el mismo ACREEDOR',
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: 'IX) HONORARIOS Y GASTOS: Serán por cuenta del DEUDOR los gastos honorarios de este instrumento, así como todos los gastos en que el ACREEDOR tenga que incurrir para el cobro de mismo',
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: 'X) DOMICILIO Y RENUNCIAS: Para los efectos legales de este contrato, el DEUDOR señala la ciudad de Sonsonate como domicilio especial, a la jurisdicción de cuyos tribunales judiciales se someten expresamente. El ACREEDOR: será depositario de los bienes que se embarquen, sin la obligación de rendir fianza quien podra designar un representante para tal efecto',
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },

                    {
                        text: 'XI) GARANTIAS: PRENDARIA, En garantía de la presente obligación EL DEUDOR constituirá PRENDA SIN DESPLAZAMIENTO a favor del ACREEDOR sobre los bienes descritos en el anexo 1 de este instrumento, el cual ha sido firmado por él y por agente del ACREEDOR y que forma parte del presente instrumento los bienes prendados radicaran en un inmueble ubicado en el domicilio del DEUDOR. La prenda que constituirá EL DEUDOR a favor del ACREEDOR, Estará vigente durante el plazo del presente contrato y mientras existan saldos pendientes de pago a cargo del DEUDOR y a favor del ACREEDOR: El DEUDOR deberá mantener el valor de la prenda durante la vigencia del presente crédito, para lo cual se obliga a realizar las sustituciones o renovaciones de los bienes que fueren necesarias, todo a efecto de salvaguardar el derecho preferente sobre la prenda si los bienes en garantía se sustituyeses o deteriorases, al grado que no seas suficiente para garantizar la obligación del DEUDOR el ACREEDOR tendrá derecho a exigir mejoras en la garantía, y si el DEUDOR no se allanare a ello, o no pudiere cumplir con tal requisito vencerá el plazo de este contrato y la obligación se volverá exigible en su totalidad como de plazo vencido El ACREEDOR en cualquier momento durante la vigencia del presente crédito podrá inspeccionar y revisar dichos bienes, por medio de sus empleados y si encontrare deficiencia, podrá exigir que se corrijan los defectos y El DEUDOR se obliga por este medio a aceptar la reclamación del ACREEDOR.',
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 20]
                    },

                    // Firma final
                    {
                        text: [
                            'En fe de lo cual firmamos el presente instrumento en la ciudad de SONSONATE a los ',
                            { text: dia.toString(), decoration: 'underline' },
                            ' días del mes de ',
                            { text: mes, decoration: 'underline' },
                            ' del año ',
                            { text: año.toString(), decoration: 'underline' }
                        ],
                        fontSize: 11,
                        alignment: 'justify',
                        margin: [0, 0, 0, 30]
                    },

                    {
                        text: [
                            'F',
                            { text: '                                      ', decoration: 'underline' }
                        ],
                        fontSize: 10,
                        alignment: 'center'
                    }
                ]
            };

            // Generar y mostrar PDF
            pdfMake.createPdf(docDefinition).getDataUrl((dataUrl) => {
                Swal.close();

                Swal.fire({
                    title: 'Pagaré Generado',
                    html: `
                    <div class="mb-3">
                        <iframe src="${dataUrl}" width="100%" height="400px"></iframe>
                    </div>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-primary" onclick="window.open('${dataUrl}')">
                            <i class="fas fa-external-link-alt me-1"></i>Abrir en nueva pestaña
                        </button>
                    </div>
                `,
                    width: '80%',
                    showConfirmButton: false,
                    showCloseButton: true
                });
            });

        } catch (error) {
            console.error('Error generando pagaré:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al generar el pagaré PDF: ' + error.message,
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }

    }

    // FUNCIÓN PARA CREAR EL MANIFIESTO DE COBRO A DOMICILIO
    function crearManifiestoDomicilio(solicitud, clienteDetalle) {
        try {
            // Obtener fecha actual para el manifiesto
            const fechaActual = new Date();
            const dia = fechaActual.getDate();
            const mes = fechaActual.toLocaleString('es-ES', { month: 'long' });
            const año = fechaActual.getFullYear();

            // DATOS DEL CLIENTE
            const nombreCompleto = `${clienteDetalle.nombre || ''} ${clienteDetalle.apellido || ''}`.trim();
            const dui = clienteDetalle.dui || '';
            const nit = clienteDetalle.nit || '';
            const direccion = clienteDetalle.direccion || '';
            const departamento = clienteDetalle.departamentoNombre || '';
            const edad = clienteDetalle.edad || '';
            const profesion = clienteDetalle.profesion || 'Comerciante';

            // CREAR DOCUMENTO PDF DEL MANIFIESTO
            const docDefinition = {
                pageSize: 'LETTER',
                pageMargins: [60, 60, 60, 60],
                defaultStyle: {
                    fontSize: 12,
                    lineHeight: 1.5,
                    alignment: 'justify'
                },
                content: [
                    // Encabezado del manifiesto
                    {
                        text: [
                            'Yo, ',
                            { text: nombreCompleto, decoration: 'underline' },
                            ', de ',
                            { text: edad.toString(), decoration: 'underline' },
                            ' años de edad, ',
                            { text: profesion },
                            ', del domicilio del Distrito de ',
                            { text: direccion, decoration: 'underline' },
                            ', Municipio de ',
                            { text: departamento, decoration: 'underline' },
                            ', departamento de ',
                            { text: departamento, decoration: 'underline' },
                            ', con mi Documento Único de Identidad homologado con mi Número de Identificación Tributaria número ',
                            { text: nit, decoration: 'underline' },
                            '; por medio de la presente ',
                            { text: 'MANIFIESTO:', bold: true }
                        ],
                        margin: [0, 0, 0, 30]
                    },

                    // Cuerpo principal del manifiesto
                    {
                        text: [
                            'Que por éste medio ',
                            { text: 'AUTORIZO EXPRESAMENTE', bold: true },
                            ' a La Sociedad ',
                            { text: 'CREDI EXPRESS DE EL SALVADOR, SOCIEDAD ANÓNIMA DE CAPITAL VARIABLE,', bold: true },
                            ' que se abrevia ',
                            { text: '"CREDI EXPRESS DE EL SALVADOR, S.A. DE C.V.",', bold: true },
                            ' del domicilio de la ciudad y departamento de Sonsonate, hoy Distrito de Sonsonate, Municipio de Sonsonate Centro, departamento de Sonsonate, con Número de Identificación Tributaria cero seiscientos catorce - ciento ochenta mil novecientos quince - ciento dos - cero; para que se hagan a domicilio, las gestiones de cobro de las cuotas de pago de mi crédito, gestión que genera un cargo adicional a la referida cuota, las cuales autorizo que sean cargadas a mi cuota de pago.-'
                        ],
                        margin: [0, 0, 0, 30]
                    },

                    // Lugar y fecha
                    {
                        text: [
                            'En el Distrito de ',
                            { text: direccion, decoration: 'underline' },
                            ', Municipio de ',
                            { text: departamento, decoration: 'underline' },
                            ', departamento de ',
                            { text: departamento, decoration: 'underline' },
                            ', a los ',
                            { text: dia.toString(), decoration: 'underline' },
                            ' días del mes de ',
                            { text: mes, decoration: 'underline' },
                            ' del año dos mil ',
                            { text: año.toString().slice(-2), decoration: 'underline' },
                            '.-'
                        ],
                        margin: [0, 0, 0, 80]
                    },

                    // Espacio para firma
                    {
                        text: [
                            'F.',
                            { text: '                                 ', decoration: 'underline' }
                        ],
                        alignment: 'center',
                        fontSize: 12
                    }
                ]
            };

            // Generar y mostrar PDF
            pdfMake.createPdf(docDefinition).getDataUrl((dataUrl) => {
                Swal.close();

                Swal.fire({
                    title: 'Autorización Generado',
                    html: `
                    <div class="mb-3">
                        <iframe src="${dataUrl}" width="100%" height="400px"></iframe>
                    </div>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-primary" onclick="window.open('${dataUrl}')">
                            <i class="fas fa-external-link-alt me-1"></i>Abrir en nueva pestaña
                        </button>
                    </div>
                `,
                    width: '80%',
                    showConfirmButton: false,
                    showCloseButton: true
                });
            });

        } catch (error) {
            console.error('Error generando manifiesto:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al generar el manifiesto PDF: ' + error.message,
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    }
});

