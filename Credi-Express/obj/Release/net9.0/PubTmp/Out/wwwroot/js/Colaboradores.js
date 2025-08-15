const userModal = document.getElementById('UserColaborador');
const editUserModal = document.getElementById('editUserModel');
const verUserModal = document.getElementById('veruserModal');
let permisosUsuario = [];

$(document).ready(function () {
    // Cargar permisos primero
    cargarPermisosUsuario();

    $('#loading-overlay').show();

    table = $('#tblColaboradores').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        orderCellsTop: true,
        processing: true,
        initComplete: function () {
            $('#loading-overlay').hide();
        },
    });

    cargarDepartamentos();
    cargarPuestos();
});

// ===== SISTEMA DE PERMISOS =====
function cargarPermisosUsuario() {
    $.ajax({
        url: '/Auxiliares/GetPermisosUsuario',
        method: 'GET',
        success: function (response) {
            permisosUsuario = response.permisos;
            console.log('Permisos cargados:', permisosUsuario);
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
    // Botón Nuevo Colaborador
    if (!tienePermiso('Home/Colaboradores', 'Create')) {
        $('#btnNuevoColaborador').hide();
    }

    // Botones de Ver
    if (!tienePermiso('Home/Colaboradores', 'Read')) {
        $('.btn-ver-colaborador').hide();
    }

    // Botones de Editar
    if (!tienePermiso('Home/Colaboradores', 'Update')) {
        $('.btn-editar-colaborador').hide();
        $('.btn-usuario-colaborador').hide();
    }

    // Botones de Eliminar
    if (!tienePermiso('Home/Colaboradores', 'Delete')) {
        $('.btnEliminaruser').hide();
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

// ===== FUNCIONES ORIGINALES =====
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

function cargarPuestos() {
    fetch('/Auxiliares/GetPuestos')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('editPuesto');
            const selectNew = document.getElementById('newPuesto');
            select.innerHTML = '';
            selectNew.innerHTML = '';

            data.forEach(a => {
                const optionEdit = document.createElement('option');
                optionEdit.value = a.id;
                optionEdit.text = a.nombre;
                select.appendChild(optionEdit);

                const optionNew = document.createElement('option');
                optionNew.value = a.id;
                optionNew.text = a.nombre;
                selectNew.appendChild(optionNew);
            });
        })
        .catch(error => {
            console.error('Error al cargar puestos:', error);
        });
}

// ===== EVENTOS DE MODALES CON VALIDACIÓN =====
userModal.addEventListener('show.bs.modal', function (event) {
    if (!tienePermiso('Home/Colaboradores', 'Update')) {
        event.preventDefault();
        Swal.fire({
            title: 'Acceso Denegado',
            text: 'No tienes permisos para gestionar usuarios de colaboradores',
            icon: 'error',
            confirmButtonText: 'Entendido'
        });
        return false;
    }

    const button = event.relatedTarget;
    const userId = button.getAttribute('data-id');
    const nameUser = button.getAttribute('data-username');
    document.getElementById('IdColaborador').value = userId;
    $("#UserNombre").val(nameUser);
});

editUserModal.addEventListener('show.bs.modal', function (event) {
    if (!tienePermiso('Home/Colaboradores', 'Update')) {
        event.preventDefault();
        Swal.fire({
            title: 'Acceso Denegado',
            text: 'No tienes permisos para editar colaboradores',
            icon: 'error',
            confirmButtonText: 'Entendido'
        });
        return false;
    }

    const button = event.relatedTarget;
    const userId = button.getAttribute('data-id');
    const nombre = button.getAttribute('data-nombre');
    const apellido = button.getAttribute('data-apellido');
    const telefono = button.getAttribute('data-telefono');
    const direccion = button.getAttribute('data-direccion');
    const departamento = button.getAttribute('data-departamento');
    const puesto = button.getAttribute('data-idpuesto');
    const activo = button.getAttribute('data-activo');

    $("#editIdColaborador").val(userId);
    $("#editNombre").val(nombre);
    $("#editApellido").val(apellido);
    $("#editTelefono").val(telefono);
    $("#editDireccion").val(direccion);
    $("#editDepartamento").val(departamento);
    $("#editPuesto").val(puesto);
    $("#editActivo").prop("checked", activo === "true" || activo === "1");
});

verUserModal.addEventListener('show.bs.modal', function (event) {
    if (!tienePermiso('Home/Colaboradores', 'Read')) {
        event.preventDefault();
        Swal.fire({
            title: 'Acceso Denegado',
            text: 'No tienes permisos para ver detalles de colaboradores',
            icon: 'error',
            confirmButtonText: 'Entendido'
        });
        return false;
    }

    const button = event.relatedTarget;
    const userId = button.getAttribute('data-id');
    const nombre = button.getAttribute('data-nombre');
    const apellido = button.getAttribute('data-apellido');
    const telefono = button.getAttribute('data-telefono');
    const direccion = button.getAttribute('data-direccion');
    const departamento = button.getAttribute('data-nombredepartamento');
    const puesto = button.getAttribute('data-nombrepuesto');

    $("#verNombre").html(nombre);
    $("#verApellido").html(apellido);
    $("#verTelefono").html(telefono);
    $("#verDireccion").html(direccion);
    $("#verDepartamento").html(departamento);
    $("#verPuesto").html(puesto);
});

// ===== VALIDACIÓN PARA ELIMINAR =====
$(document).on("click", ".btnEliminaruser", function (e) {
    e.preventDefault();
    var id = $(this).data("id");

    validarPermisoAntes('Home/Colaboradores', 'Delete', function () {
        Swal.fire({
            title: "¿Está seguro de eliminar este colaborador?",
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

// ===== VALIDACIÓN PARA CREAR NUEVO =====
$(document).on("click", "#btnNuevoColaborador", function (e) {
    if (!tienePermiso('Home/Colaboradores', 'Create')) {
        e.preventDefault();
        Swal.fire({
            title: 'Acceso Denegado',
            text: 'No tienes permisos para crear nuevos colaboradores',
            icon: 'error',
            confirmButtonText: 'Entendido'
        });
    }
});

// ===== VALIDACIÓN PARA FORMULARIOS =====
$('#formNuevoColaborador').on('submit', function (e) {
    if (!tienePermiso('Home/Colaboradores', 'Create')) {
        e.preventDefault();
        Swal.fire({
            title: 'Acceso Denegado',
            text: 'No tienes permisos para crear colaboradores',
            icon: 'error',
            confirmButtonText: 'Entendido'
        });
    }
});

$('#formEditarColaborador').on('submit', function (e) {
    if (!tienePermiso('Home/Colaboradores', 'Update')) {
        e.preventDefault();
        Swal.fire({
            title: 'Acceso Denegado',
            text: 'No tienes permisos para editar colaboradores',
            icon: 'error',
            confirmButtonText: 'Entendido'
        });
    }
});

$('#formUsuarioColaborador').on('submit', function (e) {
    if (!tienePermiso('Home/Colaboradores', 'Update')) {
        e.preventDefault();
        Swal.fire({
            title: 'Acceso Denegado',
            text: 'No tienes permisos para gestionar usuarios',
            icon: 'error',
            confirmButtonText: 'Entendido'
        });
    }
});