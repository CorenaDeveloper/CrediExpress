let tabla;
let cronogramaData = {};

$(document).ready(function () {
    // Inicializar fecha actual
    $('#fechaActual').text(new Date().toLocaleDateString('es-ES'));

    // Inicializar DataTable
    tabla = $('#tablaMovimientos').DataTable({
        pageLength: 15,
        order: [[0, 'desc']],
        columnDefs: [
            { targets: [4, 5], className: 'text-center' }
        ]
    });

    // Cargar datos iniciales
    cargarDashboard();
    cargarMovimientosDia();

    // Event Listeners
    $('#btnDesembolsos').on('click', function () {
        $('#modalDesembolso').modal('show');
        $('#numeroSolicitud').focus();
    });

    $('#btnIngresarCobro').on('click', function () {
        $('#modalCobro').modal('show');
        $('#dui').focus();
    });

    $('#btnBuscarSolicitud').on('click', buscarSolicitud);
    $('#btnConfirmarDesembolso').on('click', confirmarDesembolso);
    $('#btnGuardarCobro').on('click', guardarCobro);
    $('#btnActualizar').on('click', cargarMovimientosDia);
    $('#btnFiltrar').on('click', filtrarMovimientos);
    $('#btnExportar').on('click', exportarMovimientos);

    // Enter en campo de búsqueda
    $('#numeroSolicitud').on('keypress', function (e) {
        if (e.which === 13) {
            buscarSolicitud();
        }
    });

    // Enter en campo DUI
    $('#dui').on('keypress', function (e) {
        if (e.which === 13) {
            getCliente();
        }
    });

    // Eventos para cálculo automático
    $('#montoCapital, #montoInteres, #montoMora, #montoDomicilio').on('input', calcularTotal);



    function buscarSolicitud() {
        const numeroSolicitud = $('#numeroSolicitud').val().trim();

        if (!numeroSolicitud) {
            mostrarError('Ingrese un número de solicitud');
            return;
        }

        $.ajax({
            url: `/Auxiliares/GetSolicitudParaDesembolso?id=${numeroSolicitud}`,
            method: 'GET',
            success: function (data) {
                if (data && data.success) {
                    mostrarDatosSolicitud(data.solicitud);
                } else {
                    mostrarError(data.message || 'Solicitud no encontrada o no está aprobada');
                }
            },
            error: function () {
                mostrarError('Error al buscar la solicitud');
            }
        });
    }

    function mostrarDatosSolicitud(solicitud) {
        $('#nombreCliente').text(solicitud.nombreCliente);
        $('#duiCliente').text(solicitud.dui || 'No disponible');
        $('#telefonoCliente').text(solicitud.telefono || 'No disponible');
        $('#montoSolicitud').text(solicitud.monto.toFixed(2));
        $('#numeroCuotas').text(solicitud.numCoutas);
        $('#estadoSolicitud').html('<span class="badge bg-success">Aprobado</span>');

        $('#mensajeError').hide();
        $('#datosSolicitud').show();
        $('#btnConfirmarDesembolso').show();
    }

    function confirmarDesembolso() {
        const numeroSolicitud = $('#numeroSolicitud').val();
        const observaciones = $('#observacionesDesembolso').val();

        Swal.fire({
            title: '¿Confirmar Desembolso?',
            text: 'Esta acción cambiará el estado a DESEMBOLSADO',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, Desembolsar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                procesarDesembolso(numeroSolicitud, observaciones);
            }
        });
    }

    function procesarDesembolso(numeroSolicitud, observaciones) {
        // Mostrar loading
        Swal.fire({
            title: 'Procesando...',
            text: 'Registrando desembolso',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/Auxiliares/ProcesarDesembolso',
            method: 'POST',
            data: {
                numeroSolicitud: numeroSolicitud,
                observaciones: observaciones
            },
            success: function (response) {
                if (response.success) {
                    // Obtener datos para el ticket PDF
                    const solicitudData = {
                        id: numeroSolicitud,
                        monto: parseFloat($('#montoSolicitud').text()),
                        numCoutas: parseInt($('#numeroCuotas').text()),
                        tipoPrestamo: 'MENSUAL' // Puedes mejorar esto obteniendo el tipo real
                    };

                    const clienteData = {
                        nombre: $('#nombreCliente').text().split(' ')[0] || 'Cliente',
                        apellido: $('#nombreCliente').text().split(' ').slice(1).join(' ') || '',
                        dui: $('#duiCliente').text(),
                        telefono: $('#telefonoCliente').text()
                    };

                    const gestorData = obtenerDatosUsuarioLogueado();

                    Swal.fire({
                        title: '¡Desembolso Exitoso!',
                        html: `
                            <div class="text-center">
                                <div class="alert alert-success mb-3">
                                    <i class="fas fa-check-circle fa-2x text-success mb-2"></i><br>
                                    <strong>Desembolso procesado correctamente</strong>
                                </div>
                                <p><strong>Solicitud:</strong> #${numeroSolicitud}</p>
                                <p><strong>Monto:</strong> ${solicitudData.monto.toFixed(2)}</p>
                                <p><strong>Cliente:</strong> ${clienteData.nombre} ${clienteData.apellido}</p>
                            </div>
                        `,
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonText: '<i class="fas fa-receipt me-1"></i>Generar Comprobante PDF',
                        cancelButtonText: '<i class="fas fa-check me-1"></i>Solo Continuar',
                        confirmButtonColor: '#198754',
                        cancelButtonColor: '#28a745'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            generarTicketDesembolsoPDF(solicitudData, clienteData, gestorData);
                        }
                    });

                    $('#modalDesembolso').modal('hide');
                    limpiarModalDesembolso();
                    cargarDashboard();
                    cargarMovimientosDia();
                } else {
                    Swal.fire('Error', response.message, 'error');
                }
            },
            error: function () {
                Swal.fire('Error', 'Error al procesar el desembolso', 'error');
            }
        });
    }

    function limpiarModalDesembolso() {
        $('#numeroSolicitud').val('');
        $('#observacionesDesembolso').val('');
        $('#datosSolicitud').hide();
        $('#mensajeError').hide();
        $('#btnConfirmarDesembolso').hide();
    }

    function filtrarMovimientos() {
        const tipo = $('#filtroTipo').val();
        const concepto = $('#filtroConcepto').val();

        tabla.columns(1).search(tipo).draw();
        tabla.columns(2).search(concepto).draw();
    }

    function exportarMovimientos() {
        const fecha = new Date().toISOString().split('T')[0];

        Swal.fire({
            title: 'Exportando...',
            text: 'Generando reporte de movimientos',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        // Simular exportación (aquí puedes implementar la lógica real)
        setTimeout(() => {
            Swal.fire({
                title: '¡Exportado!',
                text: 'El reporte ha sido generado exitosamente',
                icon: 'success'
            });
        }, 2000);
    }

    // Limpiar modales al cerrar
    $('#modalDesembolso').on('hidden.bs.modal', limpiarModalDesembolso);
    $('#modalCobro').on('hidden.bs.modal', function () {
        $('#formCobro')[0].reset();
        nuevaBusqueda();
    });

    // Formato de campos monetarios
    $('#montoCapital, #montoInteres, #montoMora').on('input', function () {
        let value = $(this).val().replace(/[^0-9.]/g, '');
        if (value.split('.').length > 2) {
            value = value.substring(0, value.lastIndexOf('.'));
        }
        $(this).val(value);
        calcularTotal();
    });
});
function guardarCobro() {
    const form = $('#formCobro')[0];
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const $btnGuardar = $('#btnGuardarCobro');
    if ($btnGuardar.prop('disabled')) {
        return;
    }

    $btnGuardar.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i>Procesando...');

    Swal.fire({
        title: 'Procesando...',
        text: 'Registrando cobro',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });

    const data = {
        idPrestamo: $('#prestamoSeleccionadoId').val(),
        numeroCuota: parseInt($('#numeroCuota').val()) || 1,
        montoCapital: parseFloat($('#montoCapital').val()) || 0,
        montoInteres: parseFloat($('#montoInteres').val()) || 0,
        montoMora: parseFloat($('#montoMora').val()) || 0,
        montoTotal: parseFloat($('#montoTotal').val()) || 0,
        metodoPago: $('#metodoPago').val() || 'EFECTIVO',
        observaciones: $('#observacionesCobro').val() || '',
        concepto: $('#conceptoCobro').val(),
        idCliente: $('#txtIdCliente').val()
    };


    //console.log(data);

    // USAR EL NUEVO ENDPOINT
    $.ajax({
        url: '/Auxiliares/RegistrarPagoConCalendario',
        method: 'POST',
        data: data,
        success: function (response) {
            $btnGuardar.prop('disabled', false).html('<i class="fas fa-save me-2"></i>Registrar Cobro');
            console.log(response.data);
            if (response.success) {
                const datosCobro = {
                    idCobro: response.data?.idCobro || new Date().getTime(),
                    numeroCuota: data.numeroCuota,
                    montoTotal: data.montoTotal,
                    cliente: {
                        nombre: $('#clienteNombre').text().split(' ')[0] || 'Cliente',
                        apellido: $('#clienteNombre').text().split(' ').slice(1).join(' ') || '',
                        dui: $('#clienteDui').text()
                    },
                    montoCapital: data.montoCapital || 0,
                    montoInteres: data.montoInteres || 0,
                    montoMora: data.montoMora || 0,
                    metodoPago: data.metodoPago,
                    observaciones: data.observaciones || '',
                    concepto: data.concepto || 'CUOTA_COMPLETA',
                    idPrestamo: data.idPrestamo,
                    idCliente: data.idCliente
                };

                const estadoPrestamo = response.data?.estadoPrestamo === 'C';

                Swal.fire({
                    title: '¡Cobro Registrado!',
                    html: `
                        <div class="text-center">
                            <div class="alert alert-success mb-3">
                                <i class="fas fa-check-circle fa-2x text-success mb-2"></i><br>
                                <strong>Pago registrado exitosamente</strong>
                            </div>
                            <p><strong>Recibo:</strong> #${datosCobro.idCobro}</p>
                            <p><strong>Cuota:</strong> #${datosCobro.numeroCuota}</p>
                            <p><strong>Monto:</strong> $${data.montoTotal.toFixed(2)}</p>
                            <p><strong>Cliente:</strong> ${datosCobro.cliente.nombre} ${datosCobro.cliente.apellido}</p>
                            ${estadoPrestamo ?
                            '<div class="alert alert-info mt-2"><i class="fas fa-trophy me-1"></i>¡Préstamo completamente liquidado!</div>' :
                            ''}
                        </div>
                    `,
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: '<i class="fas fa-receipt me-1"></i>Generar Recibo PDF',
                    cancelButtonText: '<i class="fas fa-check me-1"></i>Solo Continuar',
                    confirmButtonColor: '#198754',
                    cancelButtonColor: '#28a745'
                }).then((result) => {
                    if (result.isConfirmed) {
                        //console.log(datosCobro);
                        generarTicketCobroPDF(datosCobro);                       
                    }
                });

                $('#modalCobro').modal('hide');
                $('#formCobro')[0].reset();
                nuevaBusqueda();
                cargarDashboard();
                cargarMovimientosDia();
            } else {
                Swal.fire('Error', response.message || 'Error al registrar el cobro', 'error');
            }
        },
        error: function (xhr, status, error) {
            $btnGuardar.prop('disabled', false).html('<i class="fas fa-save me-2"></i>Registrar Cobro');
            console.error('Error AJAX:', error);
            Swal.fire('Error', 'Error al conectar con el servidor', 'error');
        }
    });
}

