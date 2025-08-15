// ========================================================================================
// LIQUIDACION.JS - Sistema de Liquidación de Préstamos (VERSIÓN OPTIMIZADA)
// ========================================================================================

$(document).ready(function () {
    // Variables globales
    let prestamoActual = null;
    let saldoPendiente = 0;
    let totalInteresPendiente = 0;

    // Inicializar fecha actual
    $('#fechaActual').text(new Date().toLocaleDateString('es-ES'));

    // Event listeners
    $('#btnBuscarPrestamo').click(buscarPrestamo);
    $('#numeroPrestamo').keypress(function (e) {
        if (e.which === 13) buscarPrestamo();
    });

    $('#btnConfirmarLiquidacion').click(confirmarLiquidacion);
    $('#btnLimpiar').click(limpiarFormulario);

    // Enfocar en el campo de búsqueda
    $('#numeroPrestamo').focus();
});

// ===== FUNCIÓN PRINCIPAL: BUSCAR PRÉSTAMO =====
function buscarPrestamo() {
    const numeroPrestamo = $('#numeroPrestamo').val().trim();

    if (!numeroPrestamo) {
        mostrarError('Por favor ingrese el número de préstamo');
        return;
    }

    if (!/^\d+$/.test(numeroPrestamo)) {
        mostrarError('El número de préstamo debe ser numérico');
        return;
    }

    // Mostrar loading
    mostrarLoading('Buscando información del préstamo...');

    // Buscar préstamo directamente por ID
    $.get(`/Auxiliares/GetPrestamoById`, { idPrestamo: numeroPrestamo })
        .done(function (response) {
            ocultarLoading();

            if (!response.success) {
                mostrarError(response.message || 'Préstamo no encontrado');
                return;
            }

            // Verificar si se puede liquidar
            if (!response.estadisticas.puedeSerLiquidado) {
                mostrarError(response.estadisticas.razonNoLiquidable || 'Este préstamo no puede ser liquidado');
                return;
            }

            // Guardar datos globales
            prestamoActual = response.prestamo;
            saldoPendiente = response.estadisticas.saldoCapital;
            totalInteresPendiente = response.estadisticas.interesPendiente;

            // Mostrar información del préstamo
            mostrarInformacionPrestamo(response);

            // Mostrar secciones
            $('#seccionResultado, #seccionHistorial, #seccionLiquidacion').show();

        })
        .fail(function (xhr, status, error) {
            ocultarLoading();
            mostrarError('Error al buscar el préstamo: ' + error);
        });
}

// ===== MOSTRAR INFORMACIÓN COMPLETA DEL PRÉSTAMO =====
function mostrarInformacionPrestamo(response) {
    const prestamo = response.prestamo;
    const estadisticas = response.estadisticas;
    console.log(response);
    // Información básica del préstamo
    $('#prestamoId').text(prestamo.id);
    $('#prestamoCliente').text(prestamo.nombreCliente || 'Cliente no especificado');
    $('#prestamoMonto').text('$' + formatNumber(prestamo.monto || 0));
    $('#prestamoFecha').text(formatearFecha(prestamo.fecha));
    $('#prestamoTipo').text(prestamo.tipoPrestamo || 'No especificado');
    $('#prestamoCuotas').text((prestamo.numCoutas || 0) + ' cuotas');
    $('#prestamoCuotaMensual').text('$' + formatNumber(prestamo.cuotas || 0));
    $('#prestamoTasa').text((prestamo.tasa || 0) + '%');

    // Estadísticas de pagos
    $('#estadoCuotasPagadas').text(estadisticas.cuotasPagadas);
    $('#estadoCuotasPendientes').text(estadisticas.cuotasPendientes);
    $('#estadoCapitalPagado').text('$' + formatNumber(estadisticas.capitalPagado));
    $('#estadoSaldoPendiente').text('$' + formatNumber(estadisticas.saldoCapital));
    $('#estadoInteresPendiente').text('$' + formatNumber(estadisticas.interesPendiente));

    // Progreso visual
    const porcentajePagado = estadisticas.porcentajePagado || 0;
    $('#progressBar').css('width', porcentajePagado + '%').text(Math.round(porcentajePagado) + '%');

    // Llenar tabla de historial
    llenarHistorialPagos(response.historialPagos);

    // Mostrar cálculo de liquidación
    mostrarCalculoLiquidacion(estadisticas);
}

