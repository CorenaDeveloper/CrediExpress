var table;
var map;
var marker;
let debounceTimeout;
let newMap, newMarker, newDebounceTimeout;
let permisosUsuario = [];
let mapData = {};
let currentImageUrl = '';
let currentImageName = ''

$(document).ready(function () {
    showLoadingSpinner();
    cargarClientes();
    cargarDepartamentos();
    cargarGestores();
    cargarPermisosUsuario();
});

function cargarPermisosUsuario() {
    $.ajax({
        url: '/Auxiliares/GetPermisosUsuario',
        method: 'GET',
        success: function (response) {
            permisosUsuario = response.permisos;
            aplicarPermisosEnInterfaz();
        },
        error: function () {
            console.error('Error al cargar permisos del usuario');
        }
    });
}


function tienePermiso(modulo, permiso) {
    const permisoCompleto = `${modulo}:${permiso}`;
    return permisosUsuario.includes(permisoCompleto);
}

function aplicarPermisosEnInterfaz() {
    // Ocultar botones según permisos

    // Ejemplo para Clientes
    if (!tienePermiso('Home/Clientes', 'Create')) {
        $('[data-bs-target="#nuevoCliente"]').hide();
        $('.btnNuevoCliente').hide();
    }

    if (!tienePermiso('Home/Clientes', 'Update')) {
        $('.btnEditarCliente').hide();
    }

    if (!tienePermiso('Home/Clientes', 'Delete')) {
        $('.btnEliminarCliente').hide();
    }

    // Ejemplo para Préstamos
    if (!tienePermiso('Home/Prestamos', 'Create')) {
        $('.btnNuevoPrestamo').hide();
    }

    // Ejemplo para Solicitudes
    if (!tienePermiso('Home/SolicitudesPrestamo', 'Update')) {
        $('.btnAprobar, .btnRechazar').hide();
    }

    // Ejemplo para Movimientos
    if (!tienePermiso('Home/Movimientos', 'Create')) {
        $('.btnNuevoMovimiento').hide();
    }
}

