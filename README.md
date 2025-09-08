# 🌾 AgroViola — Datos de ejemplo (Agro)

## 🧱 Archivos y propósito

- `usuarios.json`: Personas registradas (clientes y/o administración).
- `proveedores.json` *(opcional)*: Empresas que abastecen insumos/repustos agro.
- `productos.json`: Catálogo de artículos de campo (semillas, fertilizantes, agroquímicos, riego, repuestos, etc.).
- `ventas.json`: Comprobantes de venta con detalle de ítems.

### 🔗 Relaciones
- `ventas.id_usuario` **→** `usuarios.id`
- `ventas.productos[].id_producto` **→** `productos.id`
- `productos.id_proveedor` **→** `proveedores.id` *(si usás el archivo opcional)*

---

## 🔤 Tipos de datos presentes (según consigna)

- **Numéricos**: `id`, `precio`, `subtotal`, `total`, `cantidad`, `stock`, `cp`.
- **Cadenas**: `nombre`, `apellido`, `email`, `desc`, `imagen`, `categoria`, `unidad`, `direccion.*`, `razon_social`, `cuit`, `rubro`, `telefono`.
- **Booleanos**: `activo`, `es_admin`, `es_nacional`, `pagado`, `facturado`, `enviado`.
