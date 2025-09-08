# 🌾 AgroViola API — Rutas y Guía de Pruebas

**Base URL local:** `http://localhost:3000`  

## 🚀 Levantar la API
npm i
npm run dev   # o npm start

## Cómo probar  con VS Code + REST Client 

Instalar extensión REST Client (Huachao Mao) en VSC.

Abrir requests.http (incluido en el repo).

Click en Send Request encima de cada bloque.

Ver el status y el JSON de respuesta.

El archivo requests.http cubre 2 GET, 2 POST, 1 PUT y 1 DELETE


## 📌 Endpoints

| Método | Ruta                                           | Descripción                                                   |
|--------|-------------------------------------------------|---------------------------------------------------------------|
| GET    | `/api/productos?categoria=&activo=&proveedor=` | Lista productos con filtros opcionales.                      |
| GET    | `/api/ventas/:id`                              | Detalle de una venta por id.                                 |
| GET    | `/api/usuarios`                                | Lista usuarios.                                              |
| GET    | `/api/proveedores`                             | Lista proveedores.                                           |
| POST   | `/api/usuarios`                                | Crea un usuario (body JSON).                                 |
| POST   | `/api/ventas`                                  | Crea una venta (valida usuario, stock; descuenta stock).     |
| PUT    | `/api/productos/:id`                           | Actualiza campos de un producto.                             |
| DELETE | `/api/usuarios/:id`                            | Elimina un usuario **solo si no tiene ventas**.              |
| DELETE | `/api/productos/:id`                           | Elimina un producto **solo si no aparece en ventas**.        |


## Aclaracion
En el requests.http que te pasé se validan estos endpoints:

GET /api/productos?categoria=&activo=

GET /api/ventas/:id

POST /api/usuarios

POST /api/ventas

PUT /api/productos/:id

DELETE /api/usuarios/:id (uno que debe dar 409 y otro 200 con el id nuevo)