function validarPermisoAntes(modulo, permiso, callback) {
    if (tienePermiso(modulo, permiso)) {
        callback();
    } else {
        Swal.fire({
            title: 'Acceso Denegado',
            text: 'No tienes permisos para realizar esta acción',
            icon: 'error',
            confirmButtonText: 'Entendido'
        });
    }
}
function cargarClientes() {

    fetch('/Auxiliares/GetClientesDataTable')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error del servidor:', data.error);
                alert('Error al cargar los clientes: ' + data.error);
                return;
            }

            // Limpiar tabla y agregar nuevos datos
            if ($.fn.dataTable.isDataTable('#tblCLientes')) {
                $('#tblCLientes').DataTable().destroy();
            }


            table = $('#tblCLientes').DataTable({
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
                },
                orderCellsTop: true,
                processing: true,
                serverSide: false,
                data: data,
                columns: [
                    {
                        data: null,
                        title: "Nombre",
                        render: function (data, type, row) {
                            return `${row.nombre} ${row.apellido}`; 
                        }
                    },
                    {
                        data: "dui",
                        title: "Dui"
                    },
                    {
                        data: "celular",
                        title: "Teléfono"
                    },
                    {
                        data: "gestorNombre",
                        title: "Ejecutivo"
                    },
                    {
                        data: null,
                        title: "Opción",
                        className: "text-center text-nowrap",
                        orderable: false,
                        render: function (data, type, row) {
                            let botones = ''; // Agregar contenedor

                            // Botón Ver (siempre visible si tiene Read)
                            if (tienePermiso('Home/Clientes', 'Read')) {
                                botones += `<a href="#"
                           class="btn btn-sm btn-primary btn-round"
                           title="Ver"
                           data-bs-toggle="modal"
                           data-bs-target="#verClienteModal"
                           data-nombre="${row.nombre}"
                           data-apellido="${row.apellido}"
                           data-gestor="${row.gestorNombre}"
                           data-dui="${row.dui}"
                           data-direccion="${row.direccion}"
                           data-telefono="${row.telefono}"
                           data-celular="${row.celular}"
                           data-fechaIngreso="${row.fechaIngreso}"
                           data-departamento="${row.departamento}"
                           data-nombreDepartamento="${row.departamentoNombre}"
                           data-activo="${row.activo}"
                           data-giro="${row.giro}"
                           data-referencia1="${row.referencia1}"
                           data-telReferencia="${row.telefono1}"
                           data-referencia2="${row.referencia2}"
                           data-telReferencia2="${row.telefono2}"
                           data-tipoPer="${row.tipoPer}"
                           data-fechaNacimiento="${row.fechaNacimiento}"
                           data-email="${row.email}"
                           data-init="${row.nit}"
                           data-genero="${row.sexo}"
                           data-longitud="${row.longitud}"
                           data-latitud="${row.latitud}"
                           data-fotonegocio1="${row.fotoNegocio1}"
                           data-fotonegocio2="${row.fotoNegocio2}"
                           data-fotonegocio3="${row.fotoNegocio3}"
                           data-fotonegocio4="${row.fotoNegocio4}"
                           data-duifrente="${row.duiFrente}"
                           data-duiatras="${row.duiDetras}"
                           data-profesion="${row.profesion}">
                            <i class="fas fa-eye"></i>
                        </a>`;
                            }

                            // Botón Editar
                            if (tienePermiso('Home/Clientes', 'Update')) {
                                botones += `  <a href="#"
                           class="btn btn-sm btn-success btn-round"
                           title="Editar"
                           data-bs-toggle="modal"
                           data-bs-target="#editarClienteModal"
                           data-nombre="${row.nombre}"
                           data-apellido="${row.apellido}"
                           data-gestor="${row.gestorNombre}"
                           data-idgestor="${row.idGestor}"
                           data-dui="${row.dui}"
                           data-direccion="${row.direccion}"
                           data-telefono="${row.telefono}"
                           data-celular="${row.celular}"
                           data-fechaingreso="${row.fechaIngreso}"
                           data-departamento="${row.departamento}"
                           data-nombredepartamento="${row.departamentoNombre}"
                           data-activo="${row.activo}"
                           data-giro="${row.giro}"
                           data-referencia1="${row.referencia1}"
                           data-telreferencia="${row.telefono1}"
                           data-referencia2="${row.referencia2}"
                           data-telreferencia2="${row.telefono2}"
                           data-tipoper="${row.tipoPer}"
                           data-fechanacimiento="${row.fechaNacimiento}"
                           data-email="${row.email}"
                           data-nit="${row.nit}"
                           data-genero="${row.sexo}"
                           data-id="${row.id}"
                           data-longitud="${row.longitud}"
                           data-latitud="${row.latitud}"
                           data-fotonegocio1="${row.fotoNegocio1}"
                           data-fotonegocio2="${row.fotoNegocio2}"
                           data-fotonegocio3="${row.fotoNegocio3}"
                           data-fotonegocio4="${row.fotoNegocio4}"
                           data-duifrente="${row.duiFrente}"
                           data-duidetras="${row.duiDetras}"
                           data-profesion="${row.profesion}">
                            <i class="fas fa-edit"></i>
                        </a>`;
                            }

                            // Botón Eliminar
                            if (tienePermiso('Home/Clientes', 'Delete')) {
                                botones += `<a href="#" class="btn btn-sm btn-danger btn-round btnEliminarCliente"
                           title="Eliminar"
                           data-id="${row.id}">
                            <i class="fas fa-trash-alt"></i>
                        </a>`;
                            }

                            return botones;
                        }
                    }
                ],
                initComplete: function () {
                    hideLoadingSpinner();
                }
            });
        })
        .catch(error => {
            console.error('Error al cargar clientes:', error);
            alert('Error de conexión al cargar los clientes');
            hideLoadingSpinner();
        });
}