function mostrarError(mensaje) {
    $('#textoError').text(mensaje);
    $('#mensajeError').show();
    $('#datosSolicitud').hide();
    $('#btnConfirmarDesembolso').hide();
    // Para el modal de cobro
    $('#seccionCliente').hide();
    $('#seccionFormularioCobro').hide();
    $('#btnGuardarCobro').hide();
    $('#btnNuevaBusqueda').hide();
}

function limpiarDatosCliente() {
    $('#seccionCliente').hide();
    $('#seccionFormularioCobro').hide();
    $('#btnGuardarCobro').hide();
    $('#btnNuevaBusqueda').hide();
    $('#dui').val('');
    $('#listaPrestamos').empty();
    $('#cantidadPrestamos').text('0');
}

function mostrarDatosCliente(cliente) {
    // Llenar datos del cliente
    $("#clienteNombre").text(`${cliente.nombre || ''} ${cliente.apellido || ''}`.trim());
    $("#clienteDui").text(cliente.dui || 'Sin DUI');
    $("#clienteNit").text(cliente.nit || 'Sin NIT');
    $("#clienteTelefono").text(cliente.telefono || cliente.celular || 'Sin teléfono');
    $("#txtIdCliente").val(cliente.id);

    // Ocultar sección de búsqueda y mostrar sección de cliente
    $('#seccionBusqueda').hide();
    $('#seccionCliente').show();
    $('#mensajeError').hide();
    $('#btnNuevaBusqueda').show();
}

