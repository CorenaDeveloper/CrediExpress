namespace Credi_Express.ModelVM
{
    public class PrestamosVM
    {
        public int Id { get; set; }
        public int? IdCliente { get; set; }
        public string? NombreCliente { get; set; }
        public DateOnly? fecha { get; set; }
        public decimal? Monto { get; set; }
        public decimal? Tasa { get; set; }
        public int? NumCoutas { get; set; }
        public decimal? Cuotas { get; set; }
        public decimal? Interes { get; set; }
        public DateOnly? ProximoPago { get; set; }
        public string? Estado { get; set; }
        public DateOnly? FechaCancelado { get; set; }
        public ulong? Aprobado { get; set; }
        public decimal? TasaDomicilio { get; set; }
        public string? DetalleAprobado { get; set; }
        public int? CreadoPor { get; set; }
        public DateOnly? FechaCreadaFecha { get; set; }
        public decimal? Domicilio { get; set; }
        public string? Observaciones { get; set; }
        public string? DetalleRechazo { get; set; }
        public string? TipoPrestamo { get; set; }
        public string? NombreCreadoPor { get; set; }
        public string? NombreGestor { get; set; }
    }
}