function cargarDepartamentos() {
    fetch('/Auxiliares/GetDepartamentos')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('editDepartamento');
            const selectNew = document.getElementById('newDepartamento');
            select.innerHTML = '';
            selectNew.innerHTML = '';

            data.forEach(depto => {
                const optionEdit = document.createElement('option');
                optionEdit.value = depto.id;
                optionEdit.text = depto.nombre;
                select.appendChild(optionEdit);

                const optionNew = document.createElement('option');
                optionNew.value = depto.id;
                optionNew.text = depto.nombre;
                selectNew.appendChild(optionNew);
            });
        })
        .catch(error => {
            console.error('Error al cargar departamentos:', error);
        });
}

function cargarGestores() {
    fetch('/Auxiliares/GetGestores')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('editGestor');
            const selectNew = document.getElementById('newGestor');
            select.innerHTML = '';
            selectNew.innerHTML = '';

            data.forEach(gestor => {
                const optionEdit = document.createElement('option');
                optionEdit.value = gestor.id;
                optionEdit.text = gestor.nombre + " " + gestor.apellido + " (" + gestor.departamentoNombre + ")";
                select.appendChild(optionEdit);

                const optionNew = document.createElement('option');
                optionNew.value = gestor.id;
                optionNew.text = gestor.nombre + " " + gestor.apellido + " (" + gestor.departamentoNombre + ")";
                selectNew.appendChild(optionNew);
            });
        })
        .catch(error => {
            console.error('Error al cargar gestores:', error);
        });
}

// Función para recargar la tabla (útil después de crear/editar/eliminar)
function recargarTablaClientes() {
    cargarClientes();
}

