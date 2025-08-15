// Variables globales
let clienteActual = null;
let prestamosHistorial = [];

// 🔍 FUNCIÓN MEJORADA PARA OBTENER CLIENTE
function getCliente() {
    var dui = $('#dui').val().trim();

    if (!dui) {
        Swal.fire("Advertencia", "Por favor ingrese un DUI válido", "warning");
        return;
    }

    showLoadingSpinner();
    limpiarDatosCliente();

    $.ajax({
        url: `/Auxiliares/GetClienteDetalle?dui=${dui}`,
        method: 'GET',
        success: function (resp) {

            if (!resp || typeof resp !== "object" || Object.keys(resp).length === 0) {
                Swal.fire("Error", "No se encuentra cliente registrado con ese DUI.", "error");
                hideLoadingSpinner();
                return;
            }

            clienteActual = resp;
            mostrarDatosCliente(resp);
            cargarHistorialPrestamos(resp.id);

        },
        error: function (xhr, status, error) {
            console.error('Error al cargar cliente:', error);
            hideLoadingSpinner();
            Swal.fire("Error", "Error al consultar los datos del cliente", "error");
        }
    });
}

// 📊 MOSTRAR DATOS DEL CLIENTE
function mostrarDatosCliente(cliente) {
    // Información básica
    $("#clienteNombre").html(`${cliente.nombre || ''} ${cliente.apellido || ''}`.trim());
    $("#clienteDui").html(cliente.dui || "Sin DUI");
    $("#clienteNit").html(cliente.nit || "Sin NIT");
    $("#clienteTelefono").html(cliente.telefono || cliente.celular || "Sin teléfono");
    $("#clienteDireccion").html(cliente.direccion || "Sin dirección");
    $("#clienteGestor").html(cliente.gestorNombre || "Sin gestor asignado");
    $("#clienteFechaIngreso").html(cliente.fechaIngreso || "No registrada");
    $("#txtIdCliente").val(cliente.id);

    // Estado del cliente
    const activo = cliente.activo === 1;
    const cardElement = document.getElementById('clienteInfoCard');
    const estadoBadge = document.getElementById('clienteEstadoBadge');
    const estadoTexto = document.getElementById('clienteEstadoTexto');

    if (cardElement && estadoBadge && estadoTexto) {
        if (activo) {
            cardElement.className = 'cliente-info-card cliente-activo';
            estadoTexto.textContent = 'Cliente Activo';
            estadoBadge.innerHTML = '<i class="fas fa-check-circle me-1"></i>Cliente Activo';
        } else {
            cardElement.className = 'cliente-info-card cliente-inactivo';
            estadoTexto.textContent = 'Cliente Inactivo';
            estadoBadge.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Cliente Inactivo';

            // Mostrar advertencia
            mostrarAdvertencia('El cliente está marcado como INACTIVO. Verifique antes de continuar.', 'warning');
        }
    }

    // Mostrar secciones
    $('#rowDetalleCliente').show();
    hideLoadingSpinner();
}

// 📈 CARGAR HISTORIAL DE PRÉSTAMOS
function cargarHistorialPrestamos(idCliente) {
    $.ajax({
        url: `/Auxiliares/GetPrestamosXCliente?idCliente=${idCliente}`,
        method: 'GET',
        success: function (data) {
            let prestamos = [];
            let prestamosActivos = [];
            if (data && data.success && data.data && Array.isArray(data.data)) {
                prestamos = data.data;
            } else if (data && Array.isArray(data)) {
                prestamos = data;
            }
            prestamosHistorial = prestamos;
            prestamosActivos = prestamos.filter(p => p.aprobado == 1);
            actualizarResumenCliente(prestamosActivos);
            mostrarHistorialPrestamos(prestamos);
            validarNuevoPrestamo(prestamos);
            $('#rowDetallePrestamo').show();
        },
        error: function (xhr, status, error) {
            console.error('Error al cargar historial:', error);
            $('#rowDetallePrestamo').show();
        }
    });
}

// 📊 ACTUALIZAR RESUMEN DEL CLIENTE
function actualizarResumenCliente(prestamos) {
    const prestamosActivos = prestamos.filter(p => p.estado === 'A').length;
    const totalPrestado = prestamos.reduce((sum, p) => sum + (p.monto || 0), 0);
    const saldoPendiente = prestamos
        .filter(p => p.estado === 'A')
        .reduce((sum, p) => sum + (p.monto || 0), 0); // Aquí deberías calcular el saldo real

    $('#prestamosActivos').text(prestamosActivos);
    $('#totalPrestado').text('$' + totalPrestado.toFixed(2));
    $('#saldoPendiente').text('$' + saldoPendiente.toFixed(2));
    $('#clientePrestamosCount').text(`${prestamos.length} Préstamos`);

    // Determinar estado crediticio
    let estadoCredito = 'Nuevo';
    let badgeClass = 'bg-secondary';

    if (prestamos.length > 0) {
        if (prestamosActivos > 2) {
            estadoCredito = 'Alto Riesgo';
            badgeClass = 'bg-danger';
        } else if (prestamosActivos > 0) {
            estadoCredito = 'Activo';
            badgeClass = 'bg-warning';
        } else {
            estadoCredito = 'Bueno';
            badgeClass = 'bg-success';
        }
    }

    $('#historialEstado').text(estadoCredito).className = `badge ${badgeClass}`;
}

// 📋 MOSTRAR HISTORIAL DE PRÉSTAMOS
function mostrarHistorialPrestamos(prestamos) {
    const container = $('#listaPrestamosHistorial');
    container.empty();

    if (prestamos.length === 0) {
        container.html(`
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle me-2"></i>
                Este cliente no tiene historial de préstamos previos
            </div>
        `);
        $('#rowHistorialPrestamos').show();
        return;
    }

    prestamos.forEach(prestamo => {
        const estado = prestamo.detalleAprobado;
        const estadoClass = prestamo.estado === 'A' ? 'prestamo-activo' : '';

        const card = `
            <div class="card prestamo-card ${estadoClass} mb-2">
                <div class="card-body p-3">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <strong class="text-primary">Préstamo #${prestamo.id}</strong>
                            <br><small class="text-muted">${prestamo.fecha}</small>
                        </div>
                        <div class="col-md-2">
                            <span class="badge ${prestamo.estado === 'A' ? 'bg-success' : 'bg-secondary'}">${estado}</span>
                        </div>
                        <div class="col-md-2">
                            <strong>$${prestamo.monto.toFixed(2)}</strong>
                            <br><small class="text-muted">Monto</small>
                        </div>
                        <div class="col-md-2">
                            <strong>$${prestamo.cuotas.toFixed(2)}</strong>
                            <br><small class="text-muted">Cuota</small>
                        </div>
                        <div class="col-md-2">
                            <strong>${prestamo.numCuotas}</strong>
                            <br><small class="text-muted">Cuotas</small>
                        </div>
                        <div class="col-md-2">
                            <strong>${prestamo.tasa}%</strong>
                            <br><small class="text-muted">Tasa</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.append(card);
    });

    $('#rowHistorialPrestamos').show();
}

// ⚠️ VALIDAR NUEVO PRÉSTAMO
function validarNuevoPrestamo(prestamos) {
    const prestamosActivos = prestamos.filter(p => p.estado === 'A');
    const container = $('#advertenciasCliente');

    if (prestamosActivos.length > 0) {
        let mensaje = `
            <div class="warning-box">
                <h6><i class="fas fa-exclamation-triangle me-2"></i>Advertencias:</h6>
                <ul class="mb-0">
                    <li>El cliente tiene <strong>${prestamosActivos.length} préstamo(s) activo(s)</strong></li>
        `;

        if (prestamosActivos.length >= 3) {
            mensaje += `<li class="text-danger">⚠️ <strong>ALTO RIESGO:</strong> Cliente con múltiples préstamos activos</li>`;
        }

        mensaje += `
                    <li>Verifique la capacidad de pago antes de aprobar</li>
                </ul>
            </div>
        `;

        container.html(mensaje).show();
    }
}

// 🧮 FUNCIÓN MEJORADA PARA CALCULAR CUOTA
//function calcularCuota() {
//    const monto = parseFloat($('#txtMonto').val()) || 0;
//    const tasaInteres = parseFloat($('#txtPorcentaje').val()) || 0;
//    const tasaDomicilio = parseFloat($('#txtPorcentajeDomicilio').val()) || 0;
//    const cuotas = parseInt($('#txtCuotas').val()) || 0;

//    if (monto > 0 && cuotas > 0) {
//        const interesTotal = monto * (tasaInteres / 100);
//        const domicilioTotal = monto * (tasaDomicilio / 100);
//        const totalAPagar = monto + interesTotal + domicilioTotal;
//        const cuotaFinal = totalAPagar / cuotas;
//        const intereFinal = interesTotal / cuotas;
//        const domicilioFinal = domicilioTotal / cuotas;

//        // Actualizar campos ocultos
//        $('#txtCuotasMonto').val(cuotaFinal.toFixed(2));
//        $('#txtInteres').val(intereFinal.toFixed(2));
//        $('#txtDomicilio').val(domicilioFinal.toFixed(2));

//        // Actualizar calculadora visual
//        $('#resumenMonto').text('$' + monto.toFixed(2));
//        $('#resumenInteres').text('$' + interesTotal.toFixed(2));
//        $('#resumenDomicilio').text('$' + domicilioTotal.toFixed(2));
//        $('#resumenTotal').text('$' + totalAPagar.toFixed(2));

//        $('#calculadoraVisual').show();

//        // Validaciones de riesgo
//        validarMontoPrestamo(monto, totalAPagar);

//    } else {
//        $('#txtCuotasMonto').val('');
//        $('#calculadoraVisual').hide();
//        limpiarValidaciones();
//    }
//}

// 🧮 FUNCIÓN MEJORADA PARA CALCULAR CUOTA CON INTERÉS SIMPLE
function calcularCuota() {
    const monto = parseFloat($('#txtMonto').val()) || 0;
    const tasaInteresMensual = parseFloat($('#txtPorcentaje').val()) || 0;
    const tasaDomicilio = parseFloat($('#txtPorcentajeDomicilio').val()) || 0;
    const cuotas = parseInt($('#txtCuotas').val()) || 0;
    const tipoPrestamo = $('#tipoPrestamo').val() || 'MENSUAL';

    if (monto > 0 && cuotas > 0) {
        // Determinar días por período según tipo de préstamo
        let diasPorPeriodo;
        switch (tipoPrestamo.toUpperCase()) {
            case 'DIARIO':
                diasPorPeriodo = 30;
                break;
            case 'SEMANAL':
                diasPorPeriodo = 4;
                break;
            case 'QUINCENAL':
                diasPorPeriodo = 2;
                break;
            case 'MENSUAL':
            default:
                diasPorPeriodo = 1;
                break;
        }

        const interes = monto * (tasaInteresMensual / 100) * (cuotas / diasPorPeriodo);
        const domicilio = monto * (tasaDomicilio / 100) * (cuotas / diasPorPeriodo);

        // Totales
        const totalAPagar = monto + interes + domicilio;
        const cuotaFinal = totalAPagar / cuotas;


        // Actualizar campos ocultos
        $('#txtCuotasMonto').val(cuotaFinal.toFixed(2));
        $('#txtInteres').val(interes.toFixed(2));
        $('#txtDomicilio').val(domicilio.toFixed(2));

        // Actualizar calculadora visual
        $('#resumenMonto').text('$' + monto.toFixed(2));
        $('#resumenInteres').text('$' + interes.toFixed(2));
        $('#resumenDomicilio').text('$' + domicilio.toFixed(2));
        $('#resumenTotal').text('$' + totalAPagar.toFixed(2));

        $('#calculadoraVisual').show();

    } else {
        $('#txtCuotasMonto').val('');
        $('#calculadoraVisual').hide();
        limpiarValidaciones();
    }
}



// 🧹 LIMPIAR VALIDACIONES
function limpiarValidaciones() {
    const container = $('#advertenciasCliente');
    let advertencias = container.html() || '';
    advertencias = advertencias.replace(/<li class="text-warning">.*?<\/li>/gi, '');

    if (advertencias.trim()) {
        container.html(advertencias);
    } else {
        container.hide();
    }
}

// 👁️ PREVISUALIZAR PRÉSTAMO
function previsualizarPrestamo() {
    if (!validarFormulario()) {
        return;
    }

    const datos = obtenerDatosPrestamo();
    const contenido = generarPreview(datos);

    $('#previewContent').html(contenido);
    $('#modalPreview').modal('show');
}

// 📋 GENERAR PREVIEW DEL PRÉSTAMO
function generarPreview(datos) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6><i class="fas fa-user me-2"></i>Información del Cliente</h6>
                <table class="table table-sm">
                    <tr><td><strong>Nombre:</strong></td><td>${datos.cliente.nombre}</td></tr>
                    <tr><td><strong>DUI:</strong></td><td>${datos.cliente.dui}</td></tr>
                    <tr><td><strong>Teléfono:</strong></td><td>${datos.cliente.telefono}</td></tr>
                    <tr><td><strong>Estado:</strong></td><td>${datos.cliente.activo ? 'Activo' : 'Inactivo'}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-calculator me-2"></i>Detalles del Préstamo</h6>
                <table class="table table-sm">
                    <tr><td><strong>Monto:</strong></td><td>${datos.prestamo.monto.toFixed(2)}</td></tr>
                    <tr><td><strong>Tasa Interés:</strong></td><td>${datos.prestamo.tasa}%</td></tr>
                    <tr><td><strong>Tasa Domicilio:</strong></td><td>${datos.prestamo.tasaDomicilio}%</td></tr>
                    <tr><td><strong>Cuotas:</strong></td><td>${datos.prestamo.cuotas}</td></tr>
                    <tr><td><strong>Tipo:</strong></td><td>${datos.prestamo.tipo}</td></tr>
                </table>
            </div>
        </div>
        <hr>
        <div class="row">
            <div class="col-12">
                <h6><i class="fas fa-chart-pie me-2"></i>Resumen Financiero</h6>
                <div class="row text-center">
                    <div class="col-3">
                        <div class="p-3 bg-primary text-white rounded">
                           <h5>$${datos.prestamo.monto.toFixed(2)}</h5>
                            <small>Capital</small>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="p-3 bg-info text-white rounded">
                            <h5>${datos.calculos.interesTotal.toFixed(2)}</h5>
                            <small>Interés Total</small>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="p-3 bg-warning text-white rounded">
                            <h5>${datos.calculos.domicilioTotal.toFixed(2)}</h5>
                            <small>Domicilio Total</small>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="p-3 bg-success text-white rounded">
                            <h5>${datos.calculos.totalAPagar.toFixed(2)}</h5>
                            <small>Total a Pagar</small>
                        </div>
                    </div>
                </div>
                <div class="mt-3 p-3 bg-light rounded">
                    <h5 class="text-center">Cuota: ${datos.calculos.cuotaMensual.toFixed(2)}</h5>
                </div>
            </div>
        </div>
    `;
}

// 📊 OBTENER DATOS DEL PRÉSTAMO
function obtenerDatosPrestamo() {
    const monto = parseFloat($('#txtMonto').val()) || 0;
    const tasaInteresMensual = parseFloat($('#txtPorcentaje').val()) || 0;
    const tasaDomicilio = parseFloat($('#txtPorcentajeDomicilio').val()) || 0;
    const cuotas = parseInt($('#txtCuotas').val()) || 0;
    const tipoPrestamo = $('#tipoPrestamo').val() || 'MENSUAL';

    // Determinar días por período según tipo de préstamo (misma lógica que calcularCuota)
    let diasPorPeriodo;
    switch (tipoPrestamo.toUpperCase()) {
        case 'DIARIO':
            diasPorPeriodo = 30;
            break;
        case 'SEMANAL':
            diasPorPeriodo = 4;
            break;
        case 'QUINCENAL':
            diasPorPeriodo = 2;
            break;
        case 'MENSUAL':
        default:
            diasPorPeriodo = 1;
            break;
    }

    // Cálculos usando la misma fórmula que calcularCuota()
    const interesTotal = monto * (tasaInteresMensual / 100) * (cuotas / diasPorPeriodo);
    const domicilioTotal = monto * (tasaDomicilio / 100) * (cuotas / diasPorPeriodo);
    const totalAPagar = monto + interesTotal + domicilioTotal;
    const cuotaFinal = totalAPagar / cuotas;

    return {
        cliente: {
            nombre: $('#clienteNombre').text(),
            dui: $('#clienteDui').text(),
            telefono: $('#clienteTelefono').text(),
            activo: clienteActual?.activo === 1
        },
        prestamo: {
            monto: monto,
            tasa: tasaInteresMensual,
            tasaDomicilio: tasaDomicilio,
            cuotas: cuotas,
            tipo: tipoPrestamo,
            fecha: $('#txtfechaPrestamo').val()
        },
        calculos: {
            interesTotal: interesTotal,
            domicilioTotal: domicilioTotal,
            totalAPagar: totalAPagar,
            cuotaMensual: cuotaFinal 
        }
    };
}

// ✅ VALIDAR FORMULARIO
function validarFormulario() {
    const monto = parseFloat($('#txtMonto').val());
    const tasa = parseFloat($('#txtPorcentaje').val());
    const tasaDomicilio = parseFloat($('#txtPorcentajeDomicilio').val());
    const cuotas = parseInt($('#txtCuotas').val());
    const fecha = $('#txtfechaPrestamo').val();

    if (!clienteActual) {
        Swal.fire("Error", "Debe seleccionar un cliente válido", "error");
        return false;
    }

    if (!monto || monto <= 0) {
        Swal.fire("Error", "El monto debe ser mayor a $0", "error");
        $('#txtMonto').focus();
        return false;
    }

    if (!tasa || tasa <= 0) {
        Swal.fire("Error", "La tasa de interés debe ser mayor a 0%", "error");
        $('#txtPorcentaje').focus();
        return false;
    }

    if (!cuotas || cuotas <= 0) {
        Swal.fire("Error", "El número de cuotas debe ser mayor a 0", "error");
        $('#txtCuotas').focus();
        return false;
    }

    if (!fecha) {
        Swal.fire("Error", "Debe seleccionar una fecha para el préstamo", "error");
        $('#txtfechaPrestamo').focus();
        return false;
    }

    return true;
}

// ✅ CONFIRMAR CREACIÓN
function confirmarCreacion() {
    $('#modalPreview').modal('hide');

    Swal.fire({
        title: '¿Crear Solicitud de Préstamo?',
        text: 'Se enviará la solicitud para revisión y aprobación',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, Crear Solicitud',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#formNuevoPrestamo').submit();
        }
    });
}

