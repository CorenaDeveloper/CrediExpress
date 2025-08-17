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

    console.log('📋 Mostrando información del préstamo:', prestamo);
    console.log('📊 Estadísticas:', estadisticas);

    // Información básica del préstamo
    $('#prestamoId').text(prestamo.id);
    $('#prestamoCliente').text(prestamo.nombreCliente || 'Cliente no especificado');
    $('#prestamoMonto').text('$' + formatNumber(prestamo.monto || 0));
    $('#prestamoFecha').text(prestamo.fecha || 'Sin fecha');
    $('#prestamoTipo').text(prestamo.tipoPrestamo || 'NORMAL');
    $('#prestamoCuotas').text((prestamo.numCoutas || 0) + ' cuotas');
    $('#prestamoCuotaMensual').text('$' + formatNumber(prestamo.cuotas || 0));
    $('#prestamoTasa').text((prestamo.tasa || 0) + '%');

    // Estadísticas de pagos
    $('#estadoCuotasPagadas').text(estadisticas.cuotasPagadas || 0);
    $('#estadoCuotasPendientes').text(estadisticas.cuotasPendientes || 0);
    $('#estadoCapitalPagado').text('$' + formatNumber(estadisticas.capitalPagado || 0));
    $('#estadoInteresPagado').text('$' + formatNumber(estadisticas.interesPagado || 0));
    $('#estadoTotalPagado').text('$' + formatNumber(estadisticas.totalPagado || 0));
    $('#estadoPorcentajePagado').text((estadisticas.porcentajePagado || 0).toFixed(1) + '%');

    // Información de liquidación
    mostrarCalculosLiquidacion(estadisticas);

    // Mostrar historial de pagos si existe
    if (response.historialPagos && response.historialPagos.length > 0) {
        mostrarHistorialPagos(response.historialPagos);
    }
}

// ===== MOSTRAR CÁLCULOS DE LIQUIDACIÓN =====
function mostrarCalculosLiquidacion(estadisticas) {
    console.log('💰 Calculando liquidación con estadísticas:', estadisticas);

    // Llenar valores en el resumen financiero
    $('#capitalPendiente').text('$' + formatNumber(estadisticas.saldoCapital || 0));
    $('#interesPendiente').text('$' + formatNumber(estadisticas.interesPendiente || 0));
    $('#interesConDescuento').text('$' + formatNumber(estadisticas.interesConDescuento || 0));
    $('#liquidacionTotal').text('$' + formatNumber(estadisticas.totalLiquidacion || 0));
    $('#ahorroDescuento').text('$' + formatNumber(estadisticas.ahorroCliente || 0));

    // Llenar campo oculto para el formulario
    $('#montoLiquidacion').val((estadisticas.totalLiquidacion || 0).toFixed(2));

    // Habilitar botón de confirmación si hay monto pendiente
    if (estadisticas.saldoCapital > 0) {
        $('#btnConfirmarLiquidacion').prop('disabled', false);
        console.log('✅ Botón de liquidación habilitado');
    } else {
        $('#btnConfirmarLiquidacion').prop('disabled', true);
        console.log('⚠️ Botón de liquidación deshabilitado - Sin saldo pendiente');
    }
}