$(document).ready(function () {

    $('#verClienteModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        const modal = $(this);
        var longitud = button.data('longitud');
        var latitud = button.data('latitud');
        const duiFrente = button.data('duifrente') || '/assets/img/frente.jpg';
        const duiAtras = button.data('duiatras') || '/assets/img/atras.jpg';
        const activo = button.data('activo');

        const imagenes = [
            button.data('fotonegocio1'),
            button.data('fotonegocio2'),
            button.data('fotonegocio3'),
            button.data('fotonegocio4')
        ];

        imagenes.forEach((url, index) => {
            const imgId = `#imgNegocio${index + 1}`;
            $(imgId).attr('src', url || `/assets/img/ft${index + 1}.jpg`);
        });

        modal.find('#imgDuiFrente').attr('src', duiFrente);
        modal.find('#imgDuiAtras').attr('src', duiAtras);
        modal.find('#modalNombre').text(button.data('nombre'));
        modal.find('#modalApellido').text(button.data('apellido'));
        modal.find('#modalDui').text(button.data('dui'));
        modal.find('#modalNit').text(button.data('init'));
        modal.find('#modalTelefono').text(button.data('telefono'));
        modal.find('#modalCelular').text(button.data('celular'));
        modal.find('#modalDireccion').text(button.data('direccion'));
        modal.find('#modalFechaIngreso').text(button.data('fechaingreso'));
        modal.find('#modalFechaNacimiento').text(button.data('fechanacimiento'));
        modal.find('#modalDepartamento').text(button.data('departamento'));
        modal.find('#modalNombreDepartamento').text(button.data('nombredepartamento'));
        modal.find('#modalGiro').text(button.data('giro'));
        modal.find('#modalTipoPer').text(button.data('tipopersonalidad'));
        modal.find('#modalActivo').text(activo === 1 ? 'Sí' : 'No');
        modal.find('#modalReferencia1').text(button.data('referencia1'));
        modal.find('#modalTelReferencia1').text(button.data('telreferencia'));
        modal.find('#modalReferencia2').text(button.data('referencia2'));
        modal.find('#modalTelReferencia2').text(button.data('telreferencia2'));
        modal.find('#modalGestor').text(button.data('gestor'));

        const genero = button.data('genero');
        const imgSrc = genero === 'F'
            ? 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png'
            : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

        modal.find('#modalGeneroImg').attr('src', imgSrc);

        // Guardar datos del mapa para cargar después
        mapData = {
            latitud: latitud,
            longitud: longitud
        };

        // Limpiar mapa anterior si existe
        if (map) {
            map.remove();
            map = null;
        }

        // Configurar carousel
        const defaultImg = '/assets/img/4058271.jpg';
        const indicatorsContainer = modal.find('#fotoNegocioContent .carousel-indicators');
        const innerContainer = modal.find('#fotoNegocioContent .carousel-inner');

        indicatorsContainer.empty();
        innerContainer.empty();

        imagenes.forEach((img, index) => {
            const isActive = index === 0 ? 'active' : '';

            indicatorsContainer.append(`
            <button type="button" data-bs-target="#fotoNegocioContent" data-bs-slide-to="${index}" class="${isActive}" aria-current="${isActive ? 'true' : 'false'}" aria-label="Slide ${index + 1}"></button>
        `);

            innerContainer.append(`
            <div class="carousel-item ${isActive}">
                 <img src="${img || defaultImg}" class="d-block mx-auto" style="height: 300px; object-fit: cover;" alt="Foto del negocio">
            </div>
        `);
        });
    });

    $('#nuevoCliente').on('show.bs.modal', function () {
        $('#newGestor').val(window.usuarioLogueado.idGestor);
    });

    // Evento para cargar el mapa solo cuando se hace clic en el tab de ubicación
    $('#ubicacion-tab').on('shown.bs.tab', function (e) {
        // Solo cargar si tenemos datos del mapa y el mapa no existe aún
        if (mapData.latitud && mapData.longitud && !map) {
            // Pequeño delay para asegurar que el contenedor esté visible
            setTimeout(() => {
                map = L.map('map').setView([mapData.latitud, mapData.longitud], 13);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);

                L.marker([mapData.latitud, mapData.longitud]).addTo(map)
                    .bindPopup('Ubicación seleccionada')
                    .openPopup();

                // Invalidar tamaño del mapa para asegurar renderizado correcto
                setTimeout(() => {
                    map.invalidateSize();
                }, 100);
            }, 150);
        }
    });

    // Limpiar mapa cuando se cierre el modal
    $('#verClienteModal').on('hidden.bs.modal', function () {
        if (map) {
            map.remove();
            map = null;
        }
        mapData = {};
    });
});
function previewImage(input, previewId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById(previewId).src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

$('#editDuiFrente').on('change', function () {
    previewImage(this, 'previewDuiFrente');
});

$('#editDuiDetras').on('change', function () {
    previewImage(this, 'previewDuiDetras');
});

$('#editFotoNegocio1').on('change', function () {
    previewImage(this, 'previewFotoNegocio1');
});
$('#editFotoNegocio2').on('change', function () {
    previewImage(this, 'previewFotoNegocio2');
});
$('#editFotoNegocio3').on('change', function () {
    previewImage(this, 'previewFotoNegocio3');
});
$('#editFotoNegocio4').on('change', function () {
    previewImage(this, 'previewFotoNegocio4');
});


$('#editarClienteModal').on('show.bs.modal', function (event) {
    const button = $(event.relatedTarget);
    const modal = $(this);
    var idDepartamento = button.data('departamento');
    var idGestor = button.data('idgestor');

    modal.find('#editNombre').val(button.data('nombre'));
    modal.find('#editId').val(button.data('id'));
    modal.find('#editApellido').val(button.data('apellido'));
    modal.find('#editDui').val(button.data('dui'));
    modal.find('#editNit').val(button.data('nit'));
    modal.find('#editTelefono').val(button.data('telefono'));
    modal.find('#editCelular').val(button.data('celular'));
    modal.find('#editDireccion').val(button.data('direccion'));
    modal.find('#editFechaNacimiento').val(button.data('fechanacimiento'));
    modal.find('#editGiro').val(button.data('giro'));
    modal.find('#editReferencia1').val(button.data('referencia1'));
    modal.find('#editTelReferencia1').val(button.data('telreferencia'));
    modal.find('#editReferencia2').val(button.data('referencia2'));
    modal.find('#editTelReferencia2').val(button.data('telreferencia2'));
    modal.find('#editGestor').val(idGestor);
    modal.find('#editProfesion').val(button.data('profesion'));
    modal.find('#editDepartamento').val(idDepartamento);
    modal.find('#editGenero').val(button.data('genero'));
    modal.find('#editEmail').val(button.data('email'));
    modal.find('#editActivo').prop('checked', button.data('activo') == 1);
    modal.find('#editTipoPer').prop('checked', button.data('tipoper') == 1);

    const fotoFrente = button.data('duifrente');
    const fotoDetras = button.data('duidetras');
    const fotoNegocio1 = button.data('fotonegocio1');
    const fotoNegocio2 = button.data('fotonegocio2');
    const fotoNegocio3 = button.data('fotonegocio3');
    const fotoNegocio4 = button.data('fotonegocio4');

    $('#previewDuiFrente').attr('src', fotoFrente ? fotoFrente : '/assets/img/agregar.jpg');
    $('#previewDuiDetras').attr('src', fotoDetras ? fotoDetras : '/assets/img/agregar.jpg');
    $('#previewFotoNegocio1').attr('src', fotoNegocio1 ? fotoNegocio1 : '/assets/img/agregar.jpg');
    $('#previewFotoNegocio2').attr('src', fotoNegocio2 ? fotoNegocio2 : '/assets/img/agregar.jpg');
    $('#previewFotoNegocio3').attr('src', fotoNegocio3 ? fotoNegocio3 : '/assets/img/agregar.jpg');
    $('#previewFotoNegocio4').attr('src', fotoNegocio4 ? fotoNegocio4 : '/assets/img/agregar.jpg');
    let lat = button.data('latitud') || 13.719305;
    let lng = button.data('longitud') || -89.723467;
    $('#editLatitud').val(lat);
    $('#editLongitud').val(lng);

    // Evento para cargar el mapa solo cuando se hace clic en el tab de ubicación
    $('#edit-ubicacion-tab').on('shown.bs.tab', function (e) {
        initializeMap(lat, lng);
    });


});

$('#editBuscadorDireccion').on('input', function (e) {
    const query = $(this).val();
    if (query.trim() === "") {
        $('#suggestions-container').hide();
        return;
    }

    clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(function () {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
            .then(res => res.json())
            .then(data => {
                $('#suggestions-container').empty();

                if (data.length > 0) {
                    data.forEach(item => {
                        const suggestion = $('<a href="#" class="list-group-item list-group-item-action"></a>');
                        suggestion.text(item.display_name);
                        suggestion.data('lat', item.lat);
                        suggestion.data('lon', item.lon);
                        $('#suggestions-container').show();
                        suggestion.on('click', function () {
                            const lat = $(this).data('lat');
                            const lon = $(this).data('lon');
                            map.setView([lat, lon], 15);
                            marker.setLatLng([lat, lon]).bindPopup('Ubicación seleccionada').openPopup();

                            $('#editLatitud').val(lat);
                            $('#editLongitud').val(lon);
                            $('#suggestions-container').hide();
                        });
                        $('#suggestions-container').append(suggestion);
                    });
                } else {
                    $('#suggestions-container').hide();
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error al buscar la dirección. Intenta de nuevo.');
            });
    }, 300);
});
function initializeMap(lat, lon) {
    if (map) {
        map.remove();
    }
    map = L.map('editMap').setView([lat, lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    marker = L.marker([lat, lon]).addTo(map)
        .bindPopup('Ubicación seleccionada')
        .openPopup();
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
    map.on('click', function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        marker.setLatLng([lat, lng])
            .bindPopup('Ubicación seleccionada')
            .openPopup();

        $('#editLatitud').val(lat);
        $('#editLongitud').val(lng);
    });
}

function initializeNewMap(lat = 13.719305, lon = -89.723467) {
    if (newMap) {
        newMap.remove();
    }

    newMap = L.map('newMap').setView([lat, lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(newMap);

    newMarker = L.marker([lat, lon]).addTo(newMap)
        .bindPopup('Ubicación seleccionada')
        .openPopup();

    setTimeout(() => {
        newMap.invalidateSize();
    }, 100);

    newMap.on('click', function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        newMarker.setLatLng([lat, lng])
            .bindPopup('Ubicación seleccionada')
            .openPopup();

        $('#newLatitud').val(lat);
        $('#newLongitud').val(lng);
    });
    $('#newLatitud').val(lat);
    $('#newLongitud').val(lon);
}


$('#newBuscadorDireccion').on('input', function () {
    const query = $(this).val();

    if (query.trim() === "") {
        $('#newsuggestions-container').hide();
        return;
    }

    clearTimeout(newDebounceTimeout);

    newDebounceTimeout = setTimeout(function () {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
            .then(res => res.json())
            .then(data => {
                $('#newsuggestions-container').empty();

                if (data.length > 0) {
                    data.forEach(item => {
                        const suggestion = $('<a href="#" class="list-group-item list-group-item-action"></a>');
                        suggestion.text(item.display_name);
                        suggestion.data('lat', item.lat);
                        suggestion.data('lon', item.lon);

                        $('#newsuggestions-container').show();

                        suggestion.on('click', function () {
                            const lat = parseFloat($(this).data('lat'));
                            const lon = parseFloat($(this).data('lon'));

                            newMap.setView([lat, lon], 15);
                            newMarker.setLatLng([lat, lon])
                                .bindPopup('Ubicación seleccionada')
                                .openPopup();

                            $('#newLatitud').val(lat);
                            $('#newLongitud').val(lon);
                            $('#newsuggestions-container').hide();
                        });

                        $('#newsuggestions-container').append(suggestion);
                    });
                } else {
                    $('#newsuggestions-container').hide();
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error al buscar la dirección. Intenta de nuevo.');
            });
    }, 300);
});


$('#btnUbicacionActual').click(function () {
    $('#mensajeUbicando').show();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            $('#newLatitud').val(lat);
            $('#newLongitud').val(lon);

            newMap.setView([lat, lon], 15);
            newMarker.setLatLng([lat, lon]).bindPopup('Ubicación actual detectada').openPopup();

            $('#mensajeUbicando').hide();
        }, function (error) {
            $('#mensajeUbicando').hide();
            alert('Error al obtener tu ubicación: ' + error.message);
        });
    } else {
        alert("Este navegador no soporta geolocalización.");
    }5
});


$('#btnUbicacionActualEdit').click(function () {
    $('#mensajeUbicandoEdit').show();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            $('#editLatitud').val(lat);
            $('#editLongitud').val(lon);

            map.setView([lat, lon], 15);
            marker.setLatLng([lat, lon]).bindPopup('Ubicación actual detectada').openPopup();

            $('#mensajeUbicandoEdit').hide();
        }, function (error) {
            $('#mensajeUbicandoEdit').hide();
            alert('Error al obtener tu ubicación: ' + error.message);
        });
    } else {
        alert("Este navegador no soporta geolocalización.");
    }
});


