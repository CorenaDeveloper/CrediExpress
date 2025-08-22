using Credi_Express.Models;
using Credi_Express.ModelVM;
using Credi_Express.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Security.Claims;

namespace Credi_Express.Controllers
{
    [Authorize] // Aplica a todo el controlador
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly pagosContext context;

        public HomeController(ILogger<HomeController> logger, pagosContext context)
        {
            _logger = logger;
            this.context = context;
        }

        [RequierePermiso("Home/Index", "Read")]
        public IActionResult Index()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }

            return View();
        }

        [RequierePermiso("Home/Liquidacion", "Read")]
        public IActionResult Liquidacion()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Liquidacion", "Home");
            }

            return View();
        }

        [RequierePermiso("Home/SolicitudesPrestamo", "Read")]
        public IActionResult SolicitudesPrestamo()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }

            return View();
        }
        [RequierePermiso("Home/Movimientos", "Read")]
        public IActionResult Movimientos()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }

            return View();
        }

        [RequierePermiso("Home/Permisos", "Read")]
        public IActionResult Permisos()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }

            return View();
        }


        public IActionResult CorteRuta()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }

            return View();
        }


        [RequierePermiso("Home/NuevoPrestamo", "Read")]
        public IActionResult NuevoPrestamo()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }

            return View();
        }


        ///[RequierePermiso("Home/NuevoPrestamo", "Read")]
        public IActionResult PrestamosXCliente()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("PrestamosXCliente", "Home");
            }

            return View();
        }

        [RequierePermiso("Home/Calendario", "Read")]
        public async Task<IActionResult> Calendario()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }

            var hoy = DateOnly.FromDateTime(DateTime.Today);
            var inicioDelAnio = new DateOnly(hoy.Year, 1, 1);

            var calendario = await context.Calendarios
                .Where(c => c.Fecha >= inicioDelAnio)
                .Select(c => new CalendarioVM
                {
                    IdCalendario = c.Idcalendario,
                    Fecha = Convert.ToString(c.Fecha),
                    Descripcion = c.Descripcion
                }).ToListAsync();

            return View(calendario);
        }

        [RequierePermiso("Home/Clientes", "Read")]
        public async Task<IActionResult> Clientes()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }

            return View();
        }

        [RequierePermiso("Home/Colaboradores", "Read")]
        public async Task<IActionResult> Colaboradores()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }
            var user = await context.Gestors
                .Select(c => new GestosVM
                {
                    Id = c.Id,
                    Nombre = c.Nombre,
                    Apellido = c.Apellido,
                    Direccion = c.Direccion,
                    Telefono = c.Telefono,
                    Departamento = c.Departamento,
                    DepartamentoNombre = context.Departamentos
                    .Where(d => d.Id == Convert.ToInt32(c.Departamento))
                    .Select(d => d.Nombre)
                    .FirstOrDefault() ?? "Departamento no asignado",
                    Activo = c.Activo,
                    Idpuesto = c.Idpuesto,
                    PuestoNombre = context.Puestos
                    .Where(p => p.Id == c.Idpuesto)
                    .Select(p => p.Nombre)
                    .FirstOrDefault() ?? "Puesto no asignado",
                    Usuario = context.Logins
                    .Where(l => l.Id == c.Idusuario)
                    .Select(l => l.Usuario)
                    .FirstOrDefault() ?? "Usuario no asignado"
                })
                .ToListAsync();
            return View(user);
        }

        [RequierePermiso("Home/Prestamos", "Read")]
        public async Task<IActionResult> Prestamos()
        {
            var userId = HttpContext.Session.GetInt32("UsuarioId");
            if (!userId.HasValue)
            {
                return RedirectToAction("Login", "Home");
            }
            return View();
        }
        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }



        [AllowAnonymous]
        public IActionResult AccesoDenegado()
        {
            return View();
        }


        [AllowAnonymous]
        public IActionResult login()
        {
            return View();
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> LoginSession(string usuario, string password)
        {
            var user = context.Logins.FirstOrDefault(u => u.Usuario == usuario && u.Password == password);

            if (user == null)
            {
                TempData["Mensaje"] = "Usuario o contraseña incorrectos";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Login", "Home");
            }

            var gestor = context.Gestors.FirstOrDefault(u => u.Idusuario == user.Id);

            if (gestor == null)
            {
                TempData["Mensaje"] = "No se encontró información del gestor";
                TempData["TipoMensaje"] = "danger";
                return RedirectToAction("Login", "Home");
            }

            var permisos = (from pp in context.PuestoPermisos
                            join p in context.Permisos on pp.PermisoId equals p.Id
                            where pp.PuestoId == gestor.Idpuesto && pp.Activo == 1
                            select new
                            {
                                Id = pp.Id,
                                PermisoId = pp.PermisoId,
                                PuestoId = pp.PuestoId,
                                Activo = pp.Activo,
                                Modulo = p.Modulo ?? string.Empty,
                                Permiso = p.Permiso1 ?? string.Empty
                            }).ToList();

            // Crear los claims básicos
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Usuario ?? string.Empty),
                new Claim("UserId", user.Id.ToString()),
                new Claim("GestorId", gestor.Id.ToString())
            };

            // Agregar los permisos como claims
            foreach (var permiso in permisos)
            {
                try
                {
                    string moduloLimpio = LimpiarTexto(permiso.Modulo);
                    string permisoLimpio = LimpiarTexto(permiso.Permiso);

                    if (!string.IsNullOrEmpty(moduloLimpio) && !string.IsNullOrEmpty(permisoLimpio))
                    {
                        string combinacion = $"{moduloLimpio}:{permisoLimpio}";
                        claims.Add(new Claim("ModuloPermiso", combinacion));
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error: {ex.Message}");
                }
            }

            // Crear la identidad y principal
            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(claimsIdentity);

            // Autenticar al usuario
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

            // Guardar datos en sesión
            HttpContext.Session.SetString("Usuario", user.Usuario ?? string.Empty);
            HttpContext.Session.SetInt32("UsuarioId", user.Id);
            HttpContext.Session.SetInt32("GestorId", gestor.Id);
            HttpContext.Session.SetString("NombreCompleto", gestor.Nombre + ' ' + gestor.Apellido);

            return RedirectToAction("Index", "Home");
        }

        // Método auxiliar sin cambios
        private string LimpiarTexto(string texto)
        {
            if (string.IsNullOrEmpty(texto))
                return string.Empty;

            return texto.Trim()
                        .Replace("\0", "")
                        .Replace("\r", "")
                        .Replace("\n", "")
                        .Replace("\t", "");
        }

        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            HttpContext.Session.Clear();

            return RedirectToAction("Login", "Home");
        }
    }
}
