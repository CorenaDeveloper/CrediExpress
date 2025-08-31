let prestamosData = [];

// Evento para buscar con Enter
$(document).ready(function () {
    $('#dui').keypress(function (e) {
        if (e.which == 13) {
            buscarCliente();
        }
    });
});

// Función principal para buscar cliente
function buscarCliente() {
    const dui = $('#dui').val().trim();

    if (!dui) {
        Swal.fire("Advertencia", "Por favor ingrese un DUI válido", "warning");
        return;
    }

    showLoadingSpinner();
    limpiarDatos();

    $.ajax({
        url: `/Auxiliares/GetClienteDetalle?dui=${dui}`,
        method: 'GET',
        success: function (resp) {
            if (!resp || typeof resp !== "object" || Object.keys(resp).length === 0) {
                mostrarError("No se encontró un cliente registrado con ese DUI");
                return;
            }

            let cliente = resp;
            //=========================================================
            //Mostrar datos de cliente
            //=========================================================

            $('#clienteNombre').text(`${cliente.nombre || ''} ${cliente.apellido || ''}`.trim());
            $('#clienteDui').text(cliente.dui || "Sin DUI");
            $('#clienteTelefono').text(cliente.celular + " " + (cliente.telefono != "N/A" ? cliente.telefono : ""));
            $('#clienteGestor').text(cliente.gestorNombre || "Sin gestor asignado");

            // Estado del cliente
            const activo = cliente.activo === 1;
            const cardElement = $('#clienteInfoCard');
            const estadoBadge = $('#clienteEstadoBadge');
            const estadoTexto = $('#clienteEstadoTexto');

            if (activo) {
                cardElement.removeClass('cliente-inactivo').addClass('cliente-activo');
                estadoTexto.text('Cliente Activo');
                estadoBadge.removeClass('bg-danger').addClass('bg-success')
                    .html('<i class="fas fa-check-circle me-1"></i>Cliente Activo');
            } else {
                cardElement.removeClass('cliente-activo').addClass('cliente-inactivo');
                estadoTexto.text('Cliente Inactivo');
                estadoBadge.removeClass('bg-success').addClass('bg-danger')
                    .html('<i class="fas fa-exclamation-triangle me-1"></i>Cliente Inactivo');

                Swal.fire("Advertencia", "El cliente está marcado como INACTIVO. Verifique antes de continuar.", "warning");
            }

            $('#seccionBusqueda').hide();
            $('#seccionCliente').show();
            $('#seccionEstadisticas').show();


            //=========================================================
            // Cargas historico de cliente
            //=========================================================
            cargarHistorialPrestamos(resp.id);
        },
        error: function (xhr, status, error) {
            console.error('Error al buscar cliente:', error);
            mostrarError('Error al consultar los datos del cliente');
            hideLoadingSpinner();
        }
    });
}