// Evento para cargar el mapa solo cuando se hace clic en el tab de ubicación
$('#new-ubicacion-tab').on('shown.bs.tab', function (e) {
    initializeNewMap();
});



$('#newDuiFrente').on('change', function () {
    previewImage(this, 'newpreviewDuiFrente');
});

$('#newDuiDetras').on('change', function () {
    previewImage(this, 'newpreviewDuiDetras');
});

$('#newFotoNegocio1').on('change', function () {
    previewImage(this, 'newpreviewFotoNegocio1');
});
$('#newFotoNegocio2').on('change', function () {
    previewImage(this, 'newpreviewFotoNegocio2');
});
$('#newFotoNegocio3').on('change', function () {
    previewImage(this, 'newpreviewFotoNegocio3');
});
$('#newFotoNegocio4').on('change', function () {
    previewImage(this, 'newpreviewFotoNegocio4');
});

$(document).on("click", ".btnEliminarCliente", function (e) {
    e.preventDefault();
    var id = $(this).data("id");

    // Validar permisos antes de mostrar el modal
    validarPermisoAntes('Home/Clientes', 'Delete', function () {
        Swal.fire({
            title: "¿Está seguro de eliminar este cliente?",
            text: "¡Esta acción no se puede deshacer!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6"
        }).then((result) => {
            if (result.isConfirmed) {
                $("#inputIdEliminar").val(id);
                $("#formEliminarCliente").submit();
            }
        });
    });
});




