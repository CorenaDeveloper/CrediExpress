using Credi_Express.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Obtener el valor manual de IsProduction
bool isProduction = builder.Configuration.GetValue<bool>("IsProduction");
string envLabel = isProduction ? "[PROD]" : "[DEV]";

// Obtener conexiones desde la nueva estructura de appsettings.json
var connectionPagos = isProduction
    ? builder.Configuration.GetSection("ConnectionStrings:Production:Pagos").Value
    : builder.Configuration.GetSection("ConnectionStrings:Development:Pagos").Value;

// Configurar el DbContext para usar MySQL
builder.Services.AddDbContext<pagosContext>(options =>
    options.UseMySql(connectionPagos, ServerVersion.AutoDetect(connectionPagos))
);

// Sesión
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(8); // Aumenté a 8 horas para consistencia
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// MVC + Auth
builder.Services.AddControllersWithViews();
builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

// ✅ AGREGAR: Servicios de autorización
builder.Services.AddAuthorization();

// Autenticación con cookies (mejorada)
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Home/Login";
        options.LogoutPath = "/Home/Logout";
        options.AccessDeniedPath = "/Home/AccesoDenegado";
        options.ExpireTimeSpan = TimeSpan.FromHours(8); // Consistencia con sesión
        options.SlidingExpiration = true; // Renueva la cookie automáticamente
    });

var app = builder.Build();

// Middleware
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseStaticFiles();
app.UseRouting();
app.UseSession();           // <-- AQUI: habilita HttpContext.Session
app.UseAuthentication();    // <-- Usa autenticación (claims, etc.)
app.UseAuthorization();     // ✅ AGREGAR: Usa autorización

// Ruta por defecto
app.MapDefaultControllerRoute();

app.Run();