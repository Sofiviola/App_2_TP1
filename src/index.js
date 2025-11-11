// src/index.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const bcrypt = require('bcryptjs');   
const jwt = require('jsonwebtoken');  
require('dotenv').config();      

// JWT helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const signToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, name: `${user.nombre} ${user.apellido}` },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

app.use(cors());
app.use(express.json());

const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));


// ---------- util fs ----------
const DATA_DIR = path.join(__dirname, '..', 'Datos');

const filePath = {
  usuarios: path.join(DATA_DIR, 'usuarios.json'),
  proveedores: path.join(DATA_DIR, 'proveedores.json'),
  productos: path.join(DATA_DIR, 'productos.json'),
  ventas: path.join(DATA_DIR, 'ventas.json')
};

async function readJSON(fp) {
  const raw = await fs.readFile(fp, 'utf8');
  return JSON.parse(raw);
}
async function writeJSON(fp, data) {
  await fs.writeFile(fp, JSON.stringify(data, null, 2), 'utf8');
}
function nextId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1;
}


app.get('/', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// =====================================================
//                 GET (consultas)
// =====================================================

// GET 1: listar productos (con filtros opcionales)
app.get('/api/productos', async (req, res) => {
  try {
    const { categoria, activo, proveedor } = req.query;
    let productos = await readJSON(filePath.productos);

    if (categoria) {
      productos = productos.filter(p => (p.categoria || '').toLowerCase() === String(categoria).toLowerCase());
    }
    if (typeof activo !== 'undefined') {
      const flag = String(activo).toLowerCase() === 'true';
      productos = productos.filter(p => p.activo === flag);
    }
    if (proveedor) {
      productos = productos.filter(p => Number(p.id_proveedor) === Number(proveedor));
    }
    res.json(productos);
  } catch (e) {
    res.status(500).json({ error: 'Error al leer productos', detail: e.message });
  }
});

// GET 2: detalle de una venta
app.get('/api/ventas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ventas = await readJSON(filePath.ventas);
    const venta = ventas.find(v => v.id === id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(venta);
  } catch (e) {
    res.status(500).json({ error: 'Error al leer venta', detail: e.message });
  }
});

// extras útiles
app.get('/api/usuarios', async (_req, res) => {
  try {
    const usuarios = await readJSON(filePath.usuarios);
    const seguros = usuarios.map(u => {
      const { ["contraseña"]: _omit, ...safe } = u;
      return safe;
    });
    res.json(seguros);
  } catch (e) {
    res.status(500).json({ error: 'Error al leer usuarios', detail: e.message });
  }
});


// Login: devuelve token JWT si email/contraseña válidos
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, contraseña, password } = req.body || {};
    const pass = contraseña || password;
    if (!email || !pass) return res.status(400).json({ error: 'email y contraseña son obligatorios' });

    const usuarios = await readJSON(filePath.usuarios);
    const u = usuarios.find(x => String(x.email).toLowerCase() === String(email).toLowerCase());
    if (!u) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!u.activo) return res.status(403).json({ error: 'Usuario inactivo' });

    const ok = await bcrypt.compare(pass, u["contraseña"]);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken(u);
    const { ["contraseña"]: _omit, ...userSafe } = u;
    res.json({ token, user: userSafe, expiresIn: JWT_EXPIRES_IN });
  } catch (e) {
    res.status(500).json({ error: 'Error en login', detail: e.message });
  }
});


app.get('/api/proveedores', async (_req, res) => {
  try {
    const proveedores = await readJSON(filePath.proveedores);
    res.json(proveedores);
  } catch (e) {
    res.status(500).json({ error: 'Error al leer proveedores', detail: e.message });
  }
});

// =====================================================
//                 POST (crear)
// =====================================================

// POST 1: crear usuario (param sensibles -> body)
app.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre, apellido, email, contraseña, activo = true, es_admin = false } = req.body || {};
    if (!nombre || !apellido || !email || !contraseña) {
      return res.status(400).json({ error: 'nombre, apellido, email y contraseña son obligatorios' });
    }

    const usuarios = await readJSON(filePath.usuarios);
    if (usuarios.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
      return res.status(409).json({ error: 'Email ya registrado' });
    }

    const hashed = await bcrypt.hash(contraseña, 10);  // <- AQUÍ

    const nuevo = {
      id: nextId(usuarios),
      nombre, apellido, email,
      ["contraseña"]: hashed,                          // <- GUARDAR HASH
      activo: Boolean(activo),
      es_admin: Boolean(es_admin),
      fecha_registro: new Date().toISOString()
    };

    usuarios.push(nuevo);
    await writeJSON(filePath.usuarios, usuarios);

    // opcional: no devolver el hash
    const { ["contraseña"]: _omit, ...safe } = nuevo;
    res.status(201).json(safe);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear usuario', detail: e.message });
  }
});


