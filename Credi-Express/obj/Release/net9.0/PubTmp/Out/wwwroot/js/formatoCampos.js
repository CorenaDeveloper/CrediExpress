$(document).ready(function () {
    $('.dui').on('input', function () {
        let value = $(this).val().replace(/\D/g, '');
        if (value.length > 8) {
            value = value.slice(0, 8) + '-' + value.slice(8, 9);
        }
        if (value.length > 10) {
            value = value.slice(0, 10); // Limitar longitud
        }
        $(this).val(value);
    });

    $('.nit').on('input', function () {
        let raw = $(this).val().replace(/\D/g, '').substring(0, 14); // Solo 14 dígitos
        let formatted = '';

        if (raw.length > 0) {
            formatted = raw.substring(0, 4);
        }
        if (raw.length > 4) {
            formatted += '-' + raw.substring(4, 10);
        }
        if (raw.length > 10) {
            formatted += '-' + raw.substring(10, 13);
        }
        if (raw.length > 13) {
            formatted += '-' + raw.substring(13, 14);
        }

        $(this).val(formatted);
    });

    $('.telefono').on('input', function () {
        let value = $(this).val().replace(/\D/g, ''); // Elimina todo excepto números
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4);
        }
        if (value.length > 9) {
            value = value.slice(0, 9); // Máximo 9 caracteres con guión
        }
        $(this).val(value);
    });

    // Validación MONEY: solo número con hasta 2 decimales
    $('.money').on('input', function () {
        let value = $(this).val().replace(/[^0-9.]/g, '');
        // Solo permitir un punto decimal
        value = value.replace(/(\..*)\./g, '$1');
        // Limitar a 2 decimales
        if (value.includes('.')) {
            let parts = value.split('.');
            parts[1] = parts[1].substring(0, 2);
            value = parts[0] + '.' + parts[1];
        }
        $(this).val(value);
    });

    // Validación PORCENTAJE: solo del 1 al 100, con hasta 2 decimales
    $('.porcentaje').on('input', function () {
        let value = $(this).val().replace(/[^0-9.]/g, '');
        value = value.replace(/(\..*)\./g, '$1');

        // Limitar a 2 decimales
        if (value.includes('.')) {
            let parts = value.split('.');
            parts[1] = parts[1].substring(0, 2);
            value = parts[0] + '.' + parts[1];
        }

        // Limitar el rango entre 1 y 100
        let num = parseFloat(value);
        if (num > 100) value = '100.00';
        else if (num < 1 && value !== '') value = '1.00';

        $(this).val(value);
    });

    // Solo números enteros
    $('.numero-entero').on('input', function () {
        let value = $(this).val().replace(/\D/g, ''); // Solo dígitos
        $(this).val(value);
    });

    // Números decimales con hasta 2 decimales
    $('.numero-decimal').on('input', function () {
        let value = $(this).val().replace(/[^0-9.]/g, ''); // Solo dígitos y punto
        value = value.replace(/(\..*)\./g, '$1'); // Evitar múltiples puntos
        if (value.includes('.')) {
            let parts = value.split('.');
            parts[1] = parts[1].substring(0, 2);
            value = parts[0] + '.' + parts[1];
        }
        $(this).val(value);
    });
});