function mostrarListaPrestamos(prestamos) {
    const contenedor = $('#listaPrestamos');
    contenedor.empty();

    // Filtrar solo préstamos activos
    const prestamosActivos = prestamos.filter(prestamo => prestamo.estado === "A");

    $('#cantidadPrestamos').text(prestamosActivos.length);

    if (prestamosActivos.length === 0) {
        contenedor.append(`
            <div class="alert alert-warning text-center">
                <i class="fas fa-info-circle me-2"></i>
                Este cliente no tiene préstamos activos para cobrar
            </div>
        `);
        return;
    }

    prestamosActivos.forEach(function (prestamo, index) {
        const tieneMora = 0.00;
        const estadoMora = tieneMora ?
            `<span class="badge bg-danger">Mora: 0.00 días</span>` :
            `<span class="badge bg-success">Al día</span>`;
  
        const cardPrestamo = `
            <div class="card mb-2 prestamo-card" data-prestamo='${JSON.stringify(prestamo)}' 
                 onclick="seleccionarPrestamo(${index})" style="cursor: pointer;">
                <div class="card-body p-3">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <strong class="text-primary">Préstamo #${prestamo.id}</strong>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Monto Original</small><br>
                            <strong>$${prestamo.monto.toFixed(2)}</strong>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Cuota</small><br>
                            <strong class="text-success">$${prestamo.cuotas.toFixed(2)}</strong>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Progreso</small><br>
                           <strong>${prestamo.numCuotas}/${prestamo.cuotasPagadas}</strong>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Saldo</small><br>
                             <strong class="text-warning">$${prestamo.saldoPendiente.toFixed(2)}</strong>
                        </div>
                        <div class="col-md-2 text-center">
                            ${estadoMora}
                        </div>
                    </div>
                </div>
            </div>
        `;

        contenedor.append(cardPrestamo);
    });

    // Agregar estilos hover
    $('.prestamo-card').hover(
        function () { $(this).addClass('border-primary'); },
        function () { $(this).removeClass('border-primary'); }
    );
}


// ===== FUNCIÓN PARA CALCULAR FECHA DE VENCIMIENTO =====
function calcularFechaVencimiento(prestamo) {
    if (!prestamo.proximoPago) return 'Sin fecha';

    const fechaProximoPago = new Date(prestamo.proximoPago);
    const hoy = new Date();

    if (fechaProximoPago < hoy) {
        const diasVencido = Math.floor((hoy - fechaProximoPago) / (1000 * 60 * 60 * 24));
        return `Vencido (${diasVencido} días)`;
    } else {
        return fechaProximoPago.toLocaleDateString('es-ES');
    }
}

// ===== FUNCIÓN PARA CALCULAR DÍAS VENCIDOS =====
function calcularDiasVencido(fechaProximoPago) {
    if (!fechaProximoPago) return 0;

    const fechaPago = new Date(fechaProximoPago);
    const hoy = new Date();

    if (fechaPago < hoy) {
        return Math.floor((hoy - fechaPago) / (1000 * 60 * 60 * 24));
    }

    return 0; // No está vencido
}

function toggleCronograma() {
    const cronogramaBody = $('#cronogramaBody');
    const isVisible = cronogramaBody.is(':visible');

    if (isVisible) {
        cronogramaBody.slideUp();
    } else {
        cronogramaBody.slideDown();
        // Recargar cronograma si está oculto
        const idPrestamo = $('#prestamoSeleccionadoId').val();
        if (idPrestamo) {
            cargarCronogramaReal(idPrestamo);
        }
    }
}

function nuevaBusqueda() {
    $('#seccionBusqueda').show();
    $('#seccionCliente').hide();
    $('#seccionFormularioCobro').hide();
    $('#seccionCronograma').hide(); 
    $('#mensajeError').hide();
    $('#btnGuardarCobro').hide();
    $('#btnNuevaBusqueda').hide();
    $('#dui').val('').focus();
    $('#formCobro')[0].reset();

    $('#prestamoFechaVencimiento').text('-');
}


function ajustarCamposCobro() {
    const concepto = $('#conceptoCobro').val();
    console.log('cronogramaData');
    console.log(cronogramaData);
    // Resetear campos
    //$('#montoCapital, #montoInteres, #montoMora').val('').prop('disabled', false);
    // Configurar campos según el concepto
    switch (concepto) {
        case 'CUOTA_COMPLETA':
            $('#montoInteres').val(cronogramaData.interes || '0.00');
            $('#montoMora').val(cronogramaData.mora || '0.00');
            $('#montoCapital').val(cronogramaData.capital || '0.00');
            $('#montoDomicilio').val(cronogramaData.domicilio || '0.00');
            $('#montoInteres, #montoMora, #montoCapital, #montoDomicilio').prop('disabled', true);
            break;
        case 'SOLO_CAPITAL':
            $('#montoInteres, #montoMora, #montoDomicilio').val('0.00').prop('disabled', true);
            $('#montoCapital').val(cronogramaData.capital || '0.00');
            break;
        case 'SOLO_INTERES':
            $('#montoCapital, #montoMora').val('0.00').prop('disabled', true);
            $('#montoInteres').val(cronogramaData.interes || '0.00');
            $('#montoDomicilio').val(cronogramaData.domicilio || '0.00');
            break;
        case 'ABONO_PARCIAL':
            // Solo capital habilitado
            $('#montoInteres, #montoMora').val('0.00').prop('disabled', true);
            $('#montoInteres').val(cronogramaData.interes || '0.00');
            $('#montoDomicilio').val(cronogramaData.domicilio || '0.00');
            $('#montoMora, #montoCapital').prop('disabled', false);
            break;
    }

    calcularTotal();
}

function calcularTotal() {
    const capital = parseFloat($('#montoCapital').val()) || 0;
    const interes = parseFloat($('#montoInteres').val()) || 0;
    const mora = parseFloat($('#montoMora').val()) || 0;
    const domicilio = parseFloat($('#montoDomicilio').val()) || 0;

    const total = capital + interes + mora + domicilio;
    $('#montoTotal').val(total.toFixed(2));
}

