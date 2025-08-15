using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Credi_Express.Services
{
    public class RequierePermisoAttribute : Attribute, IAuthorizationFilter
    {
        private readonly string _modulo;
        private readonly string _permiso;

        public RequierePermisoAttribute(string modulo, string permiso)
        {
            _modulo = modulo;
            _permiso = permiso;
        }

        public void OnAuthorization(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;

            if (!user.Identity.IsAuthenticated)
            {
                context.Result = new RedirectToActionResult("Login", "Home", null);
                return;
            }

            if (!user.TienePermiso(_modulo, _permiso))
            {
                context.Result = new RedirectToActionResult("AccesoDenegado", "Home", null);
                return;
            }
        }
    }
}