// POST 2: crear venta (valida usuario, productos, stock; calcula totales; descuenta stock)
// Reemplazá la firma del endpoint por requireAuth:
app.post('/api/ventas', requireAuth, async (req, res) => {
  try {
    let { id_usuario, direccion, productos = [] } = req.body || {};

    // Si viene token, priorizamos el user del token
    if (req.user?.sub) id_usuario = Number(req.user.sub);

    if (!id_usuario || !direccion || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'id_usuario/direccion/productos[] obligatorios' });
    }

    if (!id_usuario || !direccion || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'id_usuario, direccion y productos[] son obligatorios' });
    }

    const [usuarios, productosCat, ventas] = await Promise.all([
      readJSON(filePath.usuarios),
      readJSON(filePath.productos),
      readJSON(filePath.ventas)
    ]);

    const usuarioExiste = usuarios.some(u => u.id === Number(id_usuario) && u.activo);
    if (!usuarioExiste) return res.status(400).json({ error: 'Usuario inexistente o inactivo' });

    // Validar y armar items con precio del catálogo
    const items = [];
    for (const it of productos) {
      const { id_producto, cantidad } = it || {};
      if (!id_producto || !cantidad || cantidad <= 0) {
        return res.status(400).json({ error: 'Cada item requiere id_producto y cantidad > 0' });
      }
      const prod = productosCat.find(p => p.id === Number(id_producto) && p.activo);
      if (!prod) return res.status(400).json({ error: `Producto ${id_producto} inexistente o inactivo` });
      if ((prod.stock || 0) < cantidad) {
        return res.status(400).json({ error: `Stock insuficiente para producto ${id_producto}` });
      }
      const precio_unitario = Number(prod.precio);
      const subtotal = precio_unitario * Number(cantidad);
      items.push({ id_producto: prod.id, cantidad: Number(cantidad), precio_unitario, subtotal });
    }

    const total = items.reduce((acc, x) => acc + x.subtotal, 0);

    // Descontar stock
    for (const it of items) {
      const prod = productosCat.find(p => p.id === it.id_producto);
      prod.stock = Number(prod.stock) - it.cantidad;
    }

    const nuevaVenta = {
      id: nextId(ventas),
      id_usuario: Number(id_usuario),
      fecha: new Date().toISOString(),
      total,
      direccion,
      pagado: false,
      facturado: false,
      enviado: false,
      productos: items
    };

    ventas.push(nuevaVenta);
    await Promise.all([
      writeJSON(filePath.ventas, ventas),
      writeJSON(filePath.productos, productosCat)
    ]);

    res.status(201).json(nuevaVenta);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear venta', detail: e.message });
  }
});

// =====================================================
//                 PUT (actualizar)
// =====================================================

// PUT: actualizar producto (precio, stock, activo, etc.)
app.put('/api/productos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cambios = req.body || {};
    const productos = await readJSON(filePath.productos);
    const idx = productos.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

    const permitido = ['nombre','desc','precio','imagen','stock','activo','categoria','unidad','id_proveedor'];
    for (const k of Object.keys(cambios)) {
      if (!permitido.includes(k)) delete cambios[k];
    }
    productos[idx] = { ...productos[idx], ...cambios };
    await writeJSON(filePath.productos, productos);
    res.json(productos[idx]);
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar producto', detail: e.message });
  }
});

// =====================================================
//                 DELETE (integridad)
// =====================================================

// DELETE usuario: solo si no tiene ventas asociadas
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [usuarios, ventas] = await Promise.all([
      readJSON(filePath.usuarios),
      readJSON(filePath.ventas)
    ]);
    const enUso = ventas.some(v => v.id_usuario === id);
    if (enUso) {
      return res.status(409).json({
        error: 'No se puede eliminar el usuario: tiene ventas asociadas'
      });
    }
    const nuevoListado = usuarios.filter(u => u.id !== id);
    if (nuevoListado.length === usuarios.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    await writeJSON(filePath.usuarios, nuevoListado);
    res.json({ ok: true, eliminado: id });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar usuario', detail: e.message });
  }
});

// DELETE producto: solo si no fue utilizado en ventas
app.delete('/api/productos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [productos, ventas] = await Promise.all([
      readJSON(filePath.productos),
      readJSON(filePath.ventas)
    ]);
    const usado = ventas.some(v => (v.productos || []).some(it => it.id_producto === id));
    if (usado) {
      return res.status(409).json({ error: 'No se puede eliminar el producto: aparece en ventas' });
    }
    const nuevo = productos.filter(p => p.id !== id);
    if (nuevo.length === productos.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await writeJSON(filePath.productos, nuevo);
    res.json({ ok: true, eliminado: id });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar producto', detail: e.message });
  }
});

// =====================================================

app.get('/api/rutas', (_req, res) => {
  res.json({
    base: '/api',
    endpoints: [
      { method: 'GET',    path: '/api/productos?categoria=&activo=&proveedor=' },
      { method: 'GET',    path: '/api/ventas/:id' },
      { method: 'GET',    path: '/api/usuarios' },
      { method: 'GET',    path: '/api/proveedores' },
      { method: 'POST',   path: '/api/usuarios' },
      { method: 'POST',   path: '/api/ventas' },
      { method: 'PUT',    path: '/api/productos/:id' },
      { method: 'DELETE', path: '/api/usuarios/:id' },
      { method: 'DELETE', path: '/api/productos/:id' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`AgroViola API escuchando en http://localhost:${PORT}`);
});