// Función para ampliar imagen
function ampliarImagen(url, titulo) {
    if (url && !url.includes('agregar.jpg') && !url.includes('ft1.jpg') && !url.includes('ft2.jpg') && !url.includes('ft3.jpg') && !url.includes('ft4.jpg')) {
        currentImageUrl = url;
        currentImageName = titulo || 'imagen';
        document.getElementById('imagenAmpliada-img').src = url;
        document.getElementById('imagenAmpliadaTitle').textContent = titulo || 'Vista Ampliada';
        new bootstrap.Modal(document.getElementById('imagenAmpliada')).show();
    }
}

// Función para descargar imagen individual
function descargarImagen(url, nombreArchivo) {
    if (url && !url.includes('agregar.jpg') && !url.includes('ft1.jpg') && !url.includes('ft2.jpg') && !url.includes('ft3.jpg') && !url.includes('ft4.jpg') && !url.includes('frente.jpg') && !url.includes('atras.jpg')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo + '.jpg';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Mostrar mensaje de éxito
        mostrarMensaje('Descargando: ' + nombreArchivo + '.jpg', 'success');
    } else {
        mostrarMensaje('No hay imagen disponible para descargar', 'warning');
    }
}

// Función para descargar imagen ampliada
function descargarImagenAmpliada() {
    if (currentImageUrl) {
        descargarImagen(currentImageUrl, currentImageName.replace(' ', '_'));
    }
}