// ===== LLENAR TABLA DE HISTORIAL DE PAGOS =====
function llenarHistorialPagos(historialPagos) {
    const tbody = $('#tablaHistorial tbody');
    tbody.empty();

    if (!historialPagos || historialPagos.length === 0) {
        tbody.append(`
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-2x mb-2"></i><br>
                    No se encontraron pagos registrados
                </td>
            </tr>
        `);
        return;
    }

    // Filtrar solo los pagos válidos (no desembolsos)
    const pagosValidos = historialPagos.filter(pago => pago.tipoMovimiento !== 'DESEMBOLSO');

    if (pagosValidos.length === 0) {
        tbody.append(`
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-info-circle fa-2x mb-2"></i><br>
                    Solo se encontró el registro de desembolso
                </td>
            </tr>
        `);
        return;
    }

    // Agregar filas de pagos
    pagosValidos.forEach(pago => {
        const esLiquidacion = pago.numeroPago === 999;
        const estadoClass = esLiquidacion ? 'bg-info text-white' : 'bg-success text-white';
        const estadoTexto = esLiquidacion ? 'LIQUIDACIÓN' : 'PAGADO';
        const iconoEstado = esLiquidacion ? '<i class="fas fa-hand-holding-usd"></i>' : '<i class="fas fa-check-circle"></i>';

        tbody.append(`
            <tr class="${estadoClass}">
                <td class="text-center fw-bold">
                    ${esLiquidacion ? 'LIQ' : (pago.numeroPago || '-')}
                </td>
                <td>
                    <div>${formatearFecha(pago.fechaPago)}</div>
                    ${pago.fechaCuota ? `<small class="text-light opacity-75">Cuota: ${formatearFecha(pago.fechaCuota)}</small>` : ''}
                </td>
                <td class="text-end fw-bold">$${formatNumber(pago.monto || 0)}</td>
                <td class="text-end">$${formatNumber(pago.capital || 0)}</td>
                <td class="text-end">$${formatNumber(pago.interes || 0)}</td>
                <td class="text-end">$${formatNumber(pago.mora || 0)}</td>
                <td class="text-center">
                    ${iconoEstado}
                    <div class="small">${estadoTexto}</div>
                </td>
            </tr>
        `);
    });

    // Agregar fila de totales
    const totalMonto = pagosValidos.reduce((sum, p) => sum + (p.monto || 0), 0);
    const totalCapital = pagosValidos.reduce((sum, p) => sum + (p.capital || 0), 0);
    const totalInteres = pagosValidos.reduce((sum, p) => sum + (p.interes || 0), 0);
    const totalMora = pagosValidos.reduce((sum, p) => sum + (p.mora || 0), 0);

    tbody.append(`
        <tr class="table-dark">
            <td class="text-center fw-bold">TOTAL</td>
            <td class="fw-bold">${pagosValidos.length} pagos</td>
            <td class="text-end fw-bold">$${formatNumber(totalMonto)}</td>
            <td class="text-end fw-bold">$${formatNumber(totalCapital)}</td>
            <td class="text-end fw-bold">$${formatNumber(totalInteres)}</td>
            <td class="text-end fw-bold">$${formatNumber(totalMora)}</td>
            <td class="text-center">
                <i class="fas fa-calculator"></i>
            </td>
        </tr>
    `);
}

// ===== MOSTRAR CÁLCULO DE LIQUIDACIÓN =====
function mostrarCalculoLiquidacion(estadisticas) {
    // Actualizar campos de liquidación
    $('#liquidacionCapital').text('$' + formatNumber(estadisticas.saldoCapital));
    $('#liquidacionInteres').text('$' + formatNumber(estadisticas.interesPendiente));
    $('#liquidacionDescuento').text('$' + formatNumber(estadisticas.descuentoInteres));
    $('#liquidacionInteresDescuento').text('$' + formatNumber(estadisticas.interesConDescuento));
    $('#liquidacionTotal').text('$' + formatNumber(estadisticas.totalLiquidacion));

    // Actualizar campo de ahorro
    $('#ahorroDescuento').text('$' + formatNumber(estadisticas.ahorroCliente));

    // Llenar campo oculto
    $('#montoLiquidacion').val(estadisticas.totalLiquidacion.toFixed(2));

    // Habilitar botón de confirmación
    $('#btnConfirmarLiquidacion').prop('disabled', false);
}

