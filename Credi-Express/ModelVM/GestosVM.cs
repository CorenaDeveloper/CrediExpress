namespace Credi_Express.ModelVM
{
    public class GestosVM
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = null!;
        public string Apellido { get; set; } = null!;
        public string Direccion { get; set; } = null!;
        public string Telefono { get; set; } = null!;
        public int? Departamento { get; set; }
        public string DepartamentoNombre { get; set; } = null!;
        public sbyte? Activo { get; set; }
        public int? Idpuesto { get; set; }
        public string? PuestoNombre { get; set; } = null!;
        public string? Usuario { get; set; } = null!;
    }
}
