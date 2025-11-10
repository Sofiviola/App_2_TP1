# 🌾 AgroViola 

## 🧱 Archivos y propósito

- `usuarios.json`: Personas registradas (clientes y/o administración).
- `proveedores.json` *(opcional)*: Empresas que abastecen insumos/repustos agro.
- `productos.json`: Catálogo de artículos de campo (semillas, fertilizantes, agroquímicos, riego, repuestos, etc.).
- `ventas.json`: Comprobantes de venta con detalle de ítems.

### 🔗 Relaciones
- `ventas.id_usuario` **→** `usuarios.id`
- `ventas.productos[].id_producto` **→** `productos.id`
- `productos.id_proveedor` **→** `proveedores.id` *(si usás el archivo opcional)*

### 🧩 Interfaz (monorepo)

Esta entrega agrega una interfaz web servida por el mismo servidor Express (modelo monorepo).
El front vive en src/public/ y consume las rutas /api/* del back.

### 🧱 Estructura relevante
.
├─ Datos/
│  ├─ usuarios.json
│  ├─ productos.json
│  └─ ventas.json
├─ src/
│  ├─ index.js            # Express: API + sirve el front
│  └─ public/
│     ├─ index.html       # UI de la tienda
│     └─ app.js           # Lógica (fetch, filtros, carrito, compra)
├─ requests.http          # Requests de ejemplo para probar API
└─ README.md
