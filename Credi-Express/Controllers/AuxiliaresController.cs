using Credi_Express.Models;
using Credi_Express.ModelVM;
using Credi_Express.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Credi_Express.Controllers
{
    public class AuxiliaresController : Controller
    {
        private readonly pagosContext context;

        public AuxiliaresController(pagosContext context)
        {
            this.context = context;
        }

        [HttpGet]
        public IActionResult GetDepartamentos()
        {
            var departamentos = context.Departamentos
                .Select(d => new
                {
                    d.Id,
                    d.Nombre
                })
                .ToList();

            return Ok(departamentos);
        }

        [HttpGet]
        public IActionResult GetPuestos()
        {
            var puesto = context.Puestos
                .Select(d => new
                {
                    d.Id,
                    d.Nombre
                })
                .ToList();

            return Ok(puesto);
        }

        /// <summary>
        /// Lista de gestores(asignados y no asignados a clientes).
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public IActionResult GetGestores()
        {
            var gestores = context.Gestors
                .Select(d => new
                {
                    d.Id,
                    d.Nombre,
                    d.Apellido,
                    d.Departamento,
                    DepartamentoNombre = context.Departamentos
                    .Where(a => a.Id == Convert.ToInt32(d.Departamento))
                    .Select(a => a.Nombre)
                    .FirstOrDefault() ?? "Departamento no asignado",
                })
                .ToList();

            return Ok(gestores);
        }

        /// <summary>
        /// consulta prestmoas y solicitudes con filtro
        /// </summary>
        /// <param name="estado"></param>
        /// <param name="fechaInicio"></param>
        /// <param name="fechaFin"></param>
        /// <param name="extra"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetPrestamos(string estado, DateOnly? fechaInicio, DateOnly? fechaFin, string extra)
        {
            IQueryable<Prestamo> query = context.Prestamos;

            if (estado == "A" || estado == "C" || estado == "E")
            {
                query = query.Where(c => c.Estado == estado);
            }

            // Aplicar filtro de fechas solo si se seleccionó una opción válida
            if (extra == "1" && fechaInicio.HasValue && fechaFin.HasValue)
            {
                // Filtrar por fecha del préstamo
                query = query.Where(c => c.Fecha >= fechaInicio && c.Fecha <= fechaFin);
            }
            else if (extra == "2" && fechaInicio.HasValue && fechaFin.HasValue)
            {
                // Filtrar por fecha de cancelación
                query = query.Where(c => c.FechaCancelado != null &&
                                         c.FechaCancelado >= fechaInicio && c.FechaCancelado <= fechaFin);
            }
            // extra == "3" → No aplicar ningún filtro por fecha

            var a = await query
                .Where(c => c.Aprobado == 1)
                .Select(c => new PrestamosVM
                {
                    Id = c.Id,
                    IdCliente = c.Idcliente,
                    NombreCliente = context.Clientes
                        .Where(a => a.Id == c.Idcliente)
                        .Select(a => a.Nombre + " " + a.Apellido)
                        .FirstOrDefault(),
                    fecha = c.Fecha,
                    Monto = c.Monto,
                    Tasa = c.Tasa,
                    NumCoutas = c.NumCoutas,
                    Cuotas = c.Cuota,
                    Interes = c.Interes,
                    ProximoPago = c.ProximoPago,
                    Estado = c.Estado,
                    FechaCancelado = c.FechaCancelado
                })
                .ToListAsync();

            return Ok(a);
        }


        /// <summary>
        /// historial de solicitudes aprobadas y no aprobadas
        /// </summary>
        /// <param name="idCliente"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetPrestamosXCliente(int idCliente)
        {
            try
            {

                // Obtener TODOS los préstamos del cliente (aprobados y no aprobados)
                var prestamos = await context.Prestamos
                    .Where(c => c.Idcliente == idCliente)
                    .Include(c => c.IdclienteNavigation) // Para obtener datos del cliente
                    .Include(c => c.Pagosdetalles) // Para calcular saldos
                    .OrderByDescending(c => c.Id) // Más recientes primero
                    .Select(c => new
                    {
                        Id = c.Id,
                        IdCliente = c.Idcliente,
                        NombreCliente = c.IdclienteNavigation.Nombre + " " + c.IdclienteNavigation.Apellido,
                        Fecha = c.Fecha,
                        FechaCreacion = c.FechaCreadafecha,
                        Monto = c.Monto ?? 0,
                        Tasa = c.Tasa ?? 0,
                        TasaDomicilio = c.TasaDomicilio ?? 0,
                        NumCuotas = c.NumCoutas ?? 0,
                        Cuotas = c.Cuota ?? 0,
                        Interes = c.Interes ?? 0,
                        Domicilio = c.Domicilio ?? 0,
                        ProximoPago = c.ProximoPago,
                        Estado = c.Estado,
                        EstadoDescripcion = c.Estado == "A" ? "Activo" :
                                          c.Estado == "C" ? "Cancelado" :
                                          c.Estado == "E" ? "Eliminado" :
                                          c.Estado == "P" ? "Pendiente" :
                                          c.Estado == "R" ? "Rechazado" : "Desconocido",
                        FechaCancelado = c.FechaCancelado,
                        TipoPrestamo = c.TipoPrestamo,

                        // Estados de aprobación
                        Aprobado = c.Aprobado == 1,
                        DetalleAprobado = c.DetalleAprobado,
                        DetalleRechazo = c.DetalleRechazo,
                        FechaAprobacion = c.FechaAprobacion,
                        FechaRechazado = c.FechaRechazado,

                        // Información de creación
                        CreadoPor = c.CreadaPor,
                        NombreCreadoPor = context.Gestors
                            .Where(g => g.Id == c.CreadaPor)
                            .Select(g => g.Nombre + " " + g.Apellido)
                            .FirstOrDefault() ?? "Sistema",

                        // Calcular información de pagos
                        TotalPagado = c.Pagosdetalles
                            .Where(p => p.Pagado == 1 && p.TipoPago != "DESEMBOLSO")
                            .Sum(p => p.Capital ?? 0),

                        CuotasPagadas = c.Pagosdetalles
                            .Where(p => p.Pagado == 1 && p.TipoPago != "DESEMBOLSO")
                            .Count(),

                        SaldoPendiente = (c.Monto ?? 0) - c.Pagosdetalles
                            .Where(p => p.Pagado == 1 && p.TipoPago != "DESEMBOLSO")
                            .Sum(p => p.Capital ?? 0),

                        // Información de mora
                        TieneMora = c.Pagosdetalles
                            .Any(p => p.Mora > 0),

                        MontoMora = c.Pagosdetalles
                            .Where(p => p.Pagado == 0 && p.Mora > 0)
                            .Sum(p => p.Mora ?? 0),

                        // Calcular progreso del préstamo
                        PorcentajePagado = c.NumCoutas > 0 ?
                            (double)c.Pagosdetalles.Where(p => p.Pagado == 1).Count() / c.NumCoutas.Value * 100 : 0,

                        // Información adicional para análisis de riesgo
                        DiasTranscurridos = c.Fecha.HasValue ?
                           DateOnly.FromDateTime(DateTime.Now).DayNumber - c.Fecha.Value.DayNumber : 0,

                        UltimoPago = c.Pagosdetalles
                            .Where(p => p.Pagado == 1)
                            .OrderByDescending(p => p.FechaPago)
                            .Select(p => p.FechaPago)
                            .FirstOrDefault(),

                        // Estado de riesgo calculado
                        EstadoRiesgo = c.Estado == "A" && c.Pagosdetalles.Any(p => p.Mora > 0) ? "CON_MORA" :
                                      c.Estado == "A" ? "ACTIVO_AL_DIA" :
                                      c.Estado == "C" ? "CANCELADO" :
                                      c.DetalleAprobado == "RECHAZADO" ? "RECHAZADO" :
                                      c.Aprobado == 0 ? "PENDIENTE_APROBACION" : "OTROS"
                    })
                    .ToListAsync();

                // Agrupar por estado para estadísticas
                var estadisticas = new
                {
                    TotalPrestamos = prestamos.Count,
                    PrestamosActivos = prestamos.Count(p => p.Estado == "A"),
                    PrestamosCancelados = prestamos.Count(p => p.Estado == "C"),
                    PrestamosRechazados = prestamos.Count(p => p.DetalleAprobado == "RECHAZADO"),
                    PrestamosPendientes = prestamos.Count(p => p.Aprobado == false && p.DetalleAprobado != "RECHAZADO"),

                    MontoTotalPrestado = prestamos.Where(p => p.Aprobado).Sum(p => p.Monto),
                    MontoActivoPendiente = prestamos.Where(p => p.Estado == "A").Sum(p => p.SaldoPendiente),

                    ClienteConMora = prestamos.Any(p => p.Estado == "A" && p.TieneMora),
                    MontoTotalMora = prestamos.Where(p => p.Estado == "A").Sum(p => p.MontoMora),

                    // Análisis de comportamiento
                    PorcentajeCumplimiento = prestamos.Where(p => p.Estado == "C").Count() > 0 ?
                        (double)prestamos.Count(p => p.Estado == "C") / prestamos.Count(p => p.Aprobado) * 100 : 0,

                    UltimoPrestamo = prestamos.FirstOrDefault()?.Fecha,

                    // Clasificación de riesgo del cliente
                    NivelRiesgo = CalcularNivelRiesgo(prestamos)
                };

                var response = new
                {
                    success = true,
                    data = prestamos,
                    estadisticas = estadisticas,
                    mensaje = prestamos.Count == 0 ? "El cliente no tiene historial de préstamos" :
                             $"Se encontraron {prestamos.Count} préstamo(s) en el historial"
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error al obtener el historial de préstamos",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        ///  historial de prestamos aprobados 
        /// </summary>
        /// <param name="idCliente"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetPrestamosXClienteRealizado(int idCliente)
        {
            try
            {

                // Obtener TODOS los préstamos del cliente (aprobados)
                var prestamos = await context.Prestamos
                    .Where(c => c.Idcliente == idCliente && c.Aprobado == 1)
                    .Include(c => c.IdclienteNavigation)
                    .Include(c => c.Pagosdetalles)
                    .OrderByDescending(c => c.Id)
                    .Select(c => new
                    {
                        Id = c.Id,
                        IdCliente = c.Idcliente,
                        NombreCliente = c.IdclienteNavigation.Nombre + " " + c.IdclienteNavigation.Apellido,
                        Fecha = c.Fecha,
                        FechaCreacion = c.FechaCreadafecha,
                        Monto = c.Monto ?? 0,
                        Tasa = c.Tasa ?? 0,
                        TasaDomicilio = c.TasaDomicilio ?? 0,
                        NumCuotas = c.NumCoutas ?? 0,
                        Cuotas = c.Cuota ?? 0,
                        Interes = c.Interes ?? 0,
                        Domicilio = c.Domicilio ?? 0,
                        ProximoPago = c.ProximoPago,
                        Estado = c.Estado,
                        EstadoDescripcion = c.Estado == "A" ? "Activo" :
                                          c.Estado == "C" ? "Cancelado" :
                                          c.Estado == "E" ? "Eliminado" :
                                          c.Estado == "P" ? "Pendiente" :
                                          c.Estado == "R" ? "Rechazado" : "Desconocido",
                        FechaCancelado = c.FechaCancelado,
                        TipoPrestamo = c.TipoPrestamo,

                        // Estados de aprobación
                        Aprobado = c.Aprobado == 1,
                        DetalleAprobado = c.DetalleAprobado,
                        DetalleRechazo = c.DetalleRechazo,
                        FechaAprobacion = c.FechaAprobacion,
                        FechaRechazado = c.FechaRechazado,

                        // Información de creación
                        CreadoPor = c.CreadaPor,
                        NombreCreadoPor = context.Gestors
                            .Where(g => g.Id == c.CreadaPor)
                            .Select(g => g.Nombre + " " + g.Apellido)
                            .FirstOrDefault() ?? "Sistema",

                        // Calcular información de pagos
                        TotalPagado = c.Pagosdetalles
                            .Where(p => p.Pagado == 1 && p.TipoPago != "DESEMBOLSO")
                            .Sum(p => p.Capital ?? 0),

                        CuotasPagadas = c.Pagosdetalles
                            .Where(p => p.Pagado == 1 && p.TipoPago != "DESEMBOLSO")
                            .Count(),

                        SaldoPendiente = (c.Monto ?? 0) - c.Pagosdetalles
                            .Where(p => p.Pagado == 1 && p.TipoPago != "DESEMBOLSO")
                            .Sum(p => p.Capital ?? 0),

                        // Información de mora
                        TieneMora = c.Pagosdetalles
                            .Any(p => p.Mora > 0),

                        MontoMora = c.Pagosdetalles
                            .Where(p => p.Pagado == 0 && p.Mora > 0)
                            .Sum(p => p.Mora ?? 0),

                        // Calcular progreso del préstamo
                        PorcentajePagado = c.NumCoutas > 0 ?
                            (double)c.Pagosdetalles.Where(p => p.Pagado == 1).Count() / c.NumCoutas.Value * 100 : 0,

                        // Información adicional para análisis de riesgo
                        DiasTranscurridos = c.Fecha.HasValue ?
                           DateOnly.FromDateTime(DateTime.Now).DayNumber - c.Fecha.Value.DayNumber : 0,

                        UltimoPago = c.Pagosdetalles
                            .Where(p => p.Pagado == 1)
                            .OrderByDescending(p => p.FechaPago)
                            .Select(p => p.FechaPago)
                            .FirstOrDefault(),

                        // Estado de riesgo calculado
                        EstadoRiesgo = c.Estado == "A" && c.Pagosdetalles.Any(p => p.Mora > 0) ? "CON_MORA" :
                                      c.Estado == "A" ? "ACTIVO_AL_DIA" :
                                      c.Estado == "C" ? "CANCELADO" :
                                      c.DetalleAprobado == "RECHAZADO" ? "RECHAZADO" :
                                      c.Aprobado == 0 ? "PENDIENTE_APROBACION" : "OTROS"
                    })
                    .ToListAsync();

                // Agrupar por estado para estadísticas
                var estadisticas = new
                {
                    TotalPrestamos = prestamos.Count,
                    PrestamosActivos = prestamos.Count(p => p.Estado == "A"),
                    PrestamosCancelados = prestamos.Count(p => p.Estado == "C"),
                    PrestamosRechazados = prestamos.Count(p => p.DetalleAprobado == "RECHAZADO"),
                    PrestamosPendientes = prestamos.Count(p => p.Aprobado == false && p.DetalleAprobado != "RECHAZADO"),

                    MontoTotalPrestado = prestamos.Where(p => p.Aprobado).Sum(p => p.Monto),
                    MontoActivoPendiente = prestamos.Where(p => p.Estado == "A").Sum(p => p.SaldoPendiente),

                    ClienteConMora = prestamos.Any(p => p.Estado == "A" && p.TieneMora),
                    MontoTotalMora = prestamos.Where(p => p.Estado == "A").Sum(p => p.MontoMora),

                    // Análisis de comportamiento
                    PorcentajeCumplimiento = prestamos.Where(p => p.Estado == "C").Count() > 0 ?
                        (double)prestamos.Count(p => p.Estado == "C") / prestamos.Count(p => p.Aprobado) * 100 : 0,

                    UltimoPrestamo = prestamos.FirstOrDefault()?.Fecha,

                    // Clasificación de riesgo del cliente
                    NivelRiesgo = CalcularNivelRiesgo(prestamos)
                };

                var response = new
                {
                    success = true,
                    data = prestamos,
                    estadisticas = estadisticas,
                    mensaje = prestamos.Count == 0 ? "El cliente no tiene historial de préstamos" :
                             $"Se encontraron {prestamos.Count} préstamo(s) en el historial"
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error al obtener el historial de préstamos",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// MÉTODO AUXILIAR PARA CALCULAR NIVEL DE RIESGO
        /// </summary>
        /// <param name="prestamos"></param>
        /// <returns></returns>
        private string CalcularNivelRiesgo(IEnumerable<object> prestamos)
        {
            try
            {
                // Convertir a lista dinámica para poder acceder a las propiedades
                var prestamosList = prestamos.Cast<dynamic>().ToList();

                var prestamosActivos = prestamosList.Where(p => p.Estado == "A").Count();
                var prestamosConMora = prestamosList.Where(p => p.Estado == "A" && p.TieneMora == true).Count();
                var prestamosRechazados = prestamosList.Where(p => p.DetalleAprobado == "RECHAZADO").Count();
                var totalAprobados = prestamosList.Where(p => p.Aprobado == true).Count();

                // Sin historial = Cliente nuevo
                if (prestamosList.Count == 0)
                    return "CLIENTE_NUEVO";

                // Múltiples rechazos = Alto riesgo
                if (prestamosRechazados >= 2)
                    return "ALTO_RIESGO";

                // Préstamos activos con mora = Riesgo medio-alto
                if (prestamosActivos > 0 && prestamosConMora > 0)
                    return "RIESGO_MEDIO_ALTO";

                // Múltiples préstamos activos = Riesgo medio
                if (prestamosActivos >= 3)
                    return "RIESGO_MEDIO";

                // Préstamos activos sin mora = Riesgo bajo
                if (prestamosActivos > 0 && prestamosConMora == 0)
                    return "RIESGO_BAJO";

                // Solo préstamos cancelados = Buen cliente
                if (prestamosList.All(p => p.Estado == "C"))
                    return "BUEN_CLIENTE";

                return "RIESGO_EVALUACION";
            }
            catch (Exception ex)
            {
                return "ERROR_CALCULO";
            }
        }

        /// <summary>
        /// Detalle de prestamos por id
        /// </summary>
        /// <param name="idPrestamo"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetDetallePrestamos(int idPrestamo)
        {

            var a = await context.Pagosdetalles
                .Where(d => d.Idprestamo == idPrestamo)
                .Select(d => new
                {
                    d.Id,
                    d.Idprestamo,
                    d.FechaPago,
                    d.Numeropago,
                    d.Monto,
                    d.Pagado,
                    d.FechaCouta,
                    d.Capital,
                    d.Mora,
                    d.Morahist
                })
                .ToListAsync();

            return Ok(a);
        }


        /// <summary>
        /// Consultando cliente por DUI
        /// </summary>
        /// <param name="dui"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetClienteDetalle(string dui)
        {
            var a = await context.Clientes
                .Where(c => c.Dui == dui && c.Activo == 1)
                .Select(c => new ClienteConGestorVM
                {
                    Id = c.Id,
                    Nombre = c.Nombre,
                    Apellido = c.Apellido,
                    IdGestor = c.Idgestor,
                    GestorNombre = context.Gestors
                               .Where(g => g.Id == c.Idgestor)
                               .Select(g => g.Nombre + " " + g.Apellido)
                               .FirstOrDefault() ?? "Gestor no asignado",
                    Dui = c.Dui,
                    Direccion = c.Direccion,
                    Telefono = c.Telefono,
                    Celular = c.Celular,
                    FechaIngreso = c.FechaIngreso,
                    Departamento = c.Departamento,
                    DepartamentoNombre = context.Departamentos
                               .Where(d => d.Id == Convert.ToInt32(c.Departamento))
                               .Select(d => d.Nombre)
                               .FirstOrDefault() ?? "Departamento no asignado",
                    Activo = c.Activo,
                    Giro = c.Giro,
                    Referencia1 = c.Referencia1,
                    Telefono1 = c.Telref1,
                    Referencia2 = c.Referencia2,
                    Telefono2 = c.Telref2,
                    TipoPer = c.TipoPer,
                    FechaNacimiento = c.FechaNacimiento,
                    Sexo = c.Sexo,
                    Nit = c.Nit,
                    DuiDetras = c.DuiDetras,
                    DuiFrente = c.DuiFrente,
                    FotoNegocio1 = c.Fotonegocio1,
                    FotoNegocio2 = c.Fotonegocio2,
                    FotoNegocio3 = c.Fotonegocio3,
                    FotoNegocio4 = c.Fotonegocio4,
                    Longitud = c.Longitud,
                    Latitud = c.Latitud,
                    Profesion = c.Profesion
                })
                .FirstOrDefaultAsync();
            return Ok(a);
        }

        /// <summary>
        /// Lista de clientes por nombre o apellido
        /// </summary>
        /// <param name="nombreApellido">Nombre o apellido (búsqueda parcial)</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetClienteDetalleNombre(string nombreApellido)
        {
            if (string.IsNullOrWhiteSpace(nombreApellido))
            {
                return BadRequest("El parámetro nombreApellido no puede estar vacío");
            }

            var clientes = await context.Clientes
                .Where(c => c.Nombre.Contains(nombreApellido) && c.Activo == 1 ||
                           c.Apellido.Contains(nombreApellido) && c.Activo == 1)
                .Select(c => new ClienteConGestorVM
                {
                    Id = c.Id,
                    Nombre = c.Nombre,
                    Apellido = c.Apellido,
                    IdGestor = c.Idgestor,
                    GestorNombre = context.Gestors
                               .Where(g => g.Id == c.Idgestor)
                               .Select(g => g.Nombre + " " + g.Apellido)
                               .FirstOrDefault() ?? "Gestor no asignado",
                    Dui = c.Dui,
                    Direccion = c.Direccion,
                    Telefono = c.Telefono,
                    Celular = c.Celular,
                    FechaIngreso = c.FechaIngreso,
                    Departamento = c.Departamento,
                    DepartamentoNombre = context.Departamentos
                               .Where(d => d.Id == Convert.ToInt32(c.Departamento))
                               .Select(d => d.Nombre)
                               .FirstOrDefault() ?? "Departamento no asignado",
                    Activo = c.Activo,
                    Giro = c.Giro,
                    Referencia1 = c.Referencia1,
                    Telefono1 = c.Telref1,
                    Referencia2 = c.Referencia2,
                    Telefono2 = c.Telref2,
                    TipoPer = c.TipoPer,
                    FechaNacimiento = c.FechaNacimiento,
                    Sexo = c.Sexo,
                    Nit = c.Nit,
                    DuiDetras = c.DuiDetras,
                    DuiFrente = c.DuiFrente,
                    FotoNegocio1 = c.Fotonegocio1,
                    FotoNegocio2 = c.Fotonegocio2,
                    FotoNegocio3 = c.Fotonegocio3,
                    FotoNegocio4 = c.Fotonegocio4,
                    Longitud = c.Longitud,
                    Latitud = c.Latitud,
                    Profesion = c.Profesion
                })
                .ToListAsync();

            return Ok(clientes);
        }

        /// <summary>
        /// LISTA DE CLIENTE PARA LA TABLA
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetClientesDataTable()
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UsuarioId");
                var gestorId = HttpContext.Session.GetInt32("GestorId");

                var query = context.Clientes.AsQueryable();
                //filtra si el un gestor de cuenta el que realiza la bsuqueda
                if (gestorId.HasValue && await query.AnyAsync(c => c.Idgestor == gestorId.Value))
                {
                    query = query.Where(c => c.Idgestor == gestorId.Value);
                }

                var clientes = await query
                    .Select(c => new
                    {
                        Id = c.Id,
                        Nombre = c.Nombre,
                        Apellido = c.Apellido,
                        NombreCompleto = c.Nombre + " " + c.Apellido,
                        Dui = c.Dui,
                        Telefono = c.Telefono ?? "N/A",
                        Celular = c.Celular ?? "N/A",
                        GestorNombre = c.Idgestor != null ?
                            context.Gestors
                                .Where(g => g.Id == c.Idgestor)
                                .Select(g => g.Nombre + " " + g.Apellido)
                                .FirstOrDefault() ?? "Sin asignar" : "Sin asignar",
                        DepartamentoNombre = !string.IsNullOrEmpty(c.Departamento) ?
                            context.Departamentos
                                .Where(d => d.Id == Convert.ToInt32(c.Departamento))
                                .Select(d => d.Nombre)
                                .FirstOrDefault() ?? "Sin departamento" : "Sin departamento",
                        Direccion = c.Direccion,
                        Activo = c.Activo,
                        // Campos adicionales para los modales
                        IdGestor = c.Idgestor,
                        FechaIngreso = c.FechaIngreso,
                        Giro = c.Giro,
                        Referencia1 = c.Referencia1,
                        Telefono1 = c.Telref1,
                        Referencia2 = c.Referencia2,
                        Telefono2 = c.Telref2,
                        TipoPer = c.TipoPer,
                        FechaNacimiento = c.FechaNacimiento,
                        Sexo = c.Sexo,
                        Nit = c.Nit,
                        DuiDetras = c.DuiDetras,
                        DuiFrente = c.DuiFrente,
                        FotoNegocio1 = c.Fotonegocio1,
                        FotoNegocio2 = c.Fotonegocio2,
                        FotoNegocio3 = c.Fotonegocio3,
                        FotoNegocio4 = c.Fotonegocio4,
                        Longitud = c.Longitud,
                        Latitud = c.Latitud,
                        Profesion = c.Profesion,
                        Departamento = c.Departamento,
                        Email = c.Email
                    })
                    .ToListAsync();

                return Json(clientes);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    error = "Error al cargar los datos: " + ex.Message,
                    data = new List<object>()
                });
            }
        }



        /// <summary>
        /// Agregar estos métodos al AuxiliarController existente
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetSolicitudParaDesembolso(int id)
        {
            try
            {
                var solicitud = await context.Prestamos
                    .Where(p => p.Id == id && p.Aprobado == 1 && p.DetalleAprobado == "APROBADO")
                    .Include(p => p.IdclienteNavigation)
                    .Select(p => new
                    {
                        Id = p.Id,
                        NombreCliente = p.IdclienteNavigation.Nombre + " " + p.IdclienteNavigation.Apellido,
                        Dui = p.IdclienteNavigation.Dui,
                        Telefono = p.IdclienteNavigation.Celular ?? p.IdclienteNavigation.Telefono,
                        Monto = p.Monto,
                        NumCoutas = p.NumCoutas,
                        TipoPrestamo = p.TipoPrestamo,
                        Estado = p.DetalleAprobado
                    })
                    .FirstOrDefaultAsync();

                if (solicitud == null)
                {
                    return Ok(new { success = false, message = "Solicitud no encontrada o no está aprobada para desembolso" });
                }

                return Ok(new { success = true, solicitud = solicitud });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error interno del servidor", error = ex.Message });
            }
        }



        /// <summary>
        ///  GET PARA OBTENER LOS MOVIMIENTOS DIARIOS COMPLETOS DE CADA GESTOR 
        /// </summary>
        /// <param name="fecha"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetMovimientosDiariosCompleto(DateOnly? fecha, int? creadoPor = null)
        {
            try
            {
                var gestorId = HttpContext.Session.GetInt32("GestorId");
                var userId = HttpContext.Session.GetInt32("UsuarioId");


                // Construir la consulta base
                var query = context.Pagosdetalles
                    .Where(d => d.FechaPago.HasValue && d.FechaPago == fecha && d.Pagado == 1);

                // Aplicar filtro de usuario solo si NO es administrador
                if (!User.TienePermiso("Home/Movimientos", "Admin"))
                {
                    query = query.Where(d => d.CreadoPor == userId);
                }


                var movimientos = await query
                    .Include(d => d.IdprestamoNavigation)
                        .ThenInclude(p => p.IdclienteNavigation)
                    .Select(d => new
                    {
                        Id = d.Id,
                        Hora = d.FechaCreacion.HasValue ? d.FechaCreacion.Value.ToString("HH:mm") : "",
                        Tipo = d.TipoMovimiento == "PAGO" ? "INGRESO" : "EGRESO",
                        Concepto = d.TipoMovimiento == "DESEMBOLSO"
                            ? $"Desembolso Préstamo #{d.Idprestamo}"
                            : $"Pago Cuota #{d.Numeropago} - Préstamo #{d.Idprestamo}",
                        Cliente = d.IdprestamoNavigation.IdclienteNavigation.Nombre + " " +
                                 d.IdprestamoNavigation.IdclienteNavigation.Apellido,
                        Dui = d.IdprestamoNavigation.IdclienteNavigation.Dui,
                        Monto = d.Monto ?? 0,
                        Usuario = context.Gestors
                            .Where(g => g.Id == d.CreadoPor)
                            .Select(g => g.Nombre + " " + g.Apellido)
                            .FirstOrDefault() ?? "Sistema",
                        TipoPago = d.TipoPago,
                        Capital = d.Capital ?? 0,
                        Interes = d.Interes ?? 0,
                        Mora = d.Mora ?? 0,
                        NumeroCuota = d.Numeropago,
                        IdPrestamo = d.Idprestamo,
                        FechaPago = d.FechaPago,
                        CreadoPor = d.CreadoPor // Agregar para identificar el usuario que creó el registro
                    })
                    .OrderByDescending(d => d.Id)
                    .ToListAsync();

                // Calcular totales
                var totalIngresos = movimientos.Where(m => m.Tipo == "INGRESO").Sum(m => m.Monto);
                var totalEgresos = movimientos.Where(m => m.Tipo == "EGRESO").Sum(m => m.Monto);

                return Ok(new
                {
                    success = true,
                    data = movimientos,
                    resumen = new
                    {
                        totalMovimientos = movimientos.Count,
                        ingresosDia = totalIngresos,
                        egresosDia = totalEgresos,
                        efectivoDisponible = totalIngresos - totalEgresos
                    },
                    fecha = fecha,
                    usuarioActual = userId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error interno del servidor",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Obtiene los movimientos diarios con información del estado CorteCaja
        /// </summary>
        /// <param name="fecha">Fecha a consultar</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetMovimientosDiarios(DateOnly? fecha)
        {
            try
            {
                // Si no se proporciona fecha, usar la fecha actual
                var fechaConsulta = fecha ?? DateOnly.FromDateTime(DateTime.Now);

                var movimientos = await context.Pagosdetalles
                    .Where(d => d.FechaPago.HasValue && d.FechaPago == fechaConsulta && d.Pagado == 1)
                    .Include(d => d.IdprestamoNavigation)
                        .ThenInclude(p => p.IdclienteNavigation)
                    .Select(d => new
                    {
                        Id = d.Id,
                        Hora = d.FechaCreacion.HasValue ? d.FechaCreacion.Value.ToString("HH:mm") : "",
                        Tipo = d.TipoMovimiento == "PAGO" ? "INGRESO" : "EGRESO",
                        Concepto = d.TipoMovimiento == "DESEMBOLSO"
                            ? $"Desembolso Préstamo #{d.Idprestamo}"
                            : $"Pago Cuota #{d.Numeropago} - Préstamo #{d.Idprestamo}",
                        Cliente = d.IdprestamoNavigation.IdclienteNavigation.Nombre + " " +
                                 d.IdprestamoNavigation.IdclienteNavigation.Apellido,
                        Dui = d.IdprestamoNavigation.IdclienteNavigation.Dui,
                        Monto = d.Monto ?? 0,
                        IdGestor = d.CreadoPor,
                        Usuario = context.Gestors
                            .Where(g => g.Id == d.CreadoPor)
                            .Select(g => g.Nombre + " " + g.Apellido)
                            .FirstOrDefault() ?? "Sistema",
                        TipoPago = d.TipoPago,
                        Capital = d.Capital ?? 0,
                        Interes = d.Interes ?? 0,
                        Mora = d.Mora ?? 0,
                        // Detalles adicionales para el ticket
                        NumeroCuota = d.Numeropago,
                        IdPrestamo = d.Idprestamo,
                        FechaPago = d.FechaPago,
                        Estado = "Procesado",
                        // ✅ AGREGAR CAMPO CORTECAJA
                        corteCaja = d.CorteCaja ?? 0
                    })
                    .OrderByDescending(d => d.Id)
                    .ToListAsync();

                // Calcular totales generales
                var totalIngresos = movimientos.Where(m => m.Tipo == "INGRESO").Sum(m => m.Monto);
                var totalEgresos = movimientos.Where(m => m.Tipo == "EGRESO").Sum(m => m.Monto);
                var cantidadIngresos = movimientos.Count(m => m.Tipo == "INGRESO");
                var cantidadEgresos = movimientos.Count(m => m.Tipo == "EGRESO");

                // Calcular totales por tipo de cobro
                var totalCapital = movimientos.Where(m => m.Tipo == "INGRESO").Sum(m => m.Capital);
                var totalInteres = movimientos.Where(m => m.Tipo == "INGRESO").Sum(m => m.Interes);
                var totalMora = movimientos.Where(m => m.Tipo == "INGRESO").Sum(m => m.Mora);
                var totalDesembolsos = movimientos.Where(m => m.Tipo == "EGRESO").Sum(m => m.Monto);

                // Agrupar por gestor
                var resumenGestores = movimientos
                    .GroupBy(m => new { m.IdGestor, m.Usuario })
                    .Select(g => new
                    {
                        idGestor = g.Key.IdGestor,
                        nombre = g.Key.Usuario,
                        ingresos = g.Where(m => m.Tipo == "INGRESO").Sum(m => m.Monto),
                        egresos = g.Where(m => m.Tipo == "EGRESO").Sum(m => m.Monto),
                        transacciones = g.Count(),
                        // ✅ AGREGAR INFORMACIÓN DE VALIDACIÓN
                        movimientosValidados = g.Count(m => m.corteCaja == 1),
                        movimientosPendientes = g.Count(m => m.corteCaja == 0),
                        corteCompleto = g.All(m => m.corteCaja == 1),
                        movimientos = g.OrderByDescending(m => m.Id).ToList()
                    })
                    .OrderByDescending(g => g.ingresos)
                    .ToList();

                // ✅ CALCULAR ESTADÍSTICAS DE VALIDACIÓN
                var totalMovimientos = movimientos.Count;
                var movimientosValidados = movimientos.Count(m => m.corteCaja == 1);
                var movimientosPendientes = totalMovimientos - movimientosValidados;
                var corteCompleto = totalMovimientos > 0 && movimientosValidados == totalMovimientos;

                return Ok(new
                {
                    success = true,
                    data = movimientos,
                    resumen = new
                    {
                        totalMovimientos = movimientos.Count,
                        ingresos = new
                        {
                            total = totalIngresos,
                            cantidad = cantidadIngresos,
                            capital = totalCapital,
                            interes = totalInteres,
                            mora = totalMora
                        },
                        egresos = new
                        {
                            total = totalEgresos,
                            cantidad = cantidadEgresos,
                            desembolsos = totalDesembolsos
                        },
                        balanceNeto = totalIngresos - totalEgresos,
                        efectivoDisponible = totalIngresos - totalEgresos,
                        // ✅ AGREGAR INFORMACIÓN DE VALIDACIÓN
                        validacion = new
                        {
                            movimientosValidados = movimientosValidados,
                            movimientosPendientes = movimientosPendientes,
                            porcentajeValidado = totalMovimientos > 0 ? (movimientosValidados * 100.0 / totalMovimientos) : 0,
                            corteCompleto = corteCompleto
                        }
                    },
                    gestores = resumenGestores,
                    fecha = fechaConsulta
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error interno del servidor",
                    error = ex.Message
                });
            }
        }


        [HttpGet]
        public async Task<IActionResult> GetMovimientosDetallado(int idMovimiento)
        {
            try
            {
                var movimientoEspecifico = await context.Pagosdetalles
                         .Where(d => d.Id == idMovimiento)
                         .Include(d => d.IdprestamoNavigation)
                             .ThenInclude(p => p.IdclienteNavigation)
                         .Select(d => new
                         {
                             // ✅ Información básica
                             Id = d.Id,
                             Hora = d.FechaCreacion.HasValue ? d.FechaCreacion.Value.ToString("HH:mm") : DateTime.Now.ToString("HH:mm"),
                             Tipo = d.TipoMovimiento == "DESEMBOLSO" ? "EGRESO" : "INGRESO",
                             Concepto = d.TipoMovimiento == "DESEMBOLSO"
                                 ? $"Desembolso Préstamo #{d.Idprestamo}"
                                 : $"Pago Cuota #{d.Numeropago} - Préstamo #{d.Idprestamo}",
                             Cliente = d.IdprestamoNavigation.IdclienteNavigation.Nombre + " " +
                                      d.IdprestamoNavigation.IdclienteNavigation.Apellido,

                             // ✅ Información financiera COMPLETA
                             Monto = d.Monto ?? 0,
                             Capital = d.Capital ?? 0,
                             Interes = d.Interes ?? 0,
                             Mora = d.Mora ?? 0,
                             Morahist = d.Morahist ?? 0,

                             // ✅ Detalles adicionales
                             Usuario = context.Gestors
                                 .Where(g => g.Id == d.CreadoPor)
                                 .Select(g => g.Nombre + " " + g.Apellido)
                                 .FirstOrDefault() ?? "Sistema",
                             TipoPago = d.TipoPago ?? "EFECTIVO",
                             Numeropago = d.Numeropago,
                             FechaPago = d.FechaPago,
                             Pagado = d.Pagado,

                             // ✅ Información del cliente COMPLETA
                             DuiCliente = d.IdprestamoNavigation.IdclienteNavigation.Dui,
                             TelefonoCliente = d.IdprestamoNavigation.IdclienteNavigation.Celular ??
                                              d.IdprestamoNavigation.IdclienteNavigation.Telefono,

                             // ✅ Información del préstamo COMPLETA
                             IdPrestamo = d.Idprestamo,
                             MontoPrestamo = d.IdprestamoNavigation.Monto,
                             EstadoPrestamo = d.IdprestamoNavigation.Estado,
                             TipoPrestamo = d.IdprestamoNavigation.TipoPrestamo
                         })
                         .FirstOrDefaultAsync();

                if (movimientoEspecifico == null)
                {
                    return Ok(new { success = false, message = "Movimiento no encontrado" });
                }

                return Ok(new
                {
                    success = true,
                    data = movimientoEspecifico,
                    message = "Detalle completo obtenido correctamente"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error interno del servidor", error = ex.Message });
            }
        }

        // ===== MÉTODO AUXILIAR PARA CALCULAR FECHAS DE PAGO =====

        private async Task<DateOnly> CalcularProximaFechaPago(int idPrestamo, string tipoPrestamo, DateOnly fechaBase, int numeroCuota)
        {
            try
            {
                // Obtener días festivos del año actual y siguiente
                var añoActual = fechaBase.Year;
                var añoSiguiente = añoActual + 1;

                var diasFestivos = await context.Calendarios
                    .Where(c => c.Fecha.HasValue &&
                               (c.Fecha.Value.Year == añoActual || c.Fecha.Value.Year == añoSiguiente))
                    .Select(c => c.Fecha.Value)
                    .ToListAsync();

                DateOnly proximaFecha = fechaBase;

                // Calcular según el tipo de préstamo
                switch (tipoPrestamo?.ToUpper())
                {
                    case "DIARIO":
                        proximaFecha = AgregarDiasHabiles(fechaBase, 1, diasFestivos);
                        break;

                    case "SEMANAL":
                        proximaFecha = AgregarDiasHabiles(fechaBase, 7, diasFestivos);
                        break;

                    case "QUINCENAL":
                        proximaFecha = AgregarDiasHabiles(fechaBase, 15, diasFestivos);
                        break;

                    case "MENSUAL":
                    default:
                        proximaFecha = AgregarMeses(fechaBase, 1, diasFestivos);
                        break;
                }

                return proximaFecha;
            }
            catch (Exception ex)
            {
                // En caso de error, usar fecha base + 30 días
                return fechaBase.AddDays(30);
            }
        }

        // ===== MÉTODO PARA AGREGAR DÍAS HÁBILES =====
        private DateOnly AgregarDiasHabiles(DateOnly fechaInicial, int diasAgregar, List<DateOnly> diasFestivos)
        {
            var fechaActual = fechaInicial;
            int diasAgregados = 0;

            while (diasAgregados < diasAgregar)
            {
                fechaActual = fechaActual.AddDays(1);

                // ✅ Solo contar días de LUNES A VIERNES + que no sean festivos
                if (!EsFinDeSemana(fechaActual) && !diasFestivos.Contains(fechaActual))
                {
                    diasAgregados++;
                }
            }

            return fechaActual;
        }


        // ===== MÉTODO PARA AGREGAR MESES (PARA PAGOS MENSUALES) =====
        private DateOnly AgregarMeses(DateOnly fechaInicial, int mesesAgregar, List<DateOnly> diasFestivos)
        {
            var fechaCalculada = fechaInicial.AddMonths(mesesAgregar);

            // ✅ Si cae en FIN DE SEMANA (sábado/domingo) o festivo, mover al siguiente día hábil
            while (EsFinDeSemana(fechaCalculada) || diasFestivos.Contains(fechaCalculada))
            {
                fechaCalculada = fechaCalculada.AddDays(1);
            }

            return fechaCalculada;
        }

        // ===== VERIFICAR SI ES FIN DE SEMANA (SÁBADO O DOMINGO) =====
        private bool EsFinDeSemana(DateOnly fecha)
        {
            var dayOfWeek = fecha.DayOfWeek;
            return dayOfWeek == DayOfWeek.Saturday || dayOfWeek == DayOfWeek.Sunday;
        }


        // ===== MÉTODO PARA OBTENER LA PRÓXIMA FECHA DE CUOTA =====
        private async Task<DateOnly> ObtenerProximaFechaCuota(int idPrestamo)
        {
            try
            {
                // Obtener información del préstamo
                var prestamo = await context.Prestamos
                    .FirstOrDefaultAsync(p => p.Id == idPrestamo);

                if (prestamo == null)
                {
                    return DateOnly.FromDateTime(DateTime.Now.AddDays(30));
                }

                // Obtener la última cuota pagada
                var ultimaCuota = await context.Pagosdetalles
                    .Where(p => p.Idprestamo == idPrestamo && p.Pagado == 1)
                    .OrderByDescending(p => p.FechaCouta)
                    .FirstOrDefaultAsync();

                DateOnly fechaBase;
                int numeroCuota = 1;

                if (ultimaCuota != null)
                {
                    // Si ya hay cuotas pagadas, calcular desde la última fecha
                    fechaBase = ultimaCuota.FechaCouta ?? DateOnly.FromDateTime(DateTime.Now);
                    numeroCuota = (ultimaCuota.Numeropago ?? 0) + 1;
                }
                else
                {
                    // Si es la primera cuota, usar la fecha del préstamo
                    fechaBase = prestamo.Fecha ?? DateOnly.FromDateTime(DateTime.Now);
                }

                // Calcular la próxima fecha
                var proximaFecha = await CalcularProximaFechaPago(
                    idPrestamo,
                    prestamo.TipoPrestamo,
                    fechaBase,
                    numeroCuota
                );

                return proximaFecha;
            }
            catch (Exception)
            {
                return DateOnly.FromDateTime(DateTime.Now.AddDays(30));
            }
        }

        // ===== MÉTODO PARA OBTENER CRONOGRAMA DE PAGOS (OPCIONAL) =====
        [HttpGet]
        public async Task<IActionResult> GenerarCronogramaPagos(int idPrestamo)
        {
            try
            {
                var prestamo = await context.Prestamos
                    .FirstOrDefaultAsync(p => p.Id == idPrestamo);

                if (prestamo == null)
                {
                    return Json(new { success = false, message = "Préstamo no encontrado" });
                }

                // ✅ OBTENER TODOS LOS PAGOS REALIZADOS
                var pagosRealizados = await context.Pagosdetalles
                    .Where(p => p.Idprestamo == idPrestamo && p.Pagado == 1)
                    .OrderBy(p => p.Numeropago)
                    .Select(p => new
                    {
                        numeroCuota = p.Numeropago ?? 0,
                        fechaRealPago = p.FechaPago,
                        fechaProgramada = p.FechaCouta,
                        montoTotal = p.Monto ?? 0,
                        capital = p.Capital ?? 0,
                        interes = p.Interes ?? 0,
                        mora = p.Mora ?? 0,
                        tipoPago = p.TipoPago,
                        creadoPor = p.CreadoPor
                    })
                    .ToListAsync();

                var cronograma = new List<object>();
                var fechaActual = prestamo.Fecha ?? DateOnly.FromDateTime(DateTime.Now);
                var montoCuota = prestamo.Cuota ?? 0;
                var capitalPorCuota = (prestamo.Monto ?? 0) / (prestamo.NumCoutas ?? 1);
                var interesPorCuota = prestamo.Interes ?? 0;

                // Obtener días festivos
                var diasFestivos = await context.Calendarios
                    .Where(c => c.Fecha.HasValue)
                    .Select(c => c.Fecha.Value)
                    .ToListAsync();

                for (int i = 1; i <= prestamo.NumCoutas; i++)
                {
                    // Calcular fecha programada para esta cuota
                    fechaActual = await CalcularProximaFechaPago(idPrestamo, prestamo.TipoPrestamo, fechaActual, i);

                    // ✅ BUSCAR SI ESTA CUOTA YA FUE PAGADA
                    var pagoRealizado = pagosRealizados.FirstOrDefault(p => p.numeroCuota == i);

                    if (pagoRealizado != null)
                    {
                        // ✅ CUOTA YA PAGADA - USAR DATOS REALES
                        cronograma.Add(new
                        {
                            numeroCuota = i,
                            fechaProgramada = pagoRealizado.fechaProgramada?.ToString("dd/MM/yyyy") ?? fechaActual.ToString("dd/MM/yyyy"),
                            fechaRealPago = pagoRealizado.fechaRealPago?.ToString("dd/MM/yyyy"),
                            montoCuota = pagoRealizado.montoTotal,
                            capital = pagoRealizado.capital,
                            interes = pagoRealizado.interes,
                            mora = pagoRealizado.mora,
                            // ✅ INFORMACIÓN DE ESTADO
                            pagado = true,
                            estado = "PAGADO",
                            metodoPago = pagoRealizado.tipoPago ?? "EFECTIVO",
                            diasAtraso = CalcularDiasAtraso(pagoRealizado.fechaProgramada, pagoRealizado.fechaRealPago),
                            // ✅ INDICADORES VISUALES
                            claseCss = "table-success",
                            iconoEstado = "✅",
                            colorEstado = "success"
                        });
                    }
                    else
                    {
                        // ✅ CUOTA PENDIENTE - USAR DATOS PROGRAMADOS
                        var hoy = DateOnly.FromDateTime(DateTime.Now);
                        var estaVencida = fechaActual < hoy;
                        var diasVencimiento = estaVencida ? (hoy.DayNumber - fechaActual.DayNumber) : 0;

                        cronograma.Add(new
                        {
                            numeroCuota = i,
                            fechaProgramada = fechaActual.ToString("dd/MM/yyyy"),
                            fechaRealPago = (string)null,
                            montoCuota = montoCuota,
                            capital = capitalPorCuota,
                            interes = interesPorCuota,
                            mora = 0,
                            // ✅ INFORMACIÓN DE ESTADO
                            pagado = false,
                            estado = estaVencida ? "VENCIDO" : "PENDIENTE",
                            metodoPago = (string)null,
                            diasAtraso = estaVencida ? diasVencimiento : 0,
                            // ✅ INDICADORES VISUALES
                            claseCss = estaVencida ? "table-danger" : "table-warning",
                            iconoEstado = estaVencida ? "❌" : "⏳",
                            colorEstado = estaVencida ? "danger" : "warning"
                        });
                    }
                }

                // ✅ ESTADÍSTICAS ADICIONALES
                var totalPagadas = pagosRealizados.Count;
                var totalPendientes = (prestamo.NumCoutas ?? 0) - totalPagadas;
                var totalPagado = pagosRealizados.Sum(p => p.capital);
                var saldoPendiente = (prestamo.Monto ?? 0) - totalPagado;
                var cuotasVencidas = cronograma.Count(c => ((dynamic)c).estado == "VENCIDO");

                return Json(new
                {
                    success = true,
                    cronograma = cronograma,
                    // ✅ INFORMACIÓN DEL PRÉSTAMO
                    prestamo = new
                    {
                        id = prestamo.Id,
                        monto = prestamo.Monto,
                        numCoutas = prestamo.NumCoutas,
                        tipoPrestamo = prestamo.TipoPrestamo,
                        fechaInicio = prestamo.Fecha?.ToString("dd/MM/yyyy"),
                        proximoPago = prestamo.ProximoPago?.ToString("dd/MM/yyyy"),
                        estado = prestamo.Estado
                    },
                    // ✅ ESTADÍSTICAS DEL CRONOGRAMA
                    estadisticas = new
                    {
                        totalCuotas = prestamo.NumCoutas ?? 0,
                        cuotasPagadas = totalPagadas,
                        cuotasPendientes = totalPendientes,
                        cuotasVencidas = cuotasVencidas,
                        totalPagado = totalPagado,
                        saldoPendiente = saldoPendiente,
                        porcentajePagado = prestamo.Monto > 0 ? Math.Round((totalPagado / (prestamo.Monto ?? 1)) * 100, 2) : 0
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ✅ MÉTODO AUXILIAR PARA CALCULAR DÍAS DE ATRASO
        private int CalcularDiasAtraso(DateOnly? fechaProgramada, DateOnly? fechaRealPago)
        {
            if (!fechaProgramada.HasValue || !fechaRealPago.HasValue)
                return 0;

            if (fechaRealPago > fechaProgramada)
            {
                return fechaRealPago.Value.DayNumber - fechaProgramada.Value.DayNumber;
            }

            return 0; // Pagó a tiempo o antes
        }




        [HttpGet]
        public async Task<IActionResult> GetPrestamosConCalendario(int idCliente)
        {
            var prestamos = await context.Prestamos
                .Where(p => p.Idcliente == idCliente && p.Estado == "A")
                .Select(p => new
                {
                    id = p.Id,
                    monto = p.Monto,
                    cuotas = p.Cuota,
                    numCuotas = p.NumCoutas,
                    tipoPrestamo = p.TipoPrestamo,
                    fecha = p.Fecha.HasValue ? p.Fecha.Value.ToString("dd/MM/yyyy") : "",
                    proximoPago = p.ProximoPago.HasValue ? p.ProximoPago.Value.ToString("dd/MM/yyyy") : "",
                    estado = p.Estado,

                    // Información calculada del calendario
                    cuotasPagadas = context.CalendarioPagos
                    .Where(cp => cp.IdPrestamo == p.Id)
                    .Where(cp => cp.Estado == "PAGADO" || cp.Estado == "PARCIAL")
                    .Count(),

                    saldoPendiente = context.CalendarioPagos
                        .Where(cp => cp.IdPrestamo == p.Id && cp.Estado == "PENDIENTE")
                        .Sum(cp => cp.MontoCuota),
                    capitalPendiente = p.Monto - context.CalendarioPagos
                        .Where(cp => cp.IdPrestamo == p.Id && cp.Estado != "PENDIENTE")
                        .Sum(cp => cp.Capital),
                    cuotasVencidas = context.CalendarioPagos
                        .Where(cp => cp.IdPrestamo == p.Id &&
                                   cp.Estado == "PENDIENTE" &&
                                   cp.FechaProgramada < DateOnly.FromDateTime(DateTime.Today))
                        .Count(),

                    proximaCuota = context.CalendarioPagos
                        .Where(cp => cp.IdPrestamo == p.Id && cp.Estado == "PENDIENTE")
                        .OrderBy(cp => cp.FechaProgramada)
                        .Select(cp => cp.NumeroCuota)
                        .FirstOrDefault(),

                })
                .ToListAsync();

            return Json(new { success = true, data = prestamos });
        }

        // =====================================================
        // NUEVO MÉTODO: Obtener cronograma real de pagos
        // =====================================================

        [HttpGet]
        public async Task<IActionResult> GetCronogramaPagosReal(int idPrestamo)
        {
            var cronograma = await context.CalendarioPagos
                .Where(cp => cp.IdPrestamo == idPrestamo)
                .OrderBy(cp => cp.NumeroCuota)
                .Select(cp => new
                {
                    numeroCuota = cp.NumeroCuota,
                    fechaProgramada = cp.FechaProgramada.ToString("dd/MM/yyyy"),
                    fechaRealPago = cp.FechaPagoReal.HasValue ? cp.FechaPagoReal.Value.ToString("dd/MM/yyyy") : null,
                    montoCuota = cp.MontoCuota,
                    montoPagado = cp.MontoPagado,
                    capital = cp.Capital,
                    interes = cp.Interes,
                    mora = cp.Mora,
                    estado = cp.Estado,
                    diasMora = cp.DiasMora,
                    domicilio = cp.Domicilio,
                    pagado = cp.Estado == "PAGADO" || cp.Estado == "PARCIAL",
                    vencido = cp.Estado == "PENDIENTE" && cp.FechaProgramada < DateOnly.FromDateTime(DateTime.Today),
                    puedeSeleccionar = cp.Estado == "PENDIENTE" ||
                                     (cp.Estado == "PENDIENTE" && cp.FechaProgramada <= DateOnly.FromDateTime(DateTime.Today).AddDays(5)) // Permitir hasta 30 días adelantado
                })
                .ToListAsync();

            return Json(new { success = true, cronograma = cronograma });
        }



        // 1. Método en AuxiliaresController para obtener permisos del usuario
        [HttpGet]
        public IActionResult GetPermisosUsuario()
        {
            var permisos = User.Claims
                .Where(c => c.Type == "ModuloPermiso")
                .Select(c => c.Value)
                .ToList();

            // Console para ver el contenido
            Console.WriteLine($"Total de permisos encontrados: {permisos.Count}");
            Console.WriteLine("Permisos del usuario:");
            foreach (var permiso in permisos)
            {
                Console.WriteLine($"- {permiso}");
            }

            return Json(new { permisos = permisos });
        }


        [HttpGet]
        public async Task<IActionResult> GetPermisos()
        {
            try
            {
                var permisos = await context.Permisos
                    .Select(p => new
                    {
                        id = p.Id,
                        modulo = p.Modulo ?? string.Empty,
                        permiso1 = p.Permiso1 ?? string.Empty
                    })
                    .OrderBy(p => p.modulo)
                    .ThenBy(p => p.permiso1)
                    .ToListAsync();

                return Ok(permisos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Error al obtener permisos: {ex.Message}" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetPermisosPorPuesto(int puestoId)
        {
            try
            {
                var permisosAsignados = await context.PuestoPermisos
                    .Where(pp => pp.PuestoId == puestoId)
                    .Select(pp => new
                    {
                        id = pp.Id,
                        puestoId = pp.PuestoId,
                        permisoId = pp.PermisoId,
                        activo = pp.Activo
                    })
                    .ToListAsync();

                return Ok(permisosAsignados);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Error al obtener permisos del puesto: {ex.Message}" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetConteoPermisosPorPuesto()
        {
            try
            {
                var conteos = await context.PuestoPermisos
                    .Where(pp => pp.Activo == 1)
                    .GroupBy(pp => pp.PuestoId)
                    .Select(g => new
                    {
                        puestoId = g.Key,
                        cantidad = g.Count()
                    })
                    .ToListAsync();

                return Ok(conteos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Error al obtener conteos: {ex.Message}" });
            }
        }


        /// <summary>
        /// Obtiene información detallada para liquidación de un préstamo específico
        /// </summary>
        /// <param name="idPrestamo">ID del préstamo</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetInformacionLiquidacion(int idPrestamo)
        {
            try
            {
                var prestamo = await context.Prestamos
                    .Include(p => p.IdclienteNavigation)
                    .FirstOrDefaultAsync(p => p.Id == idPrestamo && p.Estado == "A");

                if (prestamo == null)
                {
                    return Json(new { success = false, message = "Préstamo no encontrado o no está activo" });
                }

                // Obtener historial de pagos
                var pagosRealizados = await context.Pagosdetalles
                    .Where(p => p.Idprestamo == idPrestamo && p.Pagado == 1)
                    .OrderByDescending(p => p.FechaPago)
                    .Select(p => new
                    {
                        id = p.Id,
                        numeroPago = p.Numeropago,
                        fechaPago = p.FechaPago,
                        monto = p.Monto,
                        capital = p.Capital,
                        interes = p.Interes,
                        mora = p.Mora,
                        tipoMovimiento = p.TipoMovimiento,
                        tipoPago = p.TipoPago,
                        observaciones = p.ObservacionesMovimiento
                    })
                    .ToListAsync();

                // Calcular saldos
                var pagosValidos = pagosRealizados.Where(p => p.tipoMovimiento != "DESEMBOLSO").ToList();
                var capitalPagado = pagosValidos.Sum(p => p.capital ?? 0);
                var interesPagado = pagosValidos.Sum(p => p.interes ?? 0);

                var saldoCapital = (prestamo.Monto ?? 0) - capitalPagado;
                var interesTotal = prestamo.Interes ?? 0;
                var interesPendiente = Math.Max(0, interesTotal - interesPagado);

                // Calcular liquidación con descuento
                var descuentoInteres = interesPendiente * 0.10m;
                var interesConDescuento = interesPendiente - descuentoInteres;
                var totalLiquidacion = saldoCapital + interesConDescuento;

                var informacion = new
                {
                    success = true,
                    prestamo = new
                    {
                        id = prestamo.Id,
                        cliente = new
                        {
                            nombre = $"{prestamo.IdclienteNavigation?.Nombre} {prestamo.IdclienteNavigation?.Apellido}",
                            dui = prestamo.IdclienteNavigation?.Dui
                        },
                        montoOriginal = prestamo.Monto,
                        fecha = prestamo.Fecha,
                        tipoPrestamo = prestamo.TipoPrestamo,
                        numCuotas = prestamo.NumCoutas,
                        cuotaMensual = prestamo.Cuota,
                        tasa = prestamo.Tasa,
                        interesTotal = interesTotal,
                        estado = prestamo.Estado
                    },
                    saldos = new
                    {
                        capitalPagado = capitalPagado,
                        interesPagado = interesPagado,
                        saldoCapital = saldoCapital,
                        interesPendiente = interesPendiente,
                        // Liquidación
                        descuentoInteres = descuentoInteres,
                        interesConDescuento = interesConDescuento,
                        totalLiquidacion = totalLiquidacion,
                        ahorroCliente = descuentoInteres
                    },
                    estadisticas = new
                    {
                        cuotasPagadas = pagosValidos.Count,
                        cuotasPendientes = (prestamo.NumCoutas ?? 0) - pagosValidos.Count,
                        porcentajePagado = prestamo.Monto > 0 ? (capitalPagado / prestamo.Monto) * 100 : 0,
                        ultimoPago = pagosValidos.FirstOrDefault()?.fechaPago
                    },
                    historialPagos = pagosRealizados
                };

                return Json(informacion);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al obtener información", error = ex.Message });
            }
        }

        // ===== CLASE PARA EL REQUEST DE LIQUIDACIÓN =====
        public class LiquidacionRequest
        {
            public int IdPrestamo { get; set; }
            public decimal MontoTotal { get; set; }
            public string Observaciones { get; set; } = string.Empty;
            public string MetodoPago { get; set; } = "LIQUIDACION_TOTAL";
        }

        // <summary>
        /// Obtiene un préstamo específico por su ID con toda la información necesaria para liquidación
        /// </summary>
        /// <param name="idPrestamo">ID del préstamo a buscar</param>
        /// <returns>Información completa del préstamo para liquidación</returns>
        [HttpGet]
        public async Task<IActionResult> GetPrestamoById(int idPrestamo)
        {
            try
            {
                Console.WriteLine($"🔍 Buscando préstamo con ID: {idPrestamo}");

                // Buscar el préstamo con información del cliente
                var prestamo = await context.Prestamos
                    .Where(p => p.Id == idPrestamo)
                    .Include(p => p.IdclienteNavigation)
                    .FirstOrDefaultAsync();

                if (prestamo == null)
                {
                    Console.WriteLine($"❌ Préstamo {idPrestamo} no encontrado");
                    return Json(new
                    {
                        success = false,
                        message = $"No se encontró un préstamo con el número {idPrestamo}"
                    });
                }

                Console.WriteLine($"✅ Préstamo encontrado: {prestamo.Id}");

                // Obtener todos los pagos realizados
                var pagosRealizados = await context.Pagosdetalles
                    .Where(p => p.Idprestamo == idPrestamo && p.Pagado == 1)
                    .ToListAsync();

                // Calcular estadísticas de pago
                decimal capitalPagado = pagosRealizados
                    .Where(p => p.TipoMovimiento != "DESEMBOLSO")
                    .Sum(p => p.Capital ?? 0);

                decimal interesPagado = pagosRealizados
                    .Where(p => p.TipoMovimiento != "DESEMBOLSO")
                    .Sum(p => p.Interes ?? 0);

                decimal moraPagada = pagosRealizados
                    .Where(p => p.TipoMovimiento != "DESEMBOLSO")
                    .Sum(p => p.Mora ?? 0);

                // Calcular saldos pendientes
                decimal saldoCapital = (prestamo.Monto ?? 0) - capitalPagado;
                decimal interesPendiente = (prestamo.Interes ?? 0) - interesPagado;

                // Aplicar descuento del 10% al interés pendiente para liquidación
                decimal interesConDescuento = interesPendiente * 0.9m;
                decimal descuentoAplicado = interesPendiente * 0.1m;
                decimal totalLiquidacion = saldoCapital + interesConDescuento;

                // Verificar si puede ser liquidado
                bool puedeSerLiquidado = prestamo.Estado == "A" && saldoCapital > 0;
                string razonNoLiquidable = "";

                if (prestamo.Estado != "A")
                {
                    razonNoLiquidable = prestamo.Estado == "C" ? "El préstamo ya está cancelado" :
                                       prestamo.Estado == "E" ? "El préstamo está eliminado" :
                                       "El préstamo no está activo";
                }
                else if (saldoCapital <= 0)
                {
                    razonNoLiquidable = "El préstamo ya está completamente pagado";
                }

                Console.WriteLine($"📊 Estadísticas calculadas - Capital pendiente: {saldoCapital}, Interés pendiente: {interesPendiente}");

                // Preparar respuesta completa
                var respuesta = new
                {
                    success = true,
                    prestamo = new
                    {
                        // Información básica
                        id = prestamo.Id,
                        idCliente = prestamo.Idcliente,
                        nombreCliente = $"{prestamo.IdclienteNavigation?.Nombre} {prestamo.IdclienteNavigation?.Apellido}".Trim(),
                        duiCliente = prestamo.IdclienteNavigation?.Dui ?? "Sin DUI",
                        telefonoCliente = prestamo.IdclienteNavigation?.Celular ?? prestamo.IdclienteNavigation?.Telefono ?? "Sin teléfono",

                        // Detalles financieros
                        fecha = prestamo.Fecha?.ToString("dd/MM/yyyy") ?? "Sin fecha",
                        monto = prestamo.Monto ?? 0,
                        tasa = prestamo.Tasa ?? 0,
                        tasaDomicilio = prestamo.TasaDomicilio ?? 0,
                        numCoutas = prestamo.NumCoutas ?? 0,
                        cuotas = prestamo.Cuota ?? 0,
                        interes = prestamo.Interes ?? 0,
                        domicilio = prestamo.Domicilio ?? 0,
                        proximoPago = prestamo.ProximoPago?.ToString("dd/MM/yyyy"),

                        // Estado y tipo
                        estado = prestamo.Estado,
                        estadoDescripcion = prestamo.Estado == "A" ? "Activo" :
                                          prestamo.Estado == "C" ? "Cancelado" :
                                          prestamo.Estado == "E" ? "Eliminado" :
                                          prestamo.Estado == "P" ? "Pendiente" : "Desconocido",
                        tipoPrestamo = prestamo.TipoPrestamo ?? "NORMAL",

                        // Fechas importantes
                        fechaCreacion = prestamo.FechaCreadafecha?.ToString("dd/MM/yyyy"),
                        fechaCancelado = prestamo.FechaCancelado?.ToString("dd/MM/yyyy")
                    },
                    estadisticas = new
                    {
                        // Pagos realizados
                        capitalPagado = capitalPagado,
                        interesPagado = interesPagado,
                        moraPagada = moraPagada,
                        totalPagado = capitalPagado + interesPagado + moraPagada,

                        // Saldos pendientes
                        saldoCapital = saldoCapital,
                        interesPendiente = interesPendiente,

                        // Cálculos de liquidación
                        interesConDescuento = interesConDescuento,
                        descuentoAplicado = descuentoAplicado,
                        totalLiquidacion = totalLiquidacion,
                        ahorroCliente = descuentoAplicado,

                        // Estadísticas generales
                        cuotasPagadas = pagosRealizados.Count(p => p.TipoMovimiento != "DESEMBOLSO"),
                        cuotasPendientes = Math.Max(0, (prestamo.NumCoutas ?? 0) - pagosRealizados.Count(p => p.TipoMovimiento != "DESEMBOLSO")),
                        porcentajePagado = prestamo.Monto > 0 ? (capitalPagado / prestamo.Monto) * 100 : 0,

                        // Validación de liquidación
                        puedeSerLiquidado = puedeSerLiquidado,
                        razonNoLiquidable = razonNoLiquidable,

                        // Última actividad
                        ultimoPago = pagosRealizados
                            .Where(p => p.TipoMovimiento != "DESEMBOLSO")
                            .OrderByDescending(p => p.FechaPago)
                            .FirstOrDefault()?.FechaPago?.ToString("dd/MM/yyyy") ?? "Sin pagos"
                    },
                    historialPagos = pagosRealizados
                        .Where(p => p.TipoMovimiento != "DESEMBOLSO")
                        .OrderByDescending(p => p.FechaPago)
                        .Take(10)
                        .Select(p => new
                        {
                            id = p.Id,
                            fecha = p.FechaPago?.ToString("dd/MM/yyyy") ?? "Sin fecha",
                            numeroCuota = p.Numeropago,
                            monto = p.Monto ?? 0,
                            capital = p.Capital ?? 0,
                            interes = p.Interes ?? 0,
                            mora = p.Mora ?? 0,
                            tipoPago = p.TipoPago ?? "EFECTIVO"
                        })
                        .ToList()
                };

                Console.WriteLine($"✅ Respuesta preparada para préstamo {idPrestamo}");
                return Json(respuesta);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error al buscar préstamo {idPrestamo}: {ex.Message}");
                return Json(new
                {
                    success = false,
                    message = "Error interno al buscar el préstamo",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        ///  Solicitudes por rango de fecha , estado y si es gestor de cuenta filtra por gestor
        /// </summary>
        /// <param name="estado"></param>
        /// <param name="fechaInicio"></param>
        /// <param name="fechaFin"></param>
        /// <param name="extra"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetSolicitudes(string estado, DateOnly? fechaInicio, DateOnly? fechaFin, string extra)
        {
            var gestorId = HttpContext.Session.GetInt32("GestorId");
            IQueryable<Prestamo> query = context.Prestamos;

            if (estado == "0" || estado == "1")
            {
                ulong aprobadoValor = Convert.ToUInt64(estado);
                query = query.Where(c => c.Aprobado == aprobadoValor);
            }

            // Omite si tiene permisos como adminsitrador para poder verlas todas si no entonces aplica al filtro de gesto
            if (!User.TienePermiso("Home/SolicitudesPrestamo", "Admin"))
            {
                // Filtra por los clientes asignados al gestor
                query = query.Include(p => p.IdclienteNavigation)
                                 .Where(c => c.IdclienteNavigation.Idgestor == gestorId.Value);
            }


            // Aplicar filtro de fechas solo si se seleccionó una opción válida
            if (extra == "1" && fechaInicio.HasValue && fechaFin.HasValue)
            {
                // Filtrar por fecha del préstamo
                query = query.Where(c => c.Fecha >= fechaInicio && c.Fecha <= fechaFin);
            }

            var a = await query
                .Select(c => new PrestamosVM
                {
                    Id = c.Id,
                    IdCliente = c.Idcliente,
                    NombreCliente = context.Clientes
                        .Where(a => a.Id == c.Idcliente)
                        .Select(a => a.Nombre + " " + a.Apellido + " (" + a.Dui + ")")
                        .FirstOrDefault(),
                    fecha = c.Fecha,
                    Monto = c.Monto,
                    Tasa = c.Tasa,
                    NumCoutas = c.NumCoutas,
                    Cuotas = c.Cuota,
                    Interes = c.Interes,
                    ProximoPago = c.ProximoPago,
                    Estado = c.Estado,
                    FechaCancelado = c.FechaCancelado,
                    TipoPrestamo = c.TipoPrestamo,
                    Aprobado = c.Aprobado,
                    CreadoPor = c.CreadaPor,
                    FechaCreadaFecha = c.FechaCreadafecha,
                    TasaDomicilio = c.TasaDomicilio,
                    Domicilio = c.Domicilio,
                    DetalleAprobado = c.DetalleAprobado,
                    Observaciones = c.Observaciones,
                    DetalleRechazo = c.DetalleRechazo,
                    NombreCreadoPor = context.Gestors
                        .Where(a => a.Id == c.CreadaPor)
                        .Select(a => a.Nombre + " " + a.Apellido)
                        .FirstOrDefault() ?? "Gestor no asignado",
                    NombreGestor = context.Gestors
                        .Where(a => a.Id == c.IdclienteNavigation.Idgestor)
                        .Select(a => a.Nombre + " " + a.Apellido)
                        .FirstOrDefault() ?? "Gestor no asignado"
                })
                .ToListAsync();

            return Ok(a);
        }

        //======================================================================
        // SOLICITUDES DE POST
        //======================================================================

        /// <summary>
        /// Metodo para Editar solicitudes del prestamo 
        /// </summary>
        /// <param name="idSolicitud"></param>
        /// <param name="monto"></param>
        /// <param name="numCuotas"></param>
        /// <param name="tasa"></param>
        /// <param name="tasaDomicilio"></param>
        /// <param name="motivo"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult EditarSolicitudPrestamo([FromForm] int idSolicitud, [FromForm] decimal monto,
            [FromForm] int numCuotas, [FromForm] decimal tasa, [FromForm] decimal tasaDomicilio,
            [FromForm] string motivo, [FromForm] decimal montoCuota)
        {
            try
            {
                // Validar que la solicitud existe
                var solicitud = context.Prestamos.FirstOrDefault(p => p.Id == idSolicitud);
                if (solicitud == null)
                {
                    return Json(new { success = false, message = "La solicitud no existe." });
                }

                // Validar que no esté aprobada
                if (solicitud.Aprobado == 1)
                {
                    return Json(new { success = false, message = "No se puede editar una solicitud ya aprobada." });
                }

                if (numCuotas <= 0)
                {
                    return Json(new { success = false, message = "El número de cuotas debe ser mayor a 0" });
                }

                if (tasa <= 0)
                {
                    return Json(new { success = false, message = "La tasa de interés debe ser mayor a 1%" });
                }

                if (tasaDomicilio < 0)
                {
                    return Json(new { success = false, message = "La tasa de domicilio debe ser mayor 0%" });
                }

                if (string.IsNullOrWhiteSpace(motivo) || motivo.Trim().Length < 10)
                {
                    return Json(new { success = false, message = "El motivo debe tener al menos 10 caracteres." });
                }

                // Calcular nueva cuota
                var interes = monto * (tasa / 100) * numCuotas;
                var domicilio = monto * (tasaDomicilio / 100) * numCuotas;
                var total = monto + interes + domicilio;
                var nuevaCuota = total / numCuotas;

                // Actualizar la solicitud
                solicitud.Monto = monto;
                solicitud.NumCoutas = numCuotas;
                solicitud.Tasa = tasa;
                solicitud.TasaDomicilio = tasaDomicilio;
                solicitud.Cuota = montoCuota;
                //solicitud.cou = nuevaCuota;

                // Agregar motivo a observaciones
                if (string.IsNullOrEmpty(solicitud.Observaciones))
                {
                    solicitud.Observaciones = $"MODIFICADO: {motivo.Trim()}";
                }
                else
                {
                    solicitud.Observaciones += $"\n\nMODIFICADO ({DateTime.Now:dd/MM/yyyy HH:mm}): {motivo.Trim()}";
                }

                // Guardar cambios
                context.SaveChanges();

                return Json(new
                {
                    success = true,
                    message = "Solicitud modificada exitosamente.",
                    data = new
                    {
                        solicitudId = idSolicitud,
                        nuevoCuota = nuevaCuota.ToString("F2"),
                        nuevoTotal = total.ToString("F2"),
                        fechaModificacion = DateTime.Now.ToString("dd/MM/yyyy HH:mm")
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = $"Error inesperado: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Crear un nuevo cliente
        /// </summary>
        /// <param name="cliente"></param>
        /// <param name="DuiFrente"></param>
        /// <param name="DuiDetras"></param>
        /// <param name="FotoNegocio1"></param>
        /// <param name="FotoNegocio2"></param>
        /// <param name="FotoNegocio3"></param>
        /// <param name="FotoNegocio4"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult CrearCliente([FromForm] Cliente cliente, IFormFile? DuiFrente, IFormFile? DuiDetras, IFormFile? FotoNegocio1, IFormFile? FotoNegocio2, IFormFile? FotoNegocio3, IFormFile? FotoNegocio4)
        {
            try
            {

                var clienteExistente = context.Clientes.FirstOrDefault(c => c.Dui == cliente.Dui);
                if (clienteExistente != null)
                {
                    TempData["Mensaje"] = "El cliente con ese DUI ya existe.";
                    TempData["TipoMensaje"] = "warning";
                    return RedirectToAction("Clientes", "Home");
                }

                // Guardar imágenes si se enviaron
                string GuardarImagen(IFormFile? file)
                {
                    if (file == null) return null;

                    var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/clientes");
                    if (!Directory.Exists(folderPath))
                        Directory.CreateDirectory(folderPath);

                    var fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
                    var fullPath = Path.Combine(folderPath, fileName);

                    using (var stream = new FileStream(fullPath, FileMode.Create))
                    {
                        file.CopyTo(stream);
                    }

                    return "/uploads/clientes/" + fileName; // URL accesible desde el navegador
                }

                if (DuiFrente != null) cliente.DuiFrente = GuardarImagen(DuiFrente);
                if (DuiDetras != null) cliente.DuiDetras = GuardarImagen(DuiDetras);
                if (FotoNegocio1 != null) cliente.Fotonegocio1 = GuardarImagen(FotoNegocio1);
                if (FotoNegocio2 != null) cliente.Fotonegocio2 = GuardarImagen(FotoNegocio2);
                if (FotoNegocio3 != null) cliente.Fotonegocio3 = GuardarImagen(FotoNegocio3);
                if (FotoNegocio4 != null) cliente.Fotonegocio4 = GuardarImagen(FotoNegocio4);
                cliente.FechaIngreso = DateOnly.FromDateTime(DateTime.Now);
                cliente.Activo = 1;
                context.Clientes.Add(cliente);
                context.SaveChanges();

                TempData["Mensaje"] = "Cliente creado correctamente";
                TempData["TipoMensaje"] = "success";
                return RedirectToAction("Clientes", "Home");
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Ocurrió un error inesperado, {ex.Message}";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Clientes", "Home");
            }
        }

        /// <summary>
        /// Editar datos de cliente
        /// </summary>
        /// <param name="cliente"></param>
        /// <param name="DuiFrente"></param>
        /// <param name="DuiDetras"></param>
        /// <param name="FotoNegocio1"></param>
        /// <param name="FotoNegocio2"></param>
        /// <param name="FotoNegocio3"></param>
        /// <param name="FotoNegocio4"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult EditarCliente([FromForm] Cliente cliente, IFormFile? DuiFrente, IFormFile? DuiDetras, IFormFile? FotoNegocio1, IFormFile? FotoNegocio2, IFormFile? FotoNegocio3, IFormFile? FotoNegocio4)
        {
            var exists = context.Clientes.FirstOrDefault(c => c.Id == cliente.Id);
            if (exists == null)
            {
                TempData["Mensaje"] = "El cliente con ese DUI No existe.";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Clientes", "Home");
            }

            try
            {
                string GuardarImagen(IFormFile? file)
                {
                    if (file == null) return null;

                    var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/clientes");
                    if (!Directory.Exists(folderPath))
                        Directory.CreateDirectory(folderPath);

                    var fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
                    var fullPath = Path.Combine(folderPath, fileName);

                    using (var stream = new FileStream(fullPath, FileMode.Create))
                    {
                        file.CopyTo(stream);
                    }

                    return "/uploads/clientes/" + fileName;
                }

                void EliminarImagen(string? rutaRelativa)
                {
                    if (string.IsNullOrWhiteSpace(rutaRelativa)) return;

                    var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", rutaRelativa.TrimStart('/'));
                    if (System.IO.File.Exists(fullPath))
                        System.IO.File.Delete(fullPath);
                }

                // Si llega una nueva imagen, eliminar la vieja y guardar la nueva
                if (DuiFrente != null)
                {
                    EliminarImagen(exists.DuiFrente);
                    exists.DuiFrente = GuardarImagen(DuiFrente);
                }

                if (DuiDetras != null)
                {
                    EliminarImagen(exists.DuiDetras);
                    exists.DuiDetras = GuardarImagen(DuiDetras);
                }

                if (FotoNegocio1 != null)
                {
                    EliminarImagen(exists.Fotonegocio1);
                    exists.Fotonegocio1 = GuardarImagen(FotoNegocio1);
                }

                if (FotoNegocio2 != null)
                {
                    EliminarImagen(exists.Fotonegocio2);
                    exists.Fotonegocio2 = GuardarImagen(FotoNegocio2);
                }

                if (FotoNegocio3 != null)
                {
                    EliminarImagen(exists.Fotonegocio3);
                    exists.Fotonegocio3 = GuardarImagen(FotoNegocio3);
                }

                if (FotoNegocio4 != null)
                {
                    EliminarImagen(exists.Fotonegocio4);
                    exists.Fotonegocio4 = GuardarImagen(FotoNegocio4);
                }

                // Actualizar datos normales
                exists.Nombre = cliente.Nombre;
                exists.Apellido = cliente.Apellido;
                exists.Dui = cliente.Dui;
                exists.Nit = cliente.Nit;
                exists.Telefono = cliente.Telefono;
                exists.Celular = cliente.Celular;
                exists.Direccion = cliente.Direccion;
                exists.FechaNacimiento = cliente.FechaNacimiento;
                exists.Giro = cliente.Giro;
                exists.Referencia1 = cliente.Referencia1;
                exists.Telref1 = cliente.Telref1;
                exists.Referencia2 = cliente.Referencia2;
                exists.Telref2 = cliente.Telref2;
                exists.Departamento = cliente.Departamento;
                exists.Idgestor = cliente.Idgestor;
                exists.Sexo = cliente.Sexo;
                exists.Activo = cliente.Activo;
                exists.TipoPer = cliente.TipoPer;
                exists.Latitud = cliente.Latitud;
                exists.Longitud = cliente.Longitud;
                exists.Profesion = cliente.Profesion;
                exists.Email = cliente.Email;

                context.SaveChanges();
                TempData["Mensaje"] = "Cliente modificado correctamente";
                TempData["TipoMensaje"] = "success";
                return RedirectToAction("Clientes", "Home");
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Ocurrió un error inesperado: {ex.Message}";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Clientes", "Home");
            }
        }

        /// <summary>
        /// Eliminar cliente
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult EliminarCliente(int id)
        {
            var cliente = context.Clientes.FirstOrDefault(c => c.Id == id);
            if (cliente == null)
                return NotFound("Cliente no encontrado");

            try
            {
                // Función para borrar una imagen física si existe
                void EliminarImagen(string? rutaRelativa)
                {
                    if (string.IsNullOrWhiteSpace(rutaRelativa)) return;

                    var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", rutaRelativa.TrimStart('/'));
                    if (System.IO.File.Exists(fullPath))
                    {
                        System.IO.File.Delete(fullPath);
                    }
                }

                // Eliminar fotos físicas del cliente
                EliminarImagen(cliente.DuiFrente);
                EliminarImagen(cliente.DuiDetras);
                EliminarImagen(cliente.Fotonegocio1);
                EliminarImagen(cliente.Fotonegocio2);
                EliminarImagen(cliente.Fotonegocio3);
                EliminarImagen(cliente.Fotonegocio4);

                // Eliminar cliente de la base de datos
                context.Clientes.Remove(cliente);
                context.SaveChanges();

                TempData["Mensaje"] = "Cliente eliminado correctamente";
                TempData["TipoMensaje"] = "success";
            }
            catch (DbUpdateException ex)
            {
                if (ex.InnerException != null && ex.InnerException.Message.Contains("REFERENCE"))
                {
                    TempData["Mensaje"] = "No se puede eliminar el cliente porque tiene préstamos asociados.";
                }
                else
                {
                    TempData["Mensaje"] = $"Ocurrió un error inesperado: {ex.Message}";
                }
                TempData["TipoMensaje"] = "danger";
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Error inesperado: {ex.Message}";
                TempData["TipoMensaje"] = "danger";
            }

            return RedirectToAction("Clientes", "Home");
        }


        /// <summary>
        /// Crear un nuevo colaborador
        /// </summary>
        /// <param name="user"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult CrearColaborador([FromForm] Gestor user)
        {
            try
            {

                user.Activo = 1;
                context.Gestors.Add(user);
                context.SaveChanges();

                TempData["Mensaje"] = "Colaborador creado correctamente";
                TempData["TipoMensaje"] = "success";
                return RedirectToAction("Colaboradores", "Home");
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Ocurrió un error inesperado, {ex.Message}";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Colaboradores", "Home");
            }
        }


        /// <summary>
        /// Editar un colaborador existente
        /// </summary>
        /// <param name="user"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult EdiarColaborador([FromForm] Gestor user)
        {
            var exists = context.Gestors.FirstOrDefault(c => c.Id == user.Id);
            if (exists == null)
            {
                TempData["Mensaje"] = "Colaborador no encontrado";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Colaboradores", "Home");
            }

            try
            {
                exists.Nombre = user.Nombre;
                exists.Apellido = user.Apellido;
                exists.Telefono = user.Telefono;
                exists.Direccion = user.Direccion;
                exists.Departamento = user.Departamento;
                exists.Activo = user.Activo;
                exists.Idpuesto = user.Idpuesto;

                context.SaveChanges();
                TempData["Mensaje"] = "Colaborador modificado correctamente";
                TempData["TipoMensaje"] = "success";
                return RedirectToAction("Colaboradores", "Home");
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Ocurrió un error inesperado: {ex.Message}";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Colaboradores", "Home");
            }
        }


        /// <summary>
        /// Elimina un colaboraror de la base de datos.
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult EliminarColaborador(int id)
        {
            var exists = context.Gestors.FirstOrDefault(c => c.Id == id);
            if (exists == null)
            {
                TempData["Mensaje"] = "Colaborador no encontrado";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Colaboradores", "Home");
            }

            var cliente = context.Clientes.Any(c => c.Idgestor == id);
            if (cliente)
            {
                TempData["Mensaje"] = "Colaborador no se puede eliminar, tiene Clientes Asignados";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Colaboradores", "Home");
            }

            try
            {
                var user = context.Logins.FirstOrDefault(l => l.Id == exists.Idusuario);
                if (user != null)
                {
                    // Eliminar el usuario asociado al colaborador
                    context.Logins.Remove(user);
                    context.SaveChanges();
                }

                // Eliminar cliente de la base de datos
                context.Gestors.Remove(exists);
                context.SaveChanges();

                TempData["Mensaje"] = "Colaborador eliminado correctamente";
                TempData["TipoMensaje"] = "success";
            }
            catch (DbUpdateException ex)
            {
                if (ex.InnerException != null && ex.InnerException.Message.Contains("REFERENCE"))
                {
                    TempData["Mensaje"] = "No se puede eliminar colaborador por que tiene datos asociados.";
                }
                else
                {
                    TempData["Mensaje"] = $"Ocurrió un error inesperado: {ex.Message}";
                }
                TempData["TipoMensaje"] = "danger";
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Error inesperado: {ex.Message}";
                TempData["TipoMensaje"] = "danger";
            }

            return RedirectToAction("Colaboradores", "Home");
        }

        /// <summary>
        /// Creacion de usuario para un empleado
        /// </summary>
        /// <param name="log"></param>
        /// <param name="IdColaborador"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult CrudLogin([FromForm] Login log, [FromForm] int IdColaborador)
        {
            try
            {
                var colaborador = context.Gestors.FirstOrDefault(l => l.Id == IdColaborador);

                if (colaborador == null)
                {
                    TempData["Mensaje"] = "Colaborador no encontrado";
                    TempData["TipoMensaje"] = "danger";
                    return RedirectToAction("Colaboradores", "Home");
                }

                // Validar que el nombre de usuario no exista para otro login
                var usuarioExistente = context.Logins
                    .FirstOrDefault(l => l.Usuario == log.Usuario && l.Id != colaborador.Idusuario);

                if (usuarioExistente != null)
                {
                    TempData["Mensaje"] = "El nombre de usuario ya está en uso.";
                    TempData["TipoMensaje"] = "danger";
                    return RedirectToAction("Colaboradores", "Home");
                }

                var usuario = context.Logins.FirstOrDefault(l => l.Id == colaborador.Idusuario);
                if (usuario != null)
                {
                    // Actualizar usuario existente
                    usuario.Usuario = log.Usuario;
                    usuario.Password = log.Password;
                    usuario.Activo = 1;
                }
                else
                {
                    log.Activo = 1;
                    context.Logins.Add(log);
                    context.SaveChanges();
                    colaborador.Idusuario = log.Id;
                }
                context.SaveChanges();

                TempData["Mensaje"] = "Usuario actualizado correctamente";
                TempData["TipoMensaje"] = "success";
                return RedirectToAction("Colaboradores", "Home");
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Error inesperado: {ex.Message}";
                TempData["TipoMensaje"] = "danger";
            }

            return RedirectToAction("Colaboradores", "Home");
        }


        /// <summary>
        /// Agrenado fechas feriadas al sistema
        /// </summary>
        /// <param name="cl"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult CrearFechaFeriada([FromForm] Calendario cl)
        {
            try
            {
                context.Calendarios.Add(cl);
                context.SaveChanges();

                TempData["Mensaje"] = "Fecha creada correctamente";
                TempData["TipoMensaje"] = "success";
                return RedirectToAction("Calendario", "Home");
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Ocurrió un error inesperado, {ex.Message}";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Calendario", "Home");
            }
        }


        /// <summary>
        /// Edita fechas feriadas en el sistema
        /// </summary>
        /// <param name="cl"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult EdiarCalendarioFeriado([FromForm] Calendario cl)
        {
            var exists = context.Calendarios.FirstOrDefault(c => c.Idcalendario == cl.Idcalendario);
            if (exists == null)
            {
                TempData["Mensaje"] = "Fecha no encontrada";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Calendario", "Home");
            }

            try
            {
                exists.Fecha = cl.Fecha;
                exists.Descripcion = cl.Descripcion;

                context.SaveChanges();
                TempData["Mensaje"] = "Calendario modificado correctamente";
                TempData["TipoMensaje"] = "success";
                return RedirectToAction("Calendario", "Home");
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Ocurrió un error inesperado: {ex.Message}";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Calendario", "Home");
            }
        }


        /// <summary>
        /// Eliminar un calendario feriado del sistema
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult EliminarCalendarioFeriado(int id)
        {
            var exists = context.Calendarios.FirstOrDefault(c => c.Idcalendario == id);
            if (exists == null)
            {
                TempData["Mensaje"] = "Fecha no encontrada";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Calendario", "Home");
            }
            try
            {
                // Eliminar cliente de la base de datos
                context.Calendarios.Remove(exists);
                context.SaveChanges();

                TempData["Mensaje"] = "Fecha eliminado correctamente";
                TempData["TipoMensaje"] = "success";
            }
            catch (DbUpdateException ex)
            {
                TempData["Mensaje"] = $"Ocurrió un error inesperado: {ex.Message}";
                TempData["TipoMensaje"] = "danger";
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Error inesperado: {ex.Message}";
                TempData["TipoMensaje"] = "danger";
            }

            return RedirectToAction("Calendario", "Home");
        }


        /// <summary>
        /// Crear solicitud de un cliente para prestamo
        /// </summary>
        /// <param name="p"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult CrearSolicitud([FromForm] Prestamo p)
        {
            try
            {

                var clienteExistente = context.Clientes.FirstOrDefault(c => c.Id == p.Idcliente);
                if (clienteExistente == null)
                {
                    TempData["Mensaje"] = "El Cliente no existe.";
                    TempData["TipoMensaje"] = "danger";
                    return RedirectToAction("NuevoPrestamo", "Home");
                }

                var userId = HttpContext.Session.GetInt32("UsuarioId");
                var gestorId = HttpContext.Session.GetInt32("GestorId");

                p.CreadaPor = gestorId; // Id de empleado NO de usuario
                p.Aprobado = 0;
                p.Estado = "P";
                p.DetalleAprobado = "EN PROCESO";
                p.FechaCreadafecha = DateOnly.FromDateTime(DateTime.Now);


                context.Prestamos.Add(p);
                context.SaveChanges();

                TempData["Mensaje"] = "Solicitud de prestamo creada correctamente";
                TempData["TipoMensaje"] = "success";
                return RedirectToAction("NuevoPrestamo", "Home");
            }
            catch (Exception ex)
            {
                TempData["Mensaje"] = $"Ocurrió un error inesperado, {ex.Message}";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("NuevoPrestamo", "Home");
            }
        }

        /// <summary>
        /// Apribacion de solicitud
        /// </summary>
        /// <param name="numeroSolicitud"></param>
        /// <param name="observaciones"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult AprobarSolicitud([FromForm] int numeroSolicitud, [FromForm] string observaciones)
        {
            try
            {
                // Validar que la solicitud existe
                var solicitud = context.Prestamos.FirstOrDefault(p => p.Id == numeroSolicitud);
                if (solicitud == null)
                {
                    return Json(new
                    {
                        success = false,
                        message = "La solicitud no existe."
                    });
                }

                // Validar que la solicitud no esté ya aprobada
                if (solicitud.Aprobado == 1)
                {
                    return Json(new
                    {
                        success = false,
                        message = "La solicitud ya está aprobada."
                    });
                }

                // Validar que las observaciones no estén vacías
                if (string.IsNullOrWhiteSpace(observaciones))
                {
                    return Json(new
                    {
                        success = false,
                        message = "Debe proporcionar observaciones para la aprobación."
                    });
                }

                // Obtener el ID del usuario que está aprobando
                var userId = HttpContext.Session.GetInt32("UsuarioId");

                // Actualizar la solicitud con los datos de aprobación
                solicitud.Aprobado = 1; // Marcar como aprobado
                solicitud.DetalleAprobado = "APROBADO"; // Marcar como aprobado
                solicitud.Observaciones = observaciones.Trim(); // Guardar observaciones
                solicitud.Estado = "A"; // Cambiar estado a Aprobado
                //solicitud.DetalleRechazo = null; // Limpiar cualquier rechazo previo

                // Opcional: Agregar campos de auditoría si los tienes
                solicitud.FechaAprobacion = DateOnly.FromDateTime(DateTime.Now);
                solicitud.AprobadoPor = userId;

                // Guardar cambios en la base de datos
                context.SaveChanges();

                // Respuesta exitosa
                return Json(new
                {
                    success = true,
                    message = "La solicitud ha sido aprobada exitosamente.",
                    data = new
                    {
                        numeroSolicitud = numeroSolicitud,
                        observaciones = observaciones,
                        fechaAprobacion = DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                        estadoNuevo = "APROBADO"
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = $"Ocurrió un error inesperado al aprobar la solicitud: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Rechaza una solicitud de prestamo con un motivo
        /// </summary>
        /// <param name="numeroSolicitud"></param>
        /// <param name="motivoRechazo"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult RechazarSolicitud([FromForm] int numeroSolicitud, [FromForm] string motivoRechazo)
        {
            try
            {
                // Validar que la solicitud existe
                var solicitud = context.Prestamos.FirstOrDefault(p => p.Id == numeroSolicitud);
                if (solicitud == null)
                {
                    return Json(new
                    {
                        success = false,
                        message = "La solicitud no existe."
                    });
                }

                // Validar que la solicitud no esté ya aprobada
                if (solicitud.Aprobado == 1)
                {
                    return Json(new
                    {
                        success = false,
                        message = "No se puede rechazar una solicitud ya aprobada."
                    });
                }

                // Validar que el motivo no esté vacío
                if (string.IsNullOrWhiteSpace(motivoRechazo))
                {
                    return Json(new
                    {
                        success = false,
                        message = "Debe proporcionar un motivo para el rechazo."
                    });
                }

                // Validar longitud mínima del motivo
                if (motivoRechazo.Trim().Length < 10)
                {
                    return Json(new
                    {
                        success = false,
                        message = "El motivo del rechazo debe tener al menos 10 caracteres."
                    });
                }

                // Obtener el ID del usuario que está rechazando
                var userId = HttpContext.Session.GetInt32("UsuarioId");

                // Actualizar la solicitud con los datos de rechazo
                solicitud.Aprobado = 0; // Mantener como no aprobado
                solicitud.DetalleAprobado = "RECHAZADO"; // Marcar como rechazado
                solicitud.DetalleRechazo = motivoRechazo.Trim(); // Guardar motivo del rechazo
                solicitud.Estado = "R"; // Cambiar estado a Rechazado (puedes usar la letra que prefieras)

                // Opcional: Agregar campos de auditoría si los tienes
                solicitud.FechaRechazado = DateOnly.FromDateTime(DateTime.Now);
                solicitud.RechazadoPor = userId;

                // Guardar cambios en la base de datos
                context.SaveChanges();

                // Respuesta exitosa
                return Json(new
                {
                    success = true,
                    message = "La solicitud ha sido rechazada exitosamente.",
                    data = new
                    {
                        numeroSolicitud = numeroSolicitud,
                        motivoRechazo = motivoRechazo,
                        fechaRechazo = DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                        estadoNuevo = "RECHAZADO"
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = $"Ocurrió un error inesperado al rechazar la solicitud: {ex.Message}"
                });
            }
        }



        // ==================== MÉTODO REENVÍO SOLICITUD ====================
        /// <summary>
        /// Reeenvio de solicitud de prestamo para nueva evaluación.
        /// </summary>
        /// <param name="numeroSolicitud"></param>
        /// <param name="comentarioReenvio"></param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult ReenvioSolicitud([FromForm] int numeroSolicitud, [FromForm] string comentarioReenvio)
        {
            try
            {
                // Validar que la solicitud existe
                var solicitud = context.Prestamos.FirstOrDefault(p => p.Id == numeroSolicitud);
                if (solicitud == null)
                {
                    return Json(new
                    {
                        success = false,
                        message = "La solicitud no existe."
                    });
                }

                // Validar que la solicitud esté previamente rechazada
                if (solicitud.DetalleAprobado != "RECHAZADO")
                {
                    return Json(new
                    {
                        success = false,
                        message = "Solo se pueden reenviar solicitudes que hayan sido rechazadas previamente."
                    });
                }

                // Validar que el comentario no esté vacío
                if (string.IsNullOrWhiteSpace(comentarioReenvio))
                {
                    return Json(new
                    {
                        success = false,
                        message = "Debe proporcionar un comentario para el reenvío."
                    });
                }

                // Validar longitud mínima del comentario
                if (comentarioReenvio.Trim().Length < 10)
                {
                    return Json(new
                    {
                        success = false,
                        message = "El comentario del reenvío debe tener al menos 10 caracteres."
                    });
                }

                // Obtener el ID del usuario que está reenviando
                var userId = HttpContext.Session.GetInt32("UsuarioId");

                // Unir el motivo de rechazo anterior con el nuevo comentario
                var motivoRechazoAnterior = solicitud.DetalleRechazo ?? "";
                var nuevoDetalleRechazo = $"{motivoRechazoAnterior}\n\n--- REENVÍO ---\nFecha: {DateTime.Now:dd/MM/yyyy HH:mm}\nComentario: {comentarioReenvio.Trim()}";

                // Actualizar la solicitud para reenvío
                solicitud.Aprobado = 0; // Mantener como no aprobado
                solicitud.DetalleAprobado = "EN PROCESO (REENVIO)"; // Cambiar estado a EN PROCESO para nueva evaluación
                solicitud.DetalleRechazo = nuevoDetalleRechazo; // Conservar historial + nuevo comentario
                solicitud.Estado = "P"; // Cambiar estado a Pendiente

                // Opcional: Agregar campos de auditoría si los tienes
                solicitud.FechaReenvio = DateOnly.FromDateTime(DateTime.Now);
                solicitud.ReenviadoPor = userId;

                // Limpiar campos de rechazo previo pero conservar en DetalleRechazo
                solicitud.FechaRechazado = null;
                solicitud.RechazadoPor = null;

                // Guardar cambios en la base de datos
                context.SaveChanges();

                // Respuesta exitosa
                return Json(new
                {
                    success = true,
                    message = "La solicitud ha sido reenviada exitosamente para nueva evaluación.",
                    data = new
                    {
                        numeroSolicitud = numeroSolicitud,
                        comentarioReenvio = comentarioReenvio,
                        fechaReenvio = DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                        estadoNuevo = "EN PROCESO",
                        historialCompleto = nuevoDetalleRechazo
                    }
                });
            }
            catch (Exception ex)
            {
                // Log del error para debugging
                // _logger.LogError(ex, "Error al reenviar solicitud {SolicitudId}", numeroSolicitud);

                return Json(new
                {
                    success = false,
                    message = $"Ocurrió un error inesperado al reenviar la solicitud: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Proceso para desembolso de prestamo
        /// </summary>
        /// <param name="numeroSolicitud"></param>
        /// <param name="tpago"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> ProcesarDesembolso([FromForm] int numeroSolicitud, [FromForm] string tipoPago)
        {
            try
            {
                var solicitud = await context.Prestamos
                    .FirstOrDefaultAsync(p => p.Id == numeroSolicitud && p.Aprobado == 1 && p.DetalleAprobado == "APROBADO");

                if (solicitud == null)
                {
                    return Json(new { success = false, message = "Solicitud no encontrada o no está disponible para desembolso" });
                }

                var userId = HttpContext.Session.GetInt32("UsuarioId") ?? 0;
                var gestor = await context.Gestors
                    .FirstOrDefaultAsync(g => g.Idusuario == userId);
                // Cambiar estado a DESEMBOLSADO
                solicitud.DetalleAprobado = "DESEMBOLSADO";
                solicitud.Estado = "A"; // Activo
                //solicitud.Observaciones = tpago;

                // Crear registro de movimiento de desembolso
                var movimientoDesembolso = new Pagosdetalle
                {
                    Idprestamo = solicitud.Id,
                    FechaPago = DateOnly.FromDateTime(DateTime.Now),
                    Numeropago = 0, // Para desembolsos usamos 0
                    Monto = solicitud.Monto,
                    Pagado = 1,
                    FechaCouta = DateOnly.FromDateTime(DateTime.Now),
                    Capital = solicitud.Monto,
                    Interes = 0,
                    Mora = 0,
                    TipoMovimiento = "DESEMBOLSO",
                    CreadoPor = userId,
                    TipoPago = tipoPago
                };

                context.Pagosdetalles.Add(movimientoDesembolso);
                await context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = "Desembolso procesado exitosamente",
                    data = new
                    {
                        numeroSolicitud = numeroSolicitud,
                        monto = solicitud.Monto,
                        fecha = DateTime.Now.ToString("dd/MM/yyyy HH:mm")
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error al procesar desembolso: {ex.Message}" });
            }
        }


        /// <summary>
        /// Registro movimiento de pago
        /// </summary>
        /// <param name="p"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> RegistrarMovimiento([FromForm] Pagosdetalle p)
        {
            try
            {
                // Verificar que el préstamo existe
                var prestamo = await context.Prestamos.FirstOrDefaultAsync(c => c.Id == p.Idprestamo);
                if (prestamo == null)
                {
                    return Json(new
                    {
                        success = false,
                        message = $"No se encontró el préstamo en sistema"
                    });
                }

                // Verificar que el préstamo está aprobado y desembolsado
                if (prestamo.Aprobado != 1 || prestamo.DetalleAprobado != "DESEMBOLSADO")
                {
                    return Json(new
                    {
                        success = false,
                        message = $"El préstamo debe estar aprobado y desembolsado para registrar pagos"
                    });
                }

                // Obtener el ID del usuario actual
                var usuarioId = HttpContext.Session.GetInt32("UsuarioId") ?? 1;

                // Configurar el registro de pago
                p.CreadoPor = usuarioId;
                p.FechaPago = DateOnly.FromDateTime(DateTime.Now);
                p.Pagado = 1; // Marcar como pagado
                p.TipoPago = p.TipoPago ?? "EFECTIVO"; // Valor por defecto

                // Si no se especifica el número de pago, calcularlo automáticamente
                if (p.Numeropago == null || p.Numeropago == 0)
                {
                    var ultimoPago = await context.Pagosdetalles
                        .Where(pd => pd.Idprestamo == p.Idprestamo && pd.Numeropago > 0)
                        .OrderByDescending(pd => pd.Numeropago)
                        .FirstOrDefaultAsync();

                    p.Numeropago = (ultimoPago?.Numeropago ?? 0) + 1;
                }

                // Agregar el registro
                context.Pagosdetalles.Add(p);

                // Verificar si el préstamo está completamente pagado
                var totalCapitalPagado = await context.Pagosdetalles
                    .Where(pd => pd.Idprestamo == p.Idprestamo && pd.Pagado == 1 && pd.Numeropago > 0)
                    .SumAsync(pd => pd.Capital ?? 0);

                totalCapitalPagado += (p.Capital ?? 0);

                // Si se ha pagado todo el capital, marcar como cancelado
                if (totalCapitalPagado >= prestamo.Monto)
                {
                    prestamo.Estado = "C"; // Cancelado
                    prestamo.FechaCancelado = DateOnly.FromDateTime(DateTime.Now);
                }

                await context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = "El pago se ha realizado con éxito.",
                    data = new
                    {
                        NumeroPago = p.Id,
                        NumeroCuota = p.Numeropago,
                        Monto = p.Monto,
                        EstadoPrestamo = prestamo.Estado == "C" ? "CANCELADO" : "ACTIVO",
                        FechaPago = DateTime.Now.ToString("dd/MM/yyyy HH:mm")
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error interno del servidor",
                    error = ex.Message
                });
            }
        }



        // ===== MÉTODO ACTUALIZADO REGISTRAR COBRO =====
        [HttpPost]
        public async Task<IActionResult> RegistrarCobro([FromForm] int idPrestamo, [FromForm] int idCliente,
            [FromForm] string concepto, [FromForm] decimal montoCapital, [FromForm] decimal montoInteres,
            [FromForm] decimal montoMora, [FromForm] decimal montoTotal, [FromForm] int numeroCuota,
            [FromForm] string metodoPago, [FromForm] string observaciones)
        {
            try
            {
                // Verificar que el préstamo existe y está activo
                var prestamo = await context.Prestamos
                    .FirstOrDefaultAsync(p => p.Id == idPrestamo && p.Aprobado == 1);
                if (prestamo == null)
                {
                    return Json(new { success = false, message = "Préstamo no encontrado o no está activo" });
                }

                // Verificar que no se haya registrado ya esta cuota
                var cuotaExistente = await context.Pagosdetalles
                    .FirstOrDefaultAsync(p => p.Idprestamo == idPrestamo &&
                                            p.Numeropago == numeroCuota &&
                                            p.Pagado == 1);
                if (cuotaExistente != null)
                {
                    return Json(new { success = false, message = $"La cuota #{numeroCuota} ya fue pagada anteriormente" });
                }

                var userId = HttpContext.Session.GetInt32("UsuarioId") ?? 1;
                var gestor = await context.Gestors
                    .FirstOrDefaultAsync(g => g.Idusuario == userId);
                // 🗓️ CALCULAR LA FECHA DE LA CUOTA BASADA EN EL TIPO DE PRÉSTAMO
                var fechaCuota = await ObtenerProximaFechaCuota(idPrestamo);

                // Crear registro de cobro
                var cobro = new Pagosdetalle
                {
                    Idprestamo = idPrestamo,
                    FechaPago = DateOnly.FromDateTime(DateTime.Now), // Fecha real del pago
                    Numeropago = numeroCuota,
                    Monto = montoTotal,
                    Pagado = 1,
                    FechaCouta = fechaCuota, // 🗓️ Fecha calculada según tipo de préstamo
                    Capital = montoCapital,
                    Interes = montoInteres,
                    Mora = montoMora,
                    TipoPago = metodoPago,
                    CreadoPor = gestor?.Id ?? 0,
                };

                context.Pagosdetalles.Add(cobro);

                // 📅 ACTUALIZAR LA PRÓXIMA FECHA DE PAGO EN EL PRÉSTAMO
                var siguienteFechaPago = await CalcularProximaFechaPago(
                    idPrestamo,
                    prestamo.TipoPrestamo,
                    fechaCuota,
                    numeroCuota + 1
                );

                prestamo.ProximoPago = siguienteFechaPago;

                // Verificar si el préstamo está completamente pagado
                var totalPagado = await context.Pagosdetalles
                    .Where(p => p.Idprestamo == idPrestamo && p.Pagado == 1 && p.Numeropago > 0)
                    .SumAsync(p => p.Capital ?? 0);

                string estadoPrestamo = "ACTIVO";
                if (totalPagado + montoCapital >= prestamo.Monto)
                {
                    prestamo.Estado = "C"; // Cancelado
                    prestamo.FechaCancelado = DateOnly.FromDateTime(DateTime.Now);
                    prestamo.ProximoPago = null; // Ya no hay próximo pago
                    estadoPrestamo = "CANCELADO";
                }

                await context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = "Cobro registrado exitosamente",
                    data = new
                    {
                        idCobro = cobro.Id,
                        monto = montoTotal,
                        fecha = DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                        estadoPrestamo = estadoPrestamo,
                        proximaFechaPago = prestamo.ProximoPago?.ToString("dd/MM/yyyy"),
                        fechaCuotaCalculada = fechaCuota.ToString("dd/MM/yyyy")
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error al registrar cobro: {ex.Message}" });
            }
        }

        // =====================================================
        // NUEVO MÉTODO: Obtener préstamos con calendario real
        // =====================================================

        /// <summary>
        /// Método para validar el corte de caja y actualizar el estado CorteCaja a true
        /// </summary>
        /// <param name="fechaCorte">Fecha del corte a validar</param>
        /// <param name="idGestor">ID del gestor (opcional, si se quiere validar por gestor específico)</param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> ValidarCorteCaja(DateOnly fechaCorte, int? idGestor = null)
        {
            try
            {
                // Obtener el usuario actual de la sesión
                var userId = HttpContext.Session.GetInt32("UsuarioId");
                if (userId == null)
                {
                    return Json(new { success = false, message = "Usuario no autenticado" });
                }

                // Buscar todos los movimientos del día que no han sido validados
                var movimientosQuery = context.Pagosdetalles
                    .Where(d => d.FechaPago.HasValue &&
                               d.FechaPago == fechaCorte &&
                               d.Pagado == 1 &&
                               (d.CorteCaja == null || d.CorteCaja == 0));

                // Si se especifica un gestor, filtrar por él
                if (idGestor.HasValue)
                {
                    movimientosQuery = movimientosQuery.Where(d => d.CreadoPor == idGestor.Value);
                }

                var movimientos = await movimientosQuery.ToListAsync();

                if (!movimientos.Any())
                {
                    return Json(new
                    {
                        success = false,
                        message = "No se encontraron movimientos pendientes de validación para la fecha especificada"
                    });
                }

                // Calcular totales antes de la validación
                var totalIngresos = movimientos.Where(m => m.TipoMovimiento == "PAGO").Sum(m => m.Monto ?? 0);
                var totalEgresos = movimientos.Where(m => m.TipoMovimiento == "DESEMBOLSO").Sum(m => m.Monto ?? 0);
                var balanceNeto = totalIngresos - totalEgresos;

                // Actualizar el estado CorteCaja a true para todos los movimientos
                foreach (var movimiento in movimientos)
                {
                    movimiento.CorteCaja = 1;
                }

                // Guardar los cambios
                await context.SaveChangesAsync();

                // Obtener información del gestor para la respuesta
                var gestorInfo = "";
                if (idGestor.HasValue)
                {
                    var gestor = await context.Gestors.FindAsync(idGestor.Value);
                    gestorInfo = gestor != null ? $" del gestor {gestor.Nombre} {gestor.Apellido}" : "";
                }

                return Json(new
                {
                    success = true,
                    message = $"Corte de caja validado exitosamente{gestorInfo}",
                    data = new
                    {
                        fechaCorte = fechaCorte,
                        movimientosValidados = movimientos.Count,
                        totalIngresos = totalIngresos,
                        totalEgresos = totalEgresos,
                        balanceNeto = balanceNeto,
                        validadoPor = userId,
                        fechaValidacion = DateTime.Now
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "Error al validar el corte de caja",
                    error = ex.Message
                });
            }
        }

        public class ValidarCorteRequest
        {
            public DateOnly FechaCorte { get; set; }
            public int IdGestor { get; set; }
        }
        /// <summary>
        /// Método para validar el corte de caja de un gestor específico
        /// </summary>
        /// <param name="fechaCorte">Fecha del corte</param>
        /// <param name="idGestor">ID del gestor</param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> ValidarCorteGestor([FromBody] ValidarCorteRequest request)
        {
            try
            {
                Console.WriteLine($"Validando corte de caja para el gestor {request.IdGestor} en la fecha {request.FechaCorte}");
                var userId = HttpContext.Session.GetInt32("UsuarioId");
                if (userId == null)
                {
                    return Json(new { success = false, message = "Usuario no autenticado" });
                }

                // Verificar que el gestor existe
                var gestor = await context.Gestors.FindAsync(request.IdGestor);
                if (gestor == null)
                {
                    return Json(new { success = false, message = "Gestor no encontrado" });
                }

                // Buscar movimientos del gestor en la fecha especificada
                var movimientos = await context.Pagosdetalles
                    .Where(d => d.FechaPago.HasValue &&
                               d.FechaPago == request.FechaCorte &&
                               d.Pagado == 1 &&
                               d.CreadoPor == request.IdGestor &&
                               (d.CorteCaja == null || d.CorteCaja == 0))
                    .ToListAsync();

                if (!movimientos.Any())
                {
                    return Json(new
                    {
                        success = false,
                        message = $"No se encontraron movimientos pendientes de validación para el gestor {gestor.Nombre} {gestor.Apellido}"
                    });
                }

                // Calcular totales del gestor
                var totalIngresos = movimientos.Where(m => m.TipoMovimiento == "PAGO").Sum(m => m.Monto ?? 0);
                var totalEgresos = movimientos.Where(m => m.TipoMovimiento == "DESEMBOLSO").Sum(m => m.Monto ?? 0);
                var balanceNeto = totalIngresos - totalEgresos;

                // Actualizar el estado CorteCaja a true
                foreach (var movimiento in movimientos)
                {
                    movimiento.CorteCaja = 1;
                }

                await context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = $"Corte de caja validado exitosamente para {gestor.Nombre} {gestor.Apellido}",
                    data = new
                    {
                        fechaCorte = request.FechaCorte,
                        gestor = new
                        {
                            id = gestor.Id,
                            nombre = $"{gestor.Nombre} {gestor.Apellido}"
                        },
                        movimientosValidados = movimientos.Count,
                        totalIngresos = totalIngresos,
                        totalEgresos = totalEgresos,
                        balanceNeto = balanceNeto,
                        validadoPor = userId,
                        fechaValidacion = DateTime.Now
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "Error al validar el corte de caja del gestor",
                    error = ex.Message
                });
            }
        }

        // =====================================================
        // NUEVO MÉTODO: Registrar pago usando calendario
        // =====================================================

        [HttpPost]
        public async Task<IActionResult> RegistrarPagoConCalendario([FromForm] int idPrestamo, [FromForm] int numeroCuota,
            [FromForm] decimal montoCapital, [FromForm] decimal montoInteres, [FromForm] decimal montoMora,
            [FromForm] decimal montoTotal, [FromForm] string metodoPago, [FromForm] string observaciones)
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UsuarioId") ?? 1;
                var gestor = await context.Gestors
                    .FirstOrDefaultAsync(g => g.Idusuario == userId);
                // Obtener la cuota del calendario
                var cuotaCalendario = await context.CalendarioPagos
                    .FirstOrDefaultAsync(cp => cp.IdPrestamo == idPrestamo && cp.NumeroCuota == numeroCuota);

                if (cuotaCalendario == null)
                {
                    return Json(new { success = false, message = "Cuota no encontrada en el calendario de pagos" });
                }

                // Verificar que se pueda pagar
                if (cuotaCalendario.Estado == "PAGADO")
                {
                    return Json(new { success = false, message = "Esta cuota ya fue pagada" });
                }

                // Crear registro en pagosdetalle
                var detalleMovimiento = new Pagosdetalle
                {
                    Idprestamo = idPrestamo,
                    FechaPago = DateOnly.FromDateTime(DateTime.Now),
                    Numeropago = numeroCuota,
                    Monto = montoTotal,
                    Pagado = 1,
                    FechaCouta = DateOnly.FromDateTime(DateTime.Now),
                    Capital = montoCapital,
                    Interes = montoInteres,
                    Mora = montoMora,
                    TipoPago = metodoPago,
                    TipoMovimiento = "PAGO",
                    CreadoPor = gestor?.Id ?? 0,
                };

                context.Pagosdetalles.Add(detalleMovimiento);
                await context.SaveChangesAsync();

                // Actualizar calendario de pagos
                cuotaCalendario.FechaPagoReal = DateOnly.FromDateTime(DateTime.Now);
                cuotaCalendario.MontoPagado = montoTotal;
                cuotaCalendario.Capital = montoCapital;
                cuotaCalendario.Interes = montoInteres;
                cuotaCalendario.Mora = montoMora;
                cuotaCalendario.Estado = montoTotal >= cuotaCalendario.MontoCuota ? "PAGADO" : "PARCIAL";
                cuotaCalendario.Observaciones = observaciones;
                cuotaCalendario.FechaActualizacion = DateTime.Now;

                // Calcular días de mora si aplicaba
                var fechaHoy = DateOnly.FromDateTime(DateTime.Today);
                if (cuotaCalendario.FechaProgramada < fechaHoy)
                {
                    cuotaCalendario.DiasMora = fechaHoy.DayNumber - cuotaCalendario.FechaProgramada.DayNumber;
                }

                // Actualizar próximo pago en prestamos
                var proximoPago = await context.CalendarioPagos
                    .Where(cp => cp.IdPrestamo == idPrestamo && cp.Estado == "PENDIENTE")
                    .OrderBy(cp => cp.FechaProgramada)
                    .Select(cp => cp.FechaProgramada)
                    .FirstOrDefaultAsync();

                var prestamo = await context.Prestamos.FindAsync(idPrestamo);
                if (prestamo != null)
                {
                    prestamo.ProximoPago = proximoPago;

                    // Si no hay más cuotas pendientes, marcar como cancelado
                    var cuotasPendientes = await context.CalendarioPagos
                        .CountAsync(cp => cp.IdPrestamo == idPrestamo && cp.Estado == "PENDIENTE");

                    if (cuotasPendientes == 0)
                    {
                        prestamo.Estado = "C"; // Cancelado/Completado
                        prestamo.FechaCancelado = DateOnly.FromDateTime(DateTime.Now);
                    }
                }

                await context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = "Pago registrado exitosamente",
                    data = new
                    {
                        idCobro = detalleMovimiento.Id,
                        numeroCuota = numeroCuota,
                        montoTotal = montoTotal,
                        estadoPrestamo = prestamo?.Estado,
                        proximoPago = proximoPago
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error al registrar el pago: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ActualizarPermisosPuesto([FromBody] ActualizarPermisosRequest request)
        {
            try
            {
                if (request?.PuestoId == null || request.Permisos == null)
                {
                    return BadRequest(new { success = false, message = "Datos inválidos" });
                }

                // Verificar que el puesto existe
                var puestoExiste = await context.Puestos.AnyAsync(p => p.Id == request.PuestoId);
                if (!puestoExiste)
                {
                    return NotFound(new { success = false, message = "Puesto no encontrado" });
                }

                // Obtener permisos actuales del puesto
                var permisosActuales = await context.PuestoPermisos
                    .Where(pp => pp.PuestoId == request.PuestoId)
                    .ToListAsync();

                // Procesar cada permiso
                foreach (var permisoRequest in request.Permisos)
                {
                    var permisoExistente = permisosActuales.FirstOrDefault(pp => pp.PermisoId == permisoRequest.PermisoId);

                    if (permisoExistente != null)
                    {
                        // Actualizar permiso existente
                        permisoExistente.Activo = (ulong)permisoRequest.Activo;
                    }
                    else
                    {
                        // Crear nuevo permiso si está activo
                        if (permisoRequest.Activo == 1)
                        {
                            var nuevoPermiso = new PuestoPermiso
                            {
                                PuestoId = request.PuestoId,
                                PermisoId = permisoRequest.PermisoId,
                                Activo = 1
                            };
                            context.PuestoPermisos.Add(nuevoPermiso);
                        }
                    }
                }

                await context.SaveChangesAsync();

                return Ok(new { success = true, message = "Permisos actualizados correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Error al actualizar permisos: {ex.Message}" });
            }
        }

        // ===== CLASE PARA EL REQUEST (agregar al final del archivo AuxiliaresController.cs) =====
        public class ActualizarPermisosRequest
        {
            public int PuestoId { get; set; }
            public List<PermisoRequest> Permisos { get; set; } = new List<PermisoRequest>();
        }

        public class PermisoRequest
        {
            public int PermisoId { get; set; }
            public int Activo { get; set; }
        }

        // ===== AGREGAR ESTE MÉTODO AL AuxiliaresController.cs =====

        /// <summary>
        /// Procesa la liquidación total de un préstamo
        /// </summary>
        /// <param name="request">Datos de la liquidación</param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> ProcesarLiquidacionTotal([FromForm] LiquidacionRequest request)
        {
            try
            {
                // Validar que el préstamo existe y está activo
                var prestamo = await context.Prestamos
                    .Include(p => p.IdclienteNavigation)
                    .FirstOrDefaultAsync(p => p.Id == request.IdPrestamo && p.Estado == "A");

                if (prestamo == null)
                {
                    return Json(new { success = false, message = "Préstamo no encontrado o no está activo" });
                }

                // Verificar que el préstamo está aprobado y desembolsado
                if (prestamo.Aprobado != 1 || prestamo.DetalleAprobado != "DESEMBOLSADO")
                {
                    return Json(new { success = false, message = "El préstamo debe estar aprobado y desembolsado" });
                }

                // Obtener pagos realizados para calcular saldos
                var pagosRealizados = await context.Pagosdetalles
                    .Where(p => p.Idprestamo == request.IdPrestamo && p.Pagado == 1 && p.TipoMovimiento != "DESEMBOLSO")
                    .ToListAsync();

                // Calcular saldos
                var capitalPagado = pagosRealizados.Sum(p => p.Capital ?? 0);
                var saldoCapital = (prestamo.Monto ?? 0) - capitalPagado;

                // Validar que hay saldo pendiente
                if (saldoCapital <= 0)
                {
                    return Json(new { success = false, message = "El préstamo ya está completamente pagado" });
                }

                // Calcular interés pendiente
                var interesPagado = pagosRealizados.Sum(p => p.Interes ?? 0);
                var interesTotal = prestamo.Interes ?? 0;
                var interesPendiente = Math.Max(0, interesTotal - interesPagado);

                // Aplicar descuento del 10% en intereses (configurable)
                var descuentoInteres = interesPendiente * 0.10m;
                var interesConDescuento = interesPendiente - descuentoInteres;

                // Total de liquidación
                var totalLiquidacion = saldoCapital + interesConDescuento;

                // Obtener información del usuario actual
                var userId = HttpContext.Session.GetInt32("UsuarioId") ?? 1;
                var gestor = await context.Gestors
                    .FirstOrDefaultAsync(g => g.Idusuario == userId);

                // Crear el registro de liquidación en pagosdetalle
                var registroLiquidacion = new Pagosdetalle
                {
                    Idprestamo = request.IdPrestamo,
                    FechaPago = DateOnly.FromDateTime(DateTime.Now),
                    Numeropago = 999, // Número especial para liquidaciones
                    Monto = totalLiquidacion,
                    Pagado = 1,
                    FechaCouta = DateOnly.FromDateTime(DateTime.Now),
                    Capital = saldoCapital,
                    Interes = interesConDescuento,
                    Mora = 0,
                    Domicilio = 0,
                    TipoPago = "LIQUIDACION_TOTAL",
                    TipoMovimiento = "COBRO",
                    ObservacionesMovimiento = $"LIQUIDACIÓN TOTAL - {request.Observaciones}. Descuento aplicado: ${descuentoInteres:F2}",
                    CreadoPor = gestor?.Id ?? 0,
                    FechaCreacion = DateTime.Now
                };

                // Agregar el registro
                context.Pagosdetalles.Add(registroLiquidacion);

                // Actualizar el estado del préstamo
                prestamo.Estado = "C"; // Cancelado
                prestamo.FechaCancelado = DateOnly.FromDateTime(DateTime.Now);
                prestamo.ProximoPago = null; // Ya no hay próximo pago

                // Guardar todos los cambios
                await context.SaveChangesAsync();

                // Preparar respuesta con detalles de la liquidación
                var respuesta = new
                {
                    success = true,
                    message = "Liquidación procesada exitosamente",
                    data = new
                    {
                        idLiquidacion = registroLiquidacion.Id,
                        numeroPrestamo = request.IdPrestamo,
                        cliente = $"{prestamo.IdclienteNavigation?.Nombre} {prestamo.IdclienteNavigation?.Apellido}",
                        montoOriginal = prestamo.Monto,
                        capitalPendiente = saldoCapital,
                        interesPendienteOriginal = interesPendiente,
                        descuentoAplicado = descuentoInteres,
                        interesConDescuento = interesConDescuento,
                        totalLiquidado = totalLiquidacion,
                        fechaLiquidacion = DateTime.Now,
                        ahorroCliente = descuentoInteres,
                        // Estadísticas finales
                        estadisticas = new
                        {
                            capitalTotalPagado = capitalPagado + saldoCapital,
                            interesTotalPagado = interesPagado + interesConDescuento,
                            totalPagadoPrestamo = prestamo.Monto + interesPagado + interesConDescuento,
                            descuentoTotal = descuentoInteres,
                            estadoFinal = "LIQUIDADO"
                        }
                    }
                };

                return Json(respuesta);
            }
            catch (Exception ex)
            {
                // Log del error
                Console.WriteLine($"Error en liquidación: {ex.Message}");

                return Json(new
                {
                    success = false,
                    message = "Error interno al procesar la liquidación",
                    error = ex.Message
                });
            }
        }
    }
}