// Cargar historial de préstamos
function cargarHistorialPrestamos(idCliente) {
    if (window.myPieChart) {
        window.myPieChart.destroy();
        window.myPieChart = null;
    }
    if (window.myLineChart) {
        window.myLineChart.destroy();
        window.myLineChart = null;
    }

    $.ajax({
        url: `/Auxiliares/GetPrestamosXCliente?idCliente=${idCliente}`,
        method: 'GET',
        success: function (data) {
            let prestamos = [];
            const container = $('#listaPrestamos');

            if (data && data.success && data.data && Array.isArray(data.data)) {
                prestamos = data.data;
            } else if (data && Array.isArray(data)) {
                prestamos = data;
            }         
            container.empty();
            prestamosData = prestamos;

            //=========================================================
            //Estadisticas del cliente
            //=========================================================
            console.log(prestamos);
            var pieChart = document.getElementById('pieChart').getContext('2d');
            var lineChart = document.getElementById('lineChart').getContext('2d')

            const solicitudesAprobadas = prestamos.filter(p => p.estado === 'A' || p.estado === 'C').length;
            const solicitudesPendientes = prestamos.filter(p => p.estado === 'P').length;
            const solicitudRechazada = prestamos.filter(p => p.estado === 'P').length;

            

            const totalPrestado = prestamos
                .filter(p => p.aprobado === 1)
                .reduce((sum, p) => sum + (p.monto || 0), 0);


            //==========================================================
            // PRESTAMOS CANCELADOS Y ACTIVOS
            //==========================================================

            // Toma prestamos aprobados y ordena por fecha
            const prestamosAprobados = prestamos
                .filter(p => p.aprobado === true)
                .sort((a, b) => new Date(a.fecha != null ? a.fecha : a.fechaCreacion) - new Date(b.fecha != null ? b.fecha : b.fechaCreacion));

            // Agrupar por fecha específica
            const prestamosPorFecha = {};
            prestamosAprobados.forEach(prestamo => {
                const fecha = prestamo.fecha != null ? prestamo.fecha : prestamo.fechaCreacion; // formato: "2025-08-20"
                if (!prestamosPorFecha[fecha]) {
                    prestamosPorFecha[fecha] = 0;
                }
                prestamosPorFecha[fecha] += prestamo.monto || 0;
            });

            // Crear arrays para labels y datos
            const fechasCompletas = Object.keys(prestamosPorFecha); // fechas completas para tooltips
            const fechasLabels = fechasCompletas.map(fecha => {
                const date = new Date(fecha);
                return date.toLocaleDateString('es-SV', { month: '2-digit', year: 'numeric' }); // formato: "08/2025"
            });

            const montosData = Object.values(prestamosPorFecha);

            // PRESTAMOS POR FECHA - MONTOS APROBADOS
            window.myLineChart = new Chart(lineChart, {
                type: 'line',
                data: {
                    labels: fechasLabels,
                    datasets: [{
                        label: "Monto Prestado ($)",
                        borderColor: "#1d7af3",
                        pointBorderColor: "#FFF",
                        pointBackgroundColor: "#1d7af3",
                        pointBorderWidth: 2,
                        pointHoverRadius: 4,
                        pointHoverBorderWidth: 1,
                        pointRadius: 4,
                        backgroundColor: 'transparent',
                        fill: true,
                        borderWidth: 2,
                        data: montosData
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            fontColor: '#1d7af3',
                        }
                    },
                    tooltips: {
                        bodySpacing: 4,
                        mode: "nearest",
                        intersect: 0,
                        position: "nearest",
                        xPadding: 10,
                        yPadding: 10,
                        caretPadding: 10,
                        callbacks: {
                            title: function (tooltipItems, data) {
                                const index = tooltipItems[0].index;
                                const fechaCompleta = fechasCompletas[index];
                                const date = new Date(fechaCompleta);
                                return date.toLocaleDateString('es-SV', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                }); // formato: "20/08/2025"
                            },
                            label: function (tooltipItem, data) {
                                return `Monto: ${tooltipItem.yLabel.toLocaleString('es-SV', { minimumFractionDigits: 2 })}`;
                            }
                        }
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                callback: function (value) {
                                    return '$' + value.toLocaleString('es-SV');
                                }
                            }
                        }]
                    },
                    layout: {
                        padding: { left: 15, right: 15, top: 15, bottom: 15 }
                    }
                }
            });

            //=========================================================
            // ESTADISTICAS DE SOLICITUDES APROBADAS , PENDIENTES Y RECHAZADAS
            //=========================================================

           
            window.myPieChart = new Chart(pieChart, {
                type: 'pie',
                data: {
                    datasets: [{
                        data: [solicitudesAprobadas, solicitudesPendientes, solicitudRechazada],
                        backgroundColor: ["#1d7af3", "#fdaf4b", "#f3545d"],
                        borderWidth: 0
                    }],
                    labels: ['Aprobados', 'Pendientes', 'Rechazadas']
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        position: 'bottom',
                        labels: {
                            fontColor: 'rgb(154, 154, 154)',
                            fontSize: 11,
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    pieceLabel: {
                        render: 'value',
                        fontColor: 'white',
                        fontSize: 14,
                    },
                    tooltips: {
                        enabled: true, // Habilitado para mostrar información detallada
                        callbacks: {
                            label: function (tooltipItem, data) {
                                const label = data.labels[tooltipItem.index];
                                const value = data.datasets[0].data[tooltipItem.index];
                                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    },
                    layout: {
                        padding: {
                            left: 20,
                            right: 20,
                            top: 20,
                            bottom: 20
                        }
                    }
                }
            })

       
            //Listado de prestamos de cliente
            if (prestamos.length === 0) {
                container.html(`
                    <div class="alert alert-info text-center">
                        <i class="fas fa-info-circle me-2"></i>
                        Este cliente no tiene historial de préstamos
                    </div>
                `);
                return;
            }

            prestamos.forEach(prestamo => {

                const estadoClass = prestamo.estado === 'A' ? 'prestamo-activo' :
                    prestamo.estado === 'C' ? 'prestamo-cancelado' : 'prestamo-rechazado';

                const estadoBadge = prestamo.estado === 'A' ? 'bg-primary' :
                    prestamo.estado === 'C' ? 'bg-secondary' : prestamo.estado === 'R' ? 'bg-danger' : prestamo.estado === 'P' ? 'bg-warning '  : 'bg-danger';

                const estadoTexto = prestamo.estado === 'A' ? 'Activo' :
                    prestamo.estado === 'C' ? 'Cancelado' :
                        prestamo.detalleAprobado || 'Rechazado';

                const card = `
                    <div class="prestamo-card ${estadoClass} mb-3">
                        <div class="row g-0">
                            <div class="col-md-9">
                                <div class="p-3">
                                    <div class="row">
                                        <div class="col-md-3">
                                            <h6 class="text-primary mb-1">Préstamo #${prestamo.id}</h6>
                                            <small class="text-muted">${prestamo.fecha || 'Sin fecha'}</small>
                                        </div>
                                        <div class="col-md-3">
                                            <span class="badge ${estadoBadge} mb-1">${estadoTexto}</span>
                                            <br><small class="text-muted">${prestamo.numCuotas || 0} cuotas</small>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>$${(prestamo.monto || 0).toLocaleString('es-SV', { minimumFractionDigits: 2 })}</strong>
                                            <br><small class="text-muted">Cuota: $${(prestamo.cuotas || 0).toFixed(2)}</small>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Interes: ${(prestamo.tasa || 0)}% | Domicilio ${(prestamo.tasaDomicilio) || 0}%</strong>
                                            <br><small class="text-muted">Próximo: ${prestamo.proximoPago || 'N/A'}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="p-3 text-center">
                                    ${prestamo.estado === 'A' ?
                        `<button class="btn btn-detalle btn-sm w-100" onclick="verDetallePrestamo(${prestamo.id})">
                                            <i class="fas fa-eye me-2"></i>Ver Detalle
                                        </button>` :
                        `<button class="btn btn-outline-secondary btn-sm w-100" onclick="verDetallePrestamo(${prestamo.id})">
                                            <i class="fas fa-history me-2"></i>Ver Historial
                                        </button>`
                    }
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                container.append(card);
            });

            $('#seccionPrestamos').show();
            hideLoadingSpinner();
        },
        error: function (xhr, status, error) {
            console.error('Error al cargar historial:', error);
            mostrarError('Error al cargar el historial de préstamos');
            hideLoadingSpinner();
        }
    });
}





// Ver detalle de un préstamo específico
function verDetallePrestamo(idPrestamo) {
    $('#modalPrestamoId').text(idPrestamo);
    $('#modalDetallePrestamo').modal('show');

    // Resetear contenido del modal
    $('#modalContenido').html(`
                <div class="text-center py-4">
                    <div class="spinner-border text-primary"></div>
                    <p class="mt-2">Cargando detalle del préstamo...</p>
                </div>
            `);

    $.ajax({
        url: `/Auxiliares/GetDetallePrestamos?idPrestamo=${idPrestamo}`,
        method: 'GET',
        success: function (response) {
            let pagos = response;
            //=========================================================
            // Mostrar detalle del préstamo
            //=========================================================
            if (!Array.isArray(pagos) || pagos.length === 0) {
                $('#modalContenido').html(`
                    <div class="alert alert-warning">
                        <i class="fas fa-info-circle me-2"></i>
                        No se encontraron detalles de pago para este préstamo
                    </div>
                `);
                return;
            }

            // Buscar info del préstamo en nuestros datos
            const prestamo = prestamosData.find(p => p.id === idPrestamo);

            let html = '';

            // Resumen del préstamo
            if (prestamo) {
                html += `
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <h6 class="card-title">Información del Préstamo</h6>
                                    <div class="row">
                                        <div class="col-md-3">
                                            <strong>Monto:</strong> $${(prestamo.monto || 0).toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Cuotas:</strong> ${prestamo.numCuotas || 0}
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Interes:</strong> ${prestamo.tasa || 0}%  <strong> | Domicilio:</strong>  ${prestamo.tasaDomicilio || 0}% 
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Estado:</strong> 
                                            <span class="badge ${prestamo.estado === 'A' ? 'bg-success' : 'bg-secondary'}">
                                                ${prestamo.estado === 'A' ? 'Activo' : 'Cancelado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Tabla de pagos
            html += `
                <div class="row">
                    <div class="col-12">
                        <h6>Cronograma de Pagos</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-pagos">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Fecha Pago</th>
                                        <th>Fecha Cuota</th>
                                        <th>Monto</th>
                                        <th>Capital</th>
                                        <th>Interés</th>
                                        <th>Tipo</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            pagos.forEach(pago => {
                const estadoPago = pago.pagado === 1 ? 'Pagado' : 'Pendiente';
                const claseFila = pago.pagado === 1 ? 'table-success' : 'table-warning';

                html += `
                    <tr class="${claseFila}">
                        <td>${pago.numeropago || '-'}</td>
                        <td>${pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-SV') : '-'}</td>
                        <td>${pago.fechaCouta ? new Date(pago.fechaCouta).toLocaleDateString('es-SV') : '-'}</td>
                        <td>$${(pago.monto || 0).toFixed(2)}</td>
                        <td>$${(pago.capital || 0).toFixed(2)}</td>
                        <td>$${((pago.monto || 0) - (pago.capital || 0) - (pago.mora || 0)).toFixed(2)}</td>
                        <td>$${(pago.mora || 0).toFixed(2)}</td>
                        <td>
                            <span class="badge ${pago.pagado === 1 ? 'bg-success' : 'bg-warning'}">
                                ${estadoPago}
                            </span>
                        </td>
                    </tr>
                `;
            });

            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            $('#modalContenido').html(html);
        },
        error: function (xhr, status, error) {
            console.error('Error al cargar detalle:', error);
            $('#modalContenido').html(`
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Error al cargar el detalle del préstamo
                        </div>
                    `);
        }
    });
}

//==========================================================
// Funciones auxiliares
//==========================================================
function mostrarError(mensaje) {
    $('#textoError').text(mensaje);
    $('#mensajeError').show();
    hideLoadingSpinner();
}

function limpiarDatos() {
    $('#mensajeError').hide();
    $('#seccionCliente').hide();
    $('#seccionEstadisticas').hide();
    $('#seccionPrestamos').hide();
    prestamosData = [];
}

function nuevaBusqueda() {
    limpiarDatos();
    $('#seccionBusqueda').show();
    $('#dui').val('').focus();
}