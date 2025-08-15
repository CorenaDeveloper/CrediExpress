namespace Credi_Express.ModelVM
{
    public class ClienteConGestorVM
    {
        public int Id { get; set; }
        public string? Nombre { get; set; }
        public string? Apellido { get; set; }
        public string? GestorNombre { get; set; }
        public int? IdGestor { get; set; }
        public string? Dui { get; set; }
        public string? Direccion { get; set; }
        public string? Nit { get; set; }
        public string? Telefono { get; set; }
        public string? Celular { get; set; }
        public DateOnly? FechaIngreso { get; set; }
        public string? Departamento { get; set; }
        public string? DepartamentoNombre { get; set; }
        public sbyte? Activo { get; set; }
        public string? Giro { get; set; }
        public string? Referencia1 { get; set; }
        public string? Telefono1 { get; set; }
        public string? Referencia2 { get; set; }
        public string? Telefono2 { get; set; }
        public string? TipoPer { get; set; }
        public DateOnly? FechaNacimiento { get; set; }
        public string? Sexo { get; set; }
        public string? DuiFrente { get; set; }
        public string? DuiDetras { get; set; }
        public string? FotoNegocio1 { get; set; }
        public string? FotoNegocio2 { get; set; }
        public string? FotoNegocio3 { get; set; }
        public string? FotoNegocio4 { get; set; }
        public decimal? Longitud { get; set; }
        public decimal? Latitud { get; set; }
        public string? Profesion { get; set; }
    }
}
