using System.Security.Claims;

namespace Credi_Express.Services
{
    public static class PermisosExtensions
    {
        public static bool TienePermiso(this ClaimsPrincipal user, string modulo, string permiso)
        {
            return user.HasClaim("ModuloPermiso", $"{modulo}:{permiso}");
        }

        public static bool TieneAccesoModulo(this ClaimsPrincipal user, string modulo)
        {
            return user.HasClaim("Modulo", modulo);
        }

        public static IEnumerable<string> ObtenerModulos(this ClaimsPrincipal user)
        {
            return user.Claims
                .Where(c => c.Type == "Modulo")
                .Select(c => c.Value)
                .Distinct();
        }
    }
}