// Función para descargar todos los documentos
function descargarTodosDocumentos() {
    const nombreCliente = document.getElementById('modalNombre').textContent + '_' + document.getElementById('modalApellido').textContent;
    const duiFrente = document.getElementById('imgDuiFrente').src;
    const duiAtras = document.getElementById('imgDuiAtras').src;

    let documentosDescargados = 0;

    if (duiFrente && !duiFrente.includes('frente.jpg') && !duiFrente.includes('agregar.jpg')) {
        setTimeout(() => {
            descargarImagen(duiFrente, nombreCliente + '_DUI_Frente');
        }, documentosDescargados * 500);
        documentosDescargados++;
    }

    if (duiAtras && !duiAtras.includes('atras.jpg') && !duiAtras.includes('agregar.jpg')) {
        setTimeout(() => {
            descargarImagen(duiAtras, nombreCliente + '_DUI_Atras');
        }, documentosDescargados * 500);
        documentosDescargados++;
    }

    if (documentosDescargados > 0) {
        mostrarMensaje('Descargando ' + documentosDescargados + ' documentos...', 'info');
    } else {
        mostrarMensaje('No hay documentos disponibles para descargar', 'warning');
    }
}

// Función para descargar todas las fotos del negocio
function descargarTodasFotos() {
    const nombreCliente = document.getElementById('modalNombre').textContent + '_' + document.getElementById('modalApellido').textContent;
    let fotosDescargadas = 0;

    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('imgNegocio' + i);
        if (img && img.src && !img.src.includes('ft' + i + '.jpg') && !img.src.includes('agregar.jpg')) {
            setTimeout(() => {
                descargarImagen(img.src, nombreCliente + '_Negocio_Foto' + i);
            }, fotosDescargadas * 500);
            fotosDescargadas++;
        }
    }

    if (fotosDescargadas > 0) {
        mostrarMensaje('Descargando ' + fotosDescargadas + ' fotos del negocio...', 'info');
    } else {
        mostrarMensaje('No hay fotos disponibles para descargar', 'warning');
    }
}

// Función para abrir en Google Maps
function abrirEnGoogleMaps() {
    if (mapData.latitud && mapData.longitud) {
        const url = `https://www.google.com/maps?q=${mapData.latitud},${mapData.longitud}`;
        window.open(url, '_blank');
    } else {
        mostrarMensaje('No hay coordenadas disponibles', 'warning');
    }
}

// Función para mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
    // Usar SweetAlert si está disponible, sino alert simple
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            text: mensaje,
            icon: tipo,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } else {
        alert(mensaje);
    }
}           