// ===== MOSTRAR HISTORIAL DE PAGOS =====
function mostrarHistorialPagos(historial) {
    const tbody = $('#historialPagosTabla tbody');
    tbody.empty();

    if (!historial || historial.length === 0) {
        tbody.append(`
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay historial de pagos disponible
                </td>
            </tr>
        `);
        return;
    }

    historial.forEach(function (pago) {
        const fila = `
            <tr>
                <td>${pago.fecha}</td>
                <td class="text-center">${pago.numeroCuota}</td>
                <td class="text-end">$${formatNumber(pago.monto)}</td>
                <td class="text-end">$${formatNumber(pago.capital)}</td>
                <td class="text-end">$${formatNumber(pago.interes)}</td>
                <td class="text-center">
                    <span class="badge bg-primary">${pago.tipoPago}</span>
                </td>
            </tr>
        `;
        tbody.append(fila);
    });

    console.log(`📋 Historial de pagos mostrado: ${historial.length} registros`);
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
        $('#observacionesLiquidacion').focus();
        return;
    }

    if (observaciones.length < 10) {
        mostrarError('Las observaciones deben tener al menos 10 caracteres');
        $('#observacionesLiquidacion').focus();
        return;
    }

    const montoLiquidacion = parseFloat($('#montoLiquidacion').val()) || 0;

    // Mostrar confirmación detallada
    Swal.fire({
        title: '¿Confirmar Liquidación?',
        html: `
            <div class="text-start">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Información del Préstamo</strong>
                </div>
                <p><strong>Préstamo #:</strong> ${prestamoActual.id}</p>
                <p><strong>Cliente:</strong> ${prestamoActual.nombreCliente}</p>
                <p><strong>Monto original:</strong> <span class="text-primary">$${formatNumber(prestamoActual.monto)}</span></p>
                
                <div class="alert alert-warning mt-3">
                    <i class="fas fa-calculator me-2"></i>
                    <strong>Resumen de Liquidación</strong>
                </div>
                <p><strong>Capital pendiente:</strong> <span class="text-danger">$${formatNumber(saldoPendiente)}</span></p>
                <p><strong>Interés con descuento (10%):</strong> <span class="text-success">$${formatNumber(totalInteresPendiente * 0.9)}</span></p>
                <p><strong>Total a liquidar:</strong> <span class="text-primary fw-bold">$${formatNumber(montoLiquidacion)}</span></p>
                <p><strong>Ahorro del cliente:</strong> <span class="text-success fw-bold">$${formatNumber(totalInteresPendiente * 0.1)}</span></p>
                
                <div class="alert alert-danger mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>¡ATENCIÓN!</strong> Esta acción liquidará completamente el préstamo y no se puede deshacer.
                </div>
                <p><strong>Observaciones:</strong> ${observaciones}</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, Liquidar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#dc3545',
        width: '700px'
    }).then((result) => {
        if (result.isConfirmed) {
            procesarLiquidacion();
        }
    });
}

// ===== PROCESAR LIQUIDACIÓN =====
function procesarLiquidacion() {
    const montoLiquidacion = parseFloat($('#montoLiquidacion').val()) || 0;
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
            console.log('✅ Respuesta de liquidación:', response);

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
                                    <p><strong>Capital Liquidado:</strong> $${formatNumber(response.data.capitalPendiente)}</p>
                                    <p><strong>Interés con Descuento:</strong> $${formatNumber(response.data.interesConDescuento)}</p>
                                    <p><strong>Total Liquidado:</strong> $${formatNumber(response.data.totalLiquidado)}</p>
                                    <p><strong>Ahorro del Cliente:</strong> <span class="text-success">$${formatNumber(response.data.ahorroCliente)}</span></p>
                                </div>
                            </div>
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonText: 'Continuar',
                    confirmButtonColor: '#28a745'
                }).then(() => {
                    // Limpiar formulario después del éxito
                    limpiarFormulario();
                });
            } else {
                mostrarError(response.message || 'Error al procesar la liquidación');
            }
        },
        error: function (xhr, status, error) {
            ocultarLoading();
            console.error('❌ Error al procesar liquidación:', error);

            let mensaje = 'Error al procesar la liquidación';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                mensaje = xhr.responseJSON.message;
            }

            mostrarError(mensaje);
        }
    });
}

// ===== LIMPIAR FORMULARIO =====
function limpiarFormulario() {
    // Limpiar variables globales
    prestamoActual = null;
    saldoPendiente = 0;
    totalInteresPendiente = 0;

    // Limpiar campos del formulario
    $('#numeroPrestamo').val('');
    $('#observacionesLiquidacion').val('');
    $('#montoLiquidacion').val('');

    // Limpiar información mostrada
    $('#prestamoId, #prestamoCliente, #prestamoMonto, #prestamoFecha').text('');
    $('#prestamoTipo, #prestamoCuotas, #prestamoCuotaMensual, #prestamoTasa').text('');
    $('#estadoCuotasPagadas, #estadoCuotasPendientes, #estadoCapitalPagado').text('');
    $('#estadoInteresPagado, #estadoTotalPagado, #estadoPorcentajePagado').text('');
    $('#capitalPendiente, #interesPendiente, #interesConDescuento').text('$0.00');
    $('#liquidacionTotal, #ahorroDescuento').text('$0.00');

    // Limpiar tabla de historial
    $('#historialPagosTabla tbody').empty();

    // Ocultar secciones
    $('#seccionResultado, #seccionHistorial, #seccionLiquidacion').hide();

    // Deshabilitar botón
    $('#btnConfirmarLiquidacion').prop('disabled', true);

    // Enfocar en campo de búsqueda
    $('#numeroPrestamo').focus();

    console.log('🧹 Formulario limpiado');
}

// ===== FUNCIONES AUXILIARES =====
function mostrarError(mensaje) {
    Swal.fire({
        title: 'Error',
        text: mensaje,
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#dc3545'
    });
}

function mostrarLoading(mensaje = 'Cargando...') {
    Swal.fire({
        title: mensaje,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

function ocultarLoading() {
    Swal.close();
}

function formatNumber(numero) {
    if (!numero && numero !== 0) return '0.00';
    return parseFloat(numero).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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