// ===== CONFIRMAR LIQUIDACIÓN =====
function confirmarLiquidacion() {
    if (!prestamoActual) {
        mostrarError('No hay un préstamo seleccionado');
        return;
    }

    const observaciones = $('#observacionesLiquidacion').val().trim();
    if (!observaciones) {
        mostrarError('Por favor ingrese las observaciones de la liquidación');
        return;
    }

    if (observaciones.length < 10) {
        mostrarError('Las observaciones deben tener al menos 10 caracteres');
        return;
    }

    // Mostrar confirmación
    Swal.fire({
        title: '¿Confirmar Liquidación?',
        html: `
            <div class="text-start">
                <p><strong>Préstamo #:</strong> ${prestamoActual.id}</p>
                <p><strong>Cliente:</strong> ${prestamoActual.nombreCliente}</p>
                <p><strong>Capital pendiente:</strong> <span class="text-primary fw-bold">$${formatNumber(saldoPendiente)}</span></p>
                <p><strong>Interés con descuento:</strong> <span class="text-info fw-bold">$${formatNumber(totalInteresPendiente * 0.9)}</span></p>
                <p><strong>Monto total a liquidar:</strong> <span class="text-success fw-bold">$${$('#liquidacionTotal').text().replace('$', '').replace(',', '')}</span></p>
                <p><strong>Observaciones:</strong> ${observaciones}</p>
            </div>
            <div class="alert alert-warning mt-3">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Esta acción <strong>liquidará completamente el préstamo</strong> y no se puede deshacer.
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, Liquidar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#dc3545',
        width: '600px'
    }).then((result) => {
        if (result.isConfirmed) {
            procesarLiquidacion();
        }
    });
}

// ===== PROCESAR LIQUIDACIÓN =====
function procesarLiquidacion() {
    const montoLiquidacion = parseFloat($('#montoLiquidacion').val());
    const observaciones = $('#observacionesLiquidacion').val().trim();

    // Mostrar loading
    mostrarLoading('Procesando liquidación...');

    const formData = new FormData();
    formData.append('IdPrestamo', prestamoActual.id);
    formData.append('MontoTotal', montoLiquidacion);
    formData.append('Observaciones', observaciones);
    formData.append('MetodoPago', 'LIQUIDACION_TOTAL');

    $.ajax({
        url: '/Auxiliares/ProcesarLiquidacionTotal',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
            ocultarLoading();

            if (response.success) {
                // Mostrar éxito con detalles completos
                Swal.fire({
                    title: '¡Liquidación Exitosa!',
                    html: `
                        <div class="text-start">
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle me-2"></i>
                                <strong>El préstamo ha sido liquidado completamente</strong>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-primary">Información del Préstamo:</h6>
                                    <p><strong>Número:</strong> ${response.data.numeroPrestamo}</p>
                                    <p><strong>Cliente:</strong> ${response.data.cliente}</p>
                                    <p><strong>Monto Original:</strong> $${formatNumber(response.data.montoOriginal)}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-success">Detalles de Liquidación:</h6>
                                    <p><strong>Capital Pendiente:</strong> $${formatNumber(response.data.capitalPendiente)}</p>
                                    <p><strong>Interés con Descuento:</strong> $${formatNumber(response.data.interesConDescuento)}</p>
                                    <p class="text-success"><strong>Descuento Aplicado:</strong> $${formatNumber(response.data.descuentoAplicado)}</p>
                                </div>
                            </div>
                            
                            <hr>
                            <div class="text-center">
                                <h5 class="text-success">
                                    <strong>Total Liquidado: $${formatNumber(response.data.totalLiquidado)}</strong>
                                </h5>
                                <p class="text-muted">Fecha: ${new Date(response.data.fechaLiquidacion).toLocaleString()}</p>
                                <p class="text-success">
                                    <i class="fas fa-gift me-1"></i>
                                    Ahorro del cliente: $${formatNumber(response.data.ahorroCliente)}
                                </p>
                            </div>
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonText: 'Aceptar',
                    width: '600px'
                }).then(() => {
                    limpiarFormulario();
                });
            } else {
                mostrarError(response.message || 'Error al procesar la liquidación');
            }
        },
        error: function (xhr, status, error) {
            ocultarLoading();
            mostrarError('Error de conexión al procesar la liquidación');
        }
    });
}

// ===== LIMPIAR FORMULARIO =====
function limpiarFormulario() {
    prestamoActual = null;
    saldoPendiente = 0;
    totalInteresPendiente = 0;

    $('#numeroPrestamo, #observacionesLiquidacion, #montoLiquidacion').val('');
    $('#seccionResultado, #seccionHistorial, #seccionLiquidacion').hide();
    $('#btnConfirmarLiquidacion').prop('disabled', true);
    $('#numeroPrestamo').focus();
}

// ===== FUNCIONES AUXILIARES =====
function mostrarLoading(mensaje) {
    $('#loadingOverlay').show();
    $('#loadingOverlay .loading-message').text(mensaje);
}

function ocultarLoading() {
    $('#loadingOverlay').hide();
}

function mostrarError(mensaje) {
    Swal.fire({
        title: 'Error',
        text: mensaje,
        icon: 'error',
        confirmButtonText: 'Aceptar'
    });
}

function formatNumber(number) {
    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number || 0);
}

function formatearFecha(fecha) {
    if (!fecha) return '-';

    if (typeof fecha === 'string') {
        const parts = fecha.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }

    return fecha;
}