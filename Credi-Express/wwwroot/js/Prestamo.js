let tabla;

$(document).ready(function () {
    // Establecer fechas por defecto al cargar la página
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1); // 0 = enero

    // Formato YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];

    $('#txtFechaDesde').val(formatDate(yearStart));
    $('#txtFechaHasta').val(formatDate(today));

    $('#btnFiltrar').on('click', function () {
        const estado = $('#estadoFiltro').val();
        const fechaInicio = $('#txtFechaDesde').val();
        const fechaFin = $('#txtFechaHasta').val();
        const extra = $('#selectExtra').val();
     
        showLoadingSpinner();
        $.ajax({
            url: `/Auxiliares/GetPrestamos?estado=${estado}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&extra=${extra}`,
            method: 'GET',
            success: function (data) {
                console.log(data);

                if ($.fn.dataTable.isDataTable('#tblPrestamos')) {
                    $('#tblPrestamos').DataTable().destroy();
                }

                $('#contenedorTabla').show();

                tabla = $('#tblPrestamos').DataTable({
                    language: {
                        url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
                    },
                    processing: true,
                    serverSide: false,
                    data: data,
                    dom: 'frtip',
                    "columns": [
                        {
                            "data": "id",
                            "title": "N° Gestion",
                            "className": "tamano2"
                        },
                        {
                            "data": "nombreCliente",
                            "title": "Cliente",
                            "className": "tamano2"
                        },
                        {
                            "data": "estado",
                            "title": "Estado",
                            "className": "tamano1",
                            "render": function (data, type, row, meta) {
                                let estado = data == 'E' ? 'ELIMINADO' : data == 'C' ? 'CANCELADO' : data == 'A' ? 'ACTIVO' : 'INDEFINIDO';
                                return estado;
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
                            "data": "tasa",
                            "title": "Tasa",
                            "className": "tamano1",
                            "render": function (data, type, row, meta) {
                                let tasa = parseFloat(data).toFixed(2);
                                return `${tasa} %`;
                            }
                        },
                        {
                            "data": "numCoutas",
                            "title": "Coutas",
                            "className": "tamano1"
                        },                   
                        {
                            "data": null,
                            "title": "Opciones",
                            "className": "dt-body-center tamano1",
                            "render": function (data, type, row, meta) {
                                return `<button type="button" class="btn btn-primary btn-sm" onclick="detalle(${meta.row})">
                                         <i class="fas fa-eye"></i>
                                       </button>`;
                            }
                        }                  
                    ],
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

});


function detalle(index) {
    const row = tabla.row(index).data();
    const idPrestamo = row.id;

    // Mostrar el modal (Bootstrap 5)
    const modalElement = document.getElementById('detalleClienteModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Esperar a que el modal esté completamente visible antes de inicializar la tabla
    $(modalElement).one('shown.bs.modal', function () {
        $.ajax({
            url: `/Auxiliares/GetDetallePrestamos?idPrestamo=${idPrestamo}`,
            method: 'GET',
            success: function (resp) {
                console.log(resp);
                let saldo = 0;  
                // ✅ 1. Ordenar por fechaPago ascendente
                resp.sort((a, b) => new Date(a.fechaPago) - new Date(b.fechaPago));

                // ✅ 2. Asignar contador según orden
                resp.forEach((item, index) => {
                    item.contador = index + 1; // empieza en 1
                    saldo += parseFloat(item.capital);
                });

                const tbody = document.querySelector('#tblpagosdetalles tbody');
                tbody.innerHTML = ''; // limpiar antes de agregar

                resp.forEach(pago => {
                    const fila = document.createElement('tr');

                    fila.innerHTML = `
            <td class="tamano1">
                <button class="btn btn-icon btn-round btn-success btn-sm me-2">
                    <i class="fa fa-check"></i>
                </button> Cuota #${pago.contador}
            </td>
            <td class="tamano1">$ ${parseFloat(pago.monto).toFixed(2)}</td>
            <td class="tamano1">${pago.fechaPago}</td>
            <td class="tamano1">${pago.fechaPago}</td>
            <td>
                ${pago.pagado == 1
                            ? '<span class="badge badge-success">PAGADO</span>'
                            : '<span class="badge badge-danger">PENDIENTE</span>'
                        }
            </td>
        `;

                    tbody.appendChild(fila);
                });
                let saldorestante = row.monto - saldo;
                $("#clienteSaldo").html(`$ ${saldorestante.toFixed(2)}`);
            },
            error: function (xhr, status, error) {
                console.error('Error al cargar los préstamos:', error);
                $('#resultadoPrestamos').html('<p class="text-danger">Ocurrió un error al cargar los datos.</p>');
            }
        });
    });

    // Rellenar info del cliente en el modal
    const estado = row.estado == 'E' ? 'ELIMINADO' :
        row.estado == 'C' ? 'CANCELADO' :
            row.estado == 'A' ? 'ACTIVO' : 'INDEFINIDO';

    $("#clienteNumeroPrestamo").html(row.id);
    $("#clienteNombre").html(row.nombreCliente);
    $("#clienteEstado").html(estado);
    $("#clienteFecha").html(row.fecha);
    $("#clienteMonto").html(`$ ${parseFloat(row.monto).toFixed(2)}`);
    $("#clienteTasa").html(`${parseFloat(row.tasa).toFixed(2)} %`);
    $("#clienteCoutas").html(row.numCoutas);
    $("#clienteinteres").html(`$ ${parseFloat(row.interes).toFixed(2)}`);
    $("#clienteMontoCouta").html(`${parseFloat(row.cuotas).toFixed(2)}`);

}