// Función mejorada para buscar cliente
function getCliente() {
    var dui = $('#dui').val().trim();

    if (!dui) {
        mostrarError('Por favor ingrese un DUI');
        return;
    }

    $.ajax({
        url: `/Auxiliares/GetClienteDetalle?dui=${dui}`,
        method: 'GET',
        success: function (resp) {

            if (!resp || typeof resp !== "object" || Object.keys(resp).length === 0) {
                mostrarError("No se encontró un cliente registrado con ese DUI");
                limpiarDatosCliente();
                return;
            }

            // Mostrar datos del cliente
            mostrarDatosCliente(resp);

            // Buscar préstamos del cliente
            //prestamosXcliente(resp.id);
            buscarPrestamosConCalendario(resp.id);

        },
        error: function (xhr, status, error) {
            console.error('Error al buscar cliente:', error);
            mostrarError('Error al buscar el cliente. Intente nuevamente.');
        }
    });
}


function cargarMovimientosDia() {
    const fecha = obtenerFechaSalvador();
   
    $.ajax({
        url: `/Auxiliares/GetMovimientosDiariosCompleto?fecha=${fecha}&creadoPor=${window.usuarioActual.id}`,
        method: 'GET',
        success: function (response) {
            tabla.clear();
            let totalIngresos = 0;
            let totalEgresos = 0;

            if (response.success && response.data && Array.isArray(response.data)) {
                response.data.forEach(function (mov) {
                    const esIngreso = mov.tipo === 'INGRESO';
                    const monto = parseFloat(mov.monto);

                    if (esIngreso) {
                        totalIngresos += monto;
                    } else {
                        totalEgresos += monto;
                    }

                    const fila = tabla.row.add([
                        mov.hora,
                        `<span class="badge ${esIngreso ? 'bg-success' : 'bg-danger'}">${mov.tipo}</span>`,
                        mov.concepto,
                        mov.cliente,
                        esIngreso ? `<span class="monto-ingreso">$${monto.toFixed(2)}</span>` : '-',
                        !esIngreso ? `<span class="monto-egreso">$${monto.toFixed(2)}</span>` : '-',
                        mov.usuario,
                        `<button class="btn btn-sm btn-outline-primary" onclick="verDetalle(${mov.id})">
                                <i class="fas fa-eye"></i>
                            </button>`
                    ]).node();

                    if (esIngreso) {
                        $(fila).addClass('ingreso-row');
                    } else {
                        $(fila).addClass('egreso-row');
                    }
                });
            }

            tabla.draw();
            $('#totalIngresos').text('$' + totalIngresos.toFixed(2));
            $('#totalEgresos').text('$' + totalEgresos.toFixed(2));
            $('#contadorMovimientos').text(response.data ? response.data.length : 0);
        },
        error: function () {
            Swal.fire('Error', 'Error al cargar los movimientos del día', 'error');
        }
    });
}


// Agregar AL FINAL del archivo movimientos.js (antes del último });)