// 🧹 LIMPIAR FORMULARIO
function limpiarFormulario() {
    // Limpiar datos del cliente
    limpiarDatosCliente();

    // Limpiar formulario de préstamo
    $('#formNuevoPrestamo')[0].reset();
    $('#txtfechaPrestamo').val(new Date().toISOString().split('T')[0]);

    // Ocultar secciones
    $('#rowDetalleCliente').hide();
    $('#rowHistorialPrestamos').hide();
    $('#rowDetallePrestamo').hide();
    $('#calculadoraVisual').hide();
    $('#advertenciasCliente').hide();

    $('#advertenciasCliente').hide().empty();
    // Focus en DUI
    $('#dui').focus();

    // Reset variables
    clienteActual = null;
    prestamosHistorial = [];
}

// 🧹 LIMPIAR DATOS DEL CLIENTE
function limpiarDatosCliente() {
    $('#clienteNombre, #clienteDui, #clienteNit, #clienteTelefono, #clienteDireccion, #clienteGestor, #clienteFechaIngreso').text('');
    $('#txtIdCliente').val('');
    $('#prestamosActivos, #totalPrestado, #saldoPendiente').text('0');
    $('#clientePrestamosCount').text('0 Préstamos');
    $('#listaPrestamosHistorial').empty();
    $('#advertenciasCliente').hide().empty();
}