function generarTicketDesembolsoPDF(solicitudData, clienteData, gestorData) {
    const fecha = new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-ES');
    const horaFormateada = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const docDefinition = {
        pageSize: { width: 226.77, height: 'auto' },
        pageMargins: [10, 10, 10, 10],
        defaultStyle: { fontSize: 9 },
        content: [
            {
                text: 'CREDI-EXPRESS DE EL SALVADOR',
                fontSize: 11,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 5]
            },
            {
                text: 'COMPROBANTE DE DESEMBOLSO',
                fontSize: 10,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 10]
            },
            {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 206, y2: 0, lineWidth: 1 }],
                margin: [0, 0, 0, 10]
            },
            {
                table: {
                    widths: ['30%', '70%'],
                    body: [
                        [{ text: 'FECHA:', bold: true }, fechaFormateada],
                        [{ text: 'HORA:', bold: true }, horaFormateada],
                        [{ text: 'SOLICITUD:', bold: true }, `#${solicitudData.id}`]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            },
            {
                text: 'DATOS DEL CLIENTE',
                fontSize: 9,
                bold: true,
                decoration: 'underline',
                margin: [0, 0, 0, 5]
            },
            {
                table: {
                    widths: ['100%'],
                    body: [
                        [{ text: `${clienteData.nombre} ${clienteData.apellido}`, fontSize: 9, bold: true }],
                        [{ text: `DUI: ${clienteData.dui}` }],
                        [{ text: `TEL: ${clienteData.telefono}` }]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            },
            {
                text: 'DETALLE DEL PRÉSTAMO',
                fontSize: 9,
                bold: true,
                decoration: 'underline',
                margin: [0, 5, 0, 5]
            },
            {
                table: {
                    widths: ['40%', '60%'],
                    body: [
                        [{ text: 'MONTO:', bold: true }, { text: `$${solicitudData.monto.toFixed(2)}`, bold: true, color: '#2E7D32' }],
                        [{ text: 'CUOTAS:', bold: true }, solicitudData.numCoutas.toString()],
                        [{ text: 'TIPO:', bold: true }, solicitudData.tipoPrestamo]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 15]
            },
            {
                table: {
                    widths: ['100%'],
                    body: [
                        [{ text: 'TOTAL DESEMBOLSADO', fontSize: 10, bold: true, alignment: 'center', fillColor: '#f0f0f0' }],
                        [{ text: `$${solicitudData.monto.toFixed(2)}`, fontSize: 14, bold: true, color: '#1976D2', alignment: 'center', fillColor: '#f0f0f0' }]
                    ]
                },
                margin: [0, 10, 0, 15]
            },
            {
                text: 'CREDI-EXPRESS DE EL SALVADOR\nGracias por su confianza',
                alignment: 'center',
                fontSize: 7,
                italics: true,
                margin: [0, 20, 0, 0]
            }
        ]
    };

    mostrarOpcionesPDF(docDefinition, 'COMPROBANTE DE DESEMBOLSO', `Desembolso_${solicitudData.id}_${Date.now()}`);
}

function generarTicketCobroPDF(datosCobro) {
    const fecha = new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-ES');
    const horaFormateada = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const docDefinition = {
        pageSize: { width: 226.77, height: 'auto' },
        pageMargins: [10, 10, 10, 10],
        defaultStyle: { fontSize: 9 },
        content: [
            {
                text: 'CREDI-EXPRESS DE EL SALVADOR',
                fontSize: 11,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 5]
            },
            {
                text: 'RECIBO DE PAGO',
                fontSize: 10,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 10]
            },
            {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 206, y2: 0, lineWidth: 1 }],
                margin: [0, 0, 0, 10]
            },
            {
                table: {
                    widths: ['30%', '70%'],
                    body: [
                        [{ text: 'FECHA:', bold: true }, fechaFormateada],
                        [{ text: 'HORA:', bold: true }, horaFormateada],
                        [{ text: 'RECIBO:', bold: true }, `#${datosCobro.idCobro}`]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            },
            {
                text: 'CLIENTE',
                fontSize: 9,
                bold: true,
                decoration: 'underline',
                margin: [0, 0, 0, 5]
            },
            {
                table: {
                    widths: ['100%'],
                    body: [
                        [{ text: `${datosCobro.cliente.nombre} ${datosCobro.cliente.apellido}`, fontSize: 9, bold: true }],
                        [{ text: `DUI: ${datosCobro.cliente.dui}` }]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            },
            {
                text: 'DESGLOSE',
                fontSize: 9,
                bold: true,
                decoration: 'underline',
                margin: [0, 0, 0, 5]
            },
            {
                table: {
                    widths: ['60%', '40%'],
                    body: [
                        [{ text: 'Capital:', bold: true }, { text: `$${datosCobro.montoCapital.toFixed(2)}`, alignment: 'right', bold: true, color: '#2E7D32' }],
                        [{ text: 'Interés:', bold: true }, { text: `$${datosCobro.montoInteres.toFixed(2)}`, alignment: 'right', bold: true, color: '#2E7D32' }],
                        [{ text: 'Mora:', bold: true }, { text: `$${datosCobro.montoMora.toFixed(2)}`, alignment: 'right', bold: true, color: '#2E7D32' }]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            },
            {
                table: {
                    widths: ['100%'],
                    body: [
                        [{ text: 'TOTAL PAGADO', fontSize: 10, bold: true, alignment: 'center', fillColor: '#e8f5e8' }],
                        [{ text: `$${datosCobro.montoTotal.toFixed(2)}`, fontSize: 14, bold: true, color: '#1976D2', alignment: 'center', fillColor: '#e8f5e8' }]
                    ]
                },
                margin: [0, 0, 0, 15]
            },
            {
                text: 'CREDI-EXPRESS DE EL SALVADOR\n¡Gracias por su pago puntual!',
                alignment: 'center',
                fontSize: 7,
                italics: true,
                margin: [0, 15, 0, 0]
            }
        ]
    };

    mostrarOpcionesPDF(docDefinition, 'RECIBO DE PAGO', `Recibo_${datosCobro.idCobro}_${Date.now()}`);
}

function mostrarOpcionesPDF(docDefinition, titulo, nombreArchivo) {
    Swal.fire({
        title: titulo,
        text: '¿Qué desea hacer con el documento?',
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '<i class="fas fa-download me-1"></i>Descargar PDF',
        denyButtonText: '<i class="fas fa-eye me-1"></i>Ver Vista Previa',
        cancelButtonText: '<i class="fas fa-times me-1"></i>Cerrar',
        confirmButtonColor: '#198754',
        denyButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d'
    }).then((result) => {
        if (result.isConfirmed) {
            pdfMake.createPdf(docDefinition).download(`${nombreArchivo}.pdf`);
            showAlert('success', 'PDF descargado exitosamente');
        } else if (result.isDenied) {
            pdfMake.createPdf(docDefinition).open();
        }
    });
}

function cargarDashboard() {
    const fecha = obtenerFechaSalvador();

    $.ajax({
        url: `/Auxiliares/GetMovimientosDiariosCompleto?fecha=${fecha}`,
        method: 'GET',
        success: function (response) {
            if (response.success && response.resumen) {
                //console.log(response);
                //$('#totalEfectivo').text('$' + response.resumen.efectivoDisponible.toFixed(2));
                $('#ingresosDia').text('$' + response.resumen.ingresosDia.toFixed(2));
                $('#egresosDia').text('$' + response.resumen.egresosDia.toFixed(2));
                $('#totalMovimientos').text(response.resumen.totalMovimientos || 0);
            }
        },
        error: function () {
            console.error('Error al cargar estadísticas del dashboard');
        }
    });
}
function obtenerDatosUsuarioLogueado() {
    return {
        nombre: 'Sistema',
        apellido: 'Administrativo'
    };
}

function verDetalle(idMovimiento) {
    // Mostrar loading
    Swal.fire({
        title: 'Cargando...',
        text: 'Obteniendo detalles del movimiento',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });

    // ✅ Usar tu método existente con el parámetro adicional
    $.ajax({
        url: `/Auxiliares/GetMovimientosDetallado?idMovimiento=${idMovimiento}`,
        method: 'GET',
        success: function (response) {
            if (response.success && response.data) {
                mostrarModalDetalleMovimiento(response.data);
            } else {
                Swal.fire({
                    title: 'Error',
                    text: response.message || 'No se pudo obtener el detalle del movimiento',
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        },
        error: function (xhr, status, error) {
            console.error('Error al obtener detalle:', error);
            Swal.fire({
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor para obtener los detalles',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    });
}

// ✅ FUNCIÓN CORREGIDA para trabajar con datos del servidor
function mostrarModalDetalleMovimiento(movimiento) {
    //console.log('Datos recibidos:', movimiento);

    // ✅ Usar datos reales del servidor (no extraer de HTML)
    const monto = parseFloat(movimiento.monto) || 0;
    const esIngreso = movimiento.tipo === "INGRESO";
    const esEgreso = movimiento.tipo === "EGRESO";

    // Determinar clase de badge e ícono
    const badgeClass = esIngreso ? 'bg-success' : 'bg-danger';
    const iconClass = esIngreso ? 'fas fa-arrow-down' : 'fas fa-arrow-up';

    // Formatear fecha
    const fechaFormateada = movimiento.fechaPago ?
        new Date(movimiento.fechaPago).toLocaleDateString('es-ES') :
        new Date().toLocaleDateString('es-ES');

    // Crear el contenido del modal con DATOS REALES
    const modalContent = `
        <div class="text-start">
            <!-- Encabezado del movimiento -->
            <div class="alert alert-info mb-4">
                <div class="row align-items-center">
                    <div class="col-2 text-center">
                        <i class="${iconClass} fa-2x"></i>
                    </div>
                    <div class="col-10">
                        <h5 class="mb-1">
                            <span class="badge ${badgeClass} fs-6 me-2">${movimiento.tipo}</span>
                            Movimiento #${movimiento.id}
                        </h5>
                        <p class="mb-0 text-muted">
                            <i class="fas fa-calendar me-1"></i>${fechaFormateada} - 
                            <i class="fas fa-clock me-1"></i>${movimiento.hora}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Información principal -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card border-primary">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información General</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-borderless mb-0">
                                <tr>
                                    <td><strong>Concepto:</strong></td>
                                    <td>${movimiento.concepto || 'No especificado'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Método de Pago:</strong></td>
                                    <td>${movimiento.tipoPago || 'EFECTIVO'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Usuario Responsable:</strong></td>
                                    <td>${movimiento.usuario || 'Sistema'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Número de Cuota:</strong></td>
                                    <td>${movimiento.numeropago && movimiento.numeropago > 0 ? `Cuota #${movimiento.numeropago}` : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Préstamo:</strong></td>
                                    <td>#${movimiento.idPrestamo || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Estado:</strong></td>
                                    <td>${movimiento.pagado == 1 ?
            '<span class="badge bg-success">Procesado</span>' :
            '<span class="badge bg-warning">Pendiente</span>'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card border-success">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="fas fa-dollar-sign me-2"></i>Información Financiera</h6>
                        </div>
                        <div class="card-body">
                            <div class="text-center mb-3">
                                <h3 class="text-success mb-0">$${monto.toFixed(2)}</h3>
                                <small class="text-muted">Monto Total</small>
                            </div>
                            
                            <!-- ✅ DESGLOSE REAL CON DATOS DEL SERVIDOR -->
                            ${(movimiento.capital || movimiento.interes || movimiento.mora) ? `
                                <hr>
                                <h6 class="mb-2">Desglose Financiero:</h6>
                                <table class="table table-sm">
                                    ${movimiento.capital && movimiento.capital > 0 ? `
                                        <tr>
                                            <td><i class="fas fa-university me-1"></i>Capital:</td>
                                            <td class="text-end fw-bold text-primary">$${parseFloat(movimiento.capital).toFixed(2)}</td>
                                        </tr>
                                    ` : ''}
                                    ${movimiento.interes && movimiento.interes > 0 ? `
                                        <tr>
                                            <td><i class="fas fa-percentage me-1"></i>Interés:</td>
                                            <td class="text-end fw-bold text-info">$${parseFloat(movimiento.interes).toFixed(2)}</td>
                                        </tr>
                                    ` : ''}
                                    ${movimiento.mora && movimiento.mora > 0 ? `
                                        <tr>
                                            <td><i class="fas fa-exclamation-triangle me-1"></i>Mora:</td>
                                            <td class="text-end fw-bold text-warning">$${parseFloat(movimiento.mora).toFixed(2)}</td>
                                        </tr>
                                    ` : ''}
                                    ${movimiento.morahist && movimiento.morahist > 0 ? `
                                        <tr>
                                            <td><i class="fas fa-history me-1"></i>Mora Histórica:</td>
                                            <td class="text-end fw-bold text-secondary">$${parseFloat(movimiento.morahist).toFixed(2)}</td>
                                        </tr>
                                    ` : ''}
                                </table>
                            ` : `
                                <div class="alert alert-light text-center">
                                    <i class="fas fa-info-circle me-1"></i>
                                    <small>Movimiento sin desglose detallado</small>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Información del cliente -->
            <div class="card border-info mb-4">
                <div class="card-header bg-info text-white">
                    <h6 class="mb-0"><i class="fas fa-user me-2"></i>Información del Cliente</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1"><strong><i class="fas fa-user me-1"></i>Nombre:</strong> ${movimiento.cliente || 'No especificado'}</p>
                            ${movimiento.duiCliente ? `<p class="mb-1"><strong><i class="fas fa-id-card me-1"></i>DUI:</strong> ${movimiento.duiCliente}</p>` : ''}
                            ${movimiento.telefonoCliente ? `<p class="mb-0"><strong><i class="fas fa-phone me-1"></i>Teléfono:</strong> ${movimiento.telefonoCliente}</p>` : ''}
                        </div>
                        <div class="col-md-6">
                            ${movimiento.montoPrestamo ? `<p class="mb-1"><strong><i class="fas fa-money-bill me-1"></i>Monto Préstamo:</strong> $${parseFloat(movimiento.montoPrestamo).toFixed(2)}</p>` : ''}
                            ${movimiento.tipoPrestamo ? `<p class="mb-1"><strong><i class="fas fa-calendar me-1"></i>Tipo:</strong> ${movimiento.tipoPrestamo}</p>` : ''}
                            ${movimiento.estadoPrestamo ? `<p class="mb-0"><strong><i class="fas fa-flag me-1"></i>Estado:</strong> 
                                <span class="badge ${movimiento.estadoPrestamo === 'A' ? 'bg-success' :
                movimiento.estadoPrestamo === 'C' ? 'bg-primary' : 'bg-secondary'}">
                                    ${movimiento.estadoPrestamo === 'A' ? 'Activo' :
                movimiento.estadoPrestamo === 'C' ? 'Cancelado' : 'Otro'}
                                </span></p>` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Observaciones automáticas -->
            <div class="card border-warning">
                <div class="card-header bg-warning">
                    <h6 class="mb-0"><i class="fas fa-comment me-2"></i>Observaciones del Sistema</h6>
                </div>
                <div class="card-body">
                    <ul class="list-unstyled mb-0">
                        ${movimiento.pagado == 1 ?
            '<li><i class="fas fa-check-circle text-success me-2"></i>Transacción procesada exitosamente</li>' :
            '<li><i class="fas fa-clock text-warning me-2"></i>Transacción pendiente de procesamiento</li>'}
                        
                        ${movimiento.tipo === "EGRESO" ?
            '<li><i class="fas fa-money-bill-wave text-primary me-2"></i>Dinero entregado al cliente (desembolso)</li>' :
            '<li><i class="fas fa-hand-holding-usd text-success me-2"></i>Dinero recibido del cliente (pago)</li>'}
                        
                        ${movimiento.mora && movimiento.mora > 0 ?
            `<li><i class="fas fa-exclamation-triangle text-warning me-2"></i>Incluye recargo por mora: $${parseFloat(movimiento.mora).toFixed(2)}</li>` : ''}
                        
                        ${movimiento.estadoPrestamo === 'C' ?
            '<li><i class="fas fa-trophy text-success me-2"></i>¡Este movimiento completó la liquidación del préstamo!</li>' : ''}
                    </ul>
                </div>
            </div>
        </div>
    `;

    // Mostrar el modal
    Swal.fire({
        title: `<i class="${iconClass} me-2"></i>Detalle Completo del Movimiento`,
        html: modalContent,
        width: '900px',
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: '<i class="fas fa-receipt me-1"></i>Generar Comprobante',
        cancelButtonText: '<i class="fas fa-times me-1"></i>Cerrar',
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        customClass: {
            container: 'swal-wide'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Generar comprobante con datos completos
            generarComprobanteCompleto(movimiento);
        }
    });
}

// ✅ FUNCIÓN MEJORADA para generar comprobante con datos completos
function generarComprobanteCompleto(movimiento) {
    const fecha = movimiento.fechaPago ? new Date(movimiento.fechaPago) : new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-ES');

    const docDefinition = {
        pageSize: { width: 226.77, height: 'auto' },
        pageMargins: [10, 10, 10, 10],
        defaultStyle: { fontSize: 9 },
        content: [
            {
                text: 'CREDI-EXPRESS DE EL SALVADOR',
                fontSize: 11,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 5]
            },
            {
                text: 'COMPROBANTE DETALLADO DE MOVIMIENTO',
                fontSize: 10,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 10]
            },
            {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 206, y2: 0, lineWidth: 1 }],
                margin: [0, 0, 0, 10]
            },
            {
                table: {
                    widths: ['35%', '65%'],
                    body: [
                        [{ text: 'FECHA:', bold: true }, fechaFormateada],
                        [{ text: 'HORA:', bold: true }, movimiento.hora || ''],
                        [{ text: 'MOVIMIENTO:', bold: true }, `#${movimiento.id}`],
                        [{ text: 'TIPO:', bold: true }, movimiento.tipo],
                        [{ text: 'CONCEPTO:', bold: true }, movimiento.concepto || ''],
                        [{ text: 'MÉTODO:', bold: true }, movimiento.tipoPago || 'EFECTIVO'],
                        [{ text: 'USUARIO:', bold: true }, movimiento.usuario || 'Sistema']
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            },

            // Cliente
            {
                text: 'CLIENTE',
                fontSize: 9,
                bold: true,
                decoration: 'underline',
                margin: [0, 5, 0, 5]
            },
            {
                table: {
                    widths: ['100%'],
                    body: [
                        [{ text: movimiento.cliente || 'Cliente no especificado', fontSize: 9, bold: true }],
                        ...(movimiento.duiCliente ? [[{ text: `DUI: ${movimiento.duiCliente}` }]] : []),
                        ...(movimiento.telefonoCliente ? [[{ text: `Tel: ${movimiento.telefonoCliente}` }]] : [])
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            },

            // Desglose financiero
            {
                text: 'DETALLE FINANCIERO',
                fontSize: 9,
                bold: true,
                decoration: 'underline',
                margin: [0, 5, 0, 5]
            },
            {
                table: {
                    widths: ['60%', '40%'],
                    body: [
                        ...(movimiento.capital && movimiento.capital > 0 ? [[{ text: 'Capital:', bold: true }, { text: `$${parseFloat(movimiento.capital).toFixed(2)}`, alignment: 'right' }]] : []),
                        ...(movimiento.interes && movimiento.interes > 0 ? [[{ text: 'Interés:', bold: true }, { text: `$${parseFloat(movimiento.interes).toFixed(2)}`, alignment: 'right' }]] : []),
                        ...(movimiento.mora && movimiento.mora > 0 ? [[{ text: 'Mora:', bold: true }, { text: `$${parseFloat(movimiento.mora).toFixed(2)}`, alignment: 'right', color: '#d32f2f' }]] : []),
                        [{ text: 'TOTAL:', bold: true, fontSize: 10 }, { text: `$${parseFloat(movimiento.monto).toFixed(2)}`, alignment: 'right', bold: true, fontSize: 10, color: '#1976D2' }]
                    ]
                },
                layout: 'lightHorizontalLines',
                margin: [0, 0, 0, 15]
            },

            // Información del préstamo
            ...(movimiento.idPrestamo ? [
                {
                    table: {
                        widths: ['100%'],
                        body: [
                            [{ text: `Préstamo #${movimiento.idPrestamo} - ${movimiento.tipoPrestamo || ''}`, fontSize: 8, alignment: 'center' }],
                            [{ text: `Estado: ${movimiento.estadoPrestamo === 'A' ? 'Activo' : movimiento.estadoPrestamo === 'C' ? 'Cancelado' : 'Otro'}`, fontSize: 8, alignment: 'center' }]
                        ]
                    },
                    layout: 'noBorders',
                    margin: [0, 10, 0, 15]
                }
            ] : []),

            {
                text: 'CREDI-EXPRESS DE EL SALVADOR\nComprobante oficial detallado',
                alignment: 'center',
                fontSize: 7,
                italics: true,
                margin: [0, 15, 0, 0]
            }
        ]
    };

    // Mostrar opciones para el PDF
    mostrarOpcionesPDF(docDefinition, 'COMPROBANTE DETALLADO', `MovimientoDetallado_${movimiento.id}_${Date.now()}`);
}

// NUEVA FUNCIÓN para obtener préstamos con calendario
function buscarPrestamosConCalendario(idCliente) {
    $.ajax({
        url: `/Auxiliares/GetPrestamosConCalendario?idCliente=${idCliente}`,
        method: 'GET',
        success: function (data) {
            if (data && data.success && Array.isArray(data.data)) {
                if (data.data.length === 0) {
                    mostrarError("No se encontraron préstamos activos para este cliente");
                    return;
                }
                mostrarListaPrestamosConCalendario(data.data);
            } else {
                mostrarError("No se encontraron préstamos activos para este cliente");
            }
        },
        error: function (xhr, status, error) {
            console.error('Error al buscar préstamos:', error);
            mostrarError('Error al buscar los préstamos. Intente nuevamente.');
        }
    });
}

// NUEVA FUNCIÓN para mostrar préstamos con información del calendario
function mostrarListaPrestamosConCalendario(prestamos) {
    const contenedor = $('#listaPrestamos');
    contenedor.empty();
    $('#cantidadPrestamos').text(prestamos.length);
    console.log("prestamos");
    console.log(prestamos);
    prestamos.forEach(function (prestamo, index) {
        const estadoMora = prestamo.cuotasVencidas > 0
            ? `<span class="badge bg-danger">Mora: ${prestamo.cuotasVencidas} cuotas</span>`
            : `<span class="badge bg-success">Al día</span>`;

        const cardPrestamo = `
            <div class="card mb-2 prestamo-card" data-prestamo='${JSON.stringify(prestamo)}' 
                 onclick="seleccionarPrestamoConCalendario(${index})" style="cursor: pointer;">
                <div class="card-body p-3">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <strong class="text-primary">Préstamo #${prestamo.id}</strong>
                            <br><small class="text-muted">${prestamo.tipoPrestamo}</small>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Monto Original</small><br>
                            <strong>$${prestamo.monto.toFixed(2)}</strong>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Cuota</small><br>
                            <strong class="text-success">$${prestamo.cuotas.toFixed(2)}</strong>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Progreso</small><br>
                            <strong>${prestamo.cuotasPagadas}/${prestamo.numCuotas}</strong>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Saldo Capital</small><br>
                            <strong class="text-warning">$${prestamo.capitalPendiente.toFixed(2)}</strong>
                        </div>
                        <div class="col-md-2 text-center">
                            ${estadoMora}
                            <br><small class="text-info">Próxima: #${prestamo.proximaCuota}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        contenedor.append(cardPrestamo);
    });
}

// NUEVA FUNCIÓN para seleccionar préstamo y cargar cronograma real
function seleccionarPrestamoConCalendario(index) {
    const prestamos = JSON.parse($('#listaPrestamos').find('.prestamo-card').eq(index).attr('data-prestamo'));

    $('#prestamoIdSeleccionado').text(prestamos.id);
    $('#prestamoCuotaMensual').text('$' + prestamos.cuotas.toFixed(2));
    $('#prestamoProximaCuota').text(prestamos.proximaCuota || 'Sin cuotas pendientes');  
    $('#prestamoSeleccionadoId').val(prestamos.id);
    $('#prestamoFechaVencimiento').val(prestamos.proximaFecha);

    // Mostrar formulario y cronograma
    $('#seccionFormularioCobro').show();
    $('#seccionCronograma').show();
    $('#btnGuardarCobro').show();

    // Cargar cronograma real
    cargarCronogramaReal(prestamos.id);

    // Resaltar préstamo seleccionado
    $('.prestamo-card').removeClass('border-success bg-light');
    $('.prestamo-card').eq(index).addClass('border-success bg-light');
}

// NUEVA FUNCIÓN para cargar cronograma desde la base de datos
function cargarCronogramaReal(idPrestamo) {
    $.ajax({
        url: `/Auxiliares/GetCronogramaPagosReal?idPrestamo=${idPrestamo}`,
        method: 'GET',
        success: function (response) {
            if (response.success && response.cronograma) {
                mostrarCronogramaReal(response.cronograma);
            } else {
                $('#tablaCronograma').html('<tr><td colspan="6" class="text-center text-muted">No se pudo cargar el cronograma</td></tr>');
            }
        },
        error: function () {
            $('#tablaCronograma').html('<tr><td colspan="6" class="text-center text-danger">Error al cargar cronograma</td></tr>');
        }
    });
}

// NUEVA FUNCIÓN para mostrar cronograma con selección de cuotas
function mostrarCronogramaReal(cronograma) {
    const tbody = $('#tablaCronograma');
    tbody.empty();
    console.log('mostrarCronogramaReal cronograma');
    console.log(cronograma);
    cronograma.forEach(function (cuota) {
        let estadoBadge = '';
        let claseRow = '';
        let seleccionable = '';

        if (cuota.pagado) {
            estadoBadge = '<span class="badge bg-success">Pagado</span>';
            claseRow = 'table-success';
        } else if (cuota.vencido) {
            estadoBadge = '<span class="badge bg-danger">Vencido</span>';
            claseRow = 'table-danger';
        } else {
            estadoBadge = '<span class="badge bg-warning">Pendiente</span>';
        }

        // Permitir selección si se puede pagar
        if (cuota.puedeSeleccionar && !cuota.pagado) {
            cronogramaData = {};
            seleccionable = `
                <button class="btn btn-sm btn-primary" onclick="seleccionarCuotaParaPago(${cuota.numeroCuota}, '${cuota.fechaProgramada}', ${cuota.montoCuota}, ${cuota.capital}, ${cuota.interes}, ${cuota.mora},${cuota.domicilio}, ${cuota.saldoPendiente})">
                    <i class="fas fa-hand-holding-usd"></i> Pagar
                </button>
            `;
        }

        const fila = `
            <tr class="${claseRow}">
                <td><strong>#${cuota.numeroCuota}</strong></td>
                <td>${cuota.fechaProgramada}</td>
                <td>$${parseFloat(cuota.montoCuota).toFixed(2)}</td>
                <td>$${parseFloat(cuota.montoPagado).toFixed(2)}</td>
                <td>${estadoBadge}</td>
                <td>${cuota.fechaRealPago || '-'}</td>
                <td class="text-center">${seleccionable}</td>
            </tr>
        `;
        tbody.append(fila);
    });
}

// NUEVA FUNCIÓN para seleccionar cuota específica para pago
function seleccionarCuotaParaPago(numeroCuota, fechaProgramada, montoCuota, capital, interes, mora, domicilio, saldoPendiente) {
    // Pre-llenar el formulario con los datos de la cuota seleccionada
    $('#numeroCuota').val(numeroCuota);
    $('#conceptoCobro').val('CUOTA_COMPLETA');
    cronogramaData =
    {
        numeroCuota: numeroCuota,
        fechaProgramada: fechaProgramada,
        montoCuota: montoCuota,
        capital: capital,
        interes: interes,
        mora: mora,
        domicilio: domicilio,
        saldoPendiente: saldoPendiente
    };

    $('#montoCapital').val(capital.toFixed(2));
    $('#montoInteres').val(interes.toFixed(2));
    $('#montoMora').val(mora.toFixed(2));
    $('#montoDomicilio').val(domicilio.toFixed(2));
    //justa y calcula
    ajustarCamposCobro();


    // Agregar campo oculto para identificar la cuota específica
    if ($('#cuotaSeleccionada').length === 0) {
        $('#formCobro').append(`<input type="hidden" id="cuotaSeleccionada" name="numeroCuotaSeleccionada" value="${numeroCuota}">`);
        $('#formCobro').append(`<input type="hidden" id="fechaCuotaSeleccionada" name="fechaCuota" value="${fechaProgramada}">`);
    } else {
        $('#cuotaSeleccionada').val(numeroCuota);
        $('#fechaCuotaSeleccionada').val(fechaProgramada);
    }

    // Resaltar la cuota seleccionada
    $('#tablaCronograma tr').removeClass('table-info');
    $(`#tablaCronograma tr:contains("#${numeroCuota}")`).addClass('table-info');

    // Scroll hasta el formulario
    $('html, body').animate({
        scrollTop: $("#formCobro").offset().top - 100
    }, 500);

    Swal.fire({
        title: '¡Cuota Seleccionada!',
        html: `
            <div class="text-center">
                <h4>Cuota #${numeroCuota}</h4>
                <p><strong>Fecha programada:</strong> ${fechaProgramada}</p>
                <p><strong>Monto:</strong> $${montoCuota.toFixed(2)}</p>
            </div>
        `,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });
}