// 👁️ TOGGLE HISTORIAL
function toggleHistorial() {
    $('#historialContent').toggle();
}

// 🚨 MOSTRAR ADVERTENCIA
function mostrarAdvertencia(mensaje, tipo = 'warning') {
    const alertClass = tipo === 'warning' ? 'alert-warning' :
        tipo === 'danger' ? 'alert-danger' : 'alert-info';

    const icono = tipo === 'warning' ? 'fas fa-exclamation-triangle' :
        tipo === 'danger' ? 'fas fa-times-circle' : 'fas fa-info-circle';

    const html = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="${icono} me-2"></i>${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    $('#advertenciasCliente').html(html).show();
}

// 📱 EVENT LISTENERS
$(document).ready(function () {
    // Auto-cálculo cuando cambien los valores
    $('#txtMonto, #txtPorcentaje, #txtPorcentajeDomicilio, #txtCuotas, #tipoPrestamo').on('input', calcularCuota);

    // Enter en DUI para buscar
    $('#dui').on('keypress', function (e) {
        if (e.which === 13) {
            getCliente();
        }
    });

    // Validar monto máximo
    $('#txtMonto').on('blur', function () {
        const monto = parseFloat($(this).val());
        if (monto > 50000) {
            Swal.fire({
                title: 'Monto Muy Alto',
                text: '¿Está seguro de que el monto de $' + monto.toFixed(2) + ' es correcto?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, es correcto',
                cancelButtonText: 'Corregir'
            }).then((result) => {
                if (!result.isConfirmed) {
                    $('#txtMonto').focus().select();
                }
            });
        }
    });

    // Validar envío del formulario
    $('#formNuevoPrestamo').on('submit', function (e) {
        if (!validarFormulario()) {
            e.preventDefault();
            return false;
        }

        // Mostrar loading en el botón
        $('#btnSubmit').html('<i class="fas fa-spinner fa-spin me-2"></i>Creando...').prop('disabled', true);
    });

    // Inicializar fecha
    $('#txtfechaPrestamo').val(new Date().toISOString().split('T')[0]);
});