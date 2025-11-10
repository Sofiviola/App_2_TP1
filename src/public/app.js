// === Config ===
const API = ''; // mismo origin -> '' (las rutas empiezan con /api)
const LS_CART = 'agro_cart';
const LS_UID  = 'agro_uid';
const LS_ADDR = 'agro_addr';

// === State ===
let allProducts = [];
let cart = loadCart();
let users = [];

// === Utils ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const fmtMoney = (n) => '$ ' + (Number(n)||0).toLocaleString('es-AR');

function bump(el){ el.classList.add('bump'); setTimeout(()=>el.classList.remove('bump'), 300); }
function saveCart() { localStorage.setItem(LS_CART, JSON.stringify(cart)); }
function loadCart() { try { return JSON.parse(localStorage.getItem(LS_CART) || '{}'); } catch{ return {}; } }
function cartCount() { return Object.values(cart).reduce((a,b)=>a+b,0); }
function cartTotal() {
  return Object.entries(cart).reduce((acc,[pid,qty])=>{
    const p = allProducts.find(x => x.id === Number(pid));
    return acc + (p ? p.precio * qty : 0);
  },0);
}

// === Init ===
init();
async function init(){
  // persistidos
  const uid = localStorage.getItem(LS_UID);
  const addr = localStorage.getItem(LS_ADDR) || '';
  $('#inpAddress').value = addr;

  // cargar datos
  [allProducts, users] = await Promise.all([fetchJson('/api/productos'), fetchJson('/api/usuarios')]);

  // llenar usuarios
  const selUser = $('#selUser');
  selUser.innerHTML = '<option value="">Seleccioná…</option>' + users.map(u => 
    `<option value="${u.id}" ${String(u.id)===uid?'selected':''}>${u.nombre} ${u.apellido}</option>`
  ).join('');

  // llenar categorías
  const cats = Array.from(new Set(allProducts.map(p => p.categoria || 'Sin categoría'))).sort();
  $('#selCat').innerHTML = '<option value="">Todas</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');

  // listeners
  $('#selCat').addEventListener('change', renderProducts);
  $('#inpSearch').addEventListener('input', renderProducts);
  $('#selUser').addEventListener('change', e => localStorage.setItem(LS_UID, e.target.value));
  $('#inpAddress').addEventListener('input', e => localStorage.setItem(LS_ADDR, e.target.value));
  $('#btnVaciar').addEventListener('click', () => { cart = {}; saveCart(); renderCart(); });
  $('#btnComprar').addEventListener('click', comprar);

  renderProducts();
  renderCart();
}

// === Render productos ===
function renderProducts(){
  const q = $('#inpSearch').value.trim().toLowerCase();
  const cat = $('#selCat').value;
  const list = allProducts.filter(p => {
    if (cat && (p.categoria || 'Sin categoría') !== cat) return false;
    if (q && !(p.nombre+' '+(p.desc||'')).toLowerCase().includes(q)) return false;
    return p.activo !== false; // ocultar inactivos
  });

  const grid = $('#gridProducts');
  grid.innerHTML = list.map(p => {
    const inCart = cart[p.id] || 0;
    const disableAdd = p.stock <= 0 ? 'disabled' : '';
    return `
      <article class="card prod">
        <div class="imgph">${p.imagen ? `<img src="${p.imagen}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px" />` : 'Imagen'}</div>
        <div>
          <strong>${escapeHtml(p.nombre)}</strong><br/>
          <span class="chip">${escapeHtml(p.categoria || 'Sin categoría')}</span>
        </div>
        <div class="row">
          <span>${fmtMoney(p.precio)}</span>
          <span class="pill right">Stock: ${p.stock ?? 0}</span>
        </div>
        <div class="row">
          <button ${disableAdd} onclick="addToCart(${p.id})">Agregar</button>
          <span class="muted">En carrito: ${inCart}</span>
        </div>
      </article>
    `;
  }).join('') || '<div class="muted">No hay productos para mostrar.</div>';
}

window.addToCart = (pid) => {
  const p = allProducts.find(x => x.id === Number(pid));
  if (!p) return;
  const current = cart[pid] || 0;
  const next = Math.min(current + 1, p.stock || 0);
  cart[pid] = next;
  if (next === 0) delete cart[pid];
  saveCart();
  renderCart();
  renderProducts();
};

// === Carrito ===
function renderCart(){
  const body = $('#cartBody');
  const empty = $('#cartEmpty');
  const box = $('#cartBox');

  const entries = Object.entries(cart).filter(([_,qty]) => qty>0);
  if (entries.length === 0){
    empty.style.display = '';
    box.style.display = 'none';
  } else {
    empty.style.display = 'none';
    box.style.display = '';
  }

  body.innerHTML = entries.map(([pid, qty]) => {
    const p = allProducts.find(x => x.id === Number(pid));
    if (!p) return '';
    const subtotal = p.precio * qty;
    return `
      <tr>
        <td>${escapeHtml(p.nombre)}</td>
        <td>
          <input type="number" min="0" max="${p.stock||0}" value="${qty}" style="width:80px"
                 oninput="updateQty(${p.id}, this.value)">
        </td>
        <td>${fmtMoney(p.precio)}</td>
        <td>${fmtMoney(subtotal)}</td>
        <td><button onclick="removeItem(${p.id})">Quitar</button></td>
      </tr>
    `;
  }).join('');

  $('#cartTotal').textContent = fmtMoney(cartTotal());
  $('#badgeCart').textContent = `Carrito: ${cartCount()} items`;
  $('#badgeTotal').textContent = fmtMoney(cartTotal());
  bump(document.getElementById('badgeCart'));
bump(document.getElementById('badgeTotal'));
}

window.updateQty = (pid, val) => {
  const p = allProducts.find(x => x.id === Number(pid));
  let n = Number(val) || 0;
  if (p) n = Math.max(0, Math.min(n, p.stock || 0));
  if (n === 0) delete cart[pid]; else cart[pid] = n;
  saveCart(); renderCart(); renderProducts();
};

window.removeItem = (pid) => { delete cart[pid]; saveCart(); renderCart(); renderProducts(); };

// === Comprar ===
async function comprar(){
  const id_usuario = Number($('#selUser').value);
  const direccion = $('#inpAddress').value.trim();
  if (!id_usuario) return alert('Seleccioná un usuario');
  if (!direccion) return alert('Ingresá una dirección');
  const items = Object.entries(cart)
    .filter(([_,qty]) => qty>0)
    .map(([pid, qty]) => ({ id_producto: Number(pid), cantidad: Number(qty) }));
  if (items.length === 0) return alert('El carrito está vacío');

  try {
    $('#btnComprar').disabled = true;
    const venta = await postJson('/api/ventas', { id_usuario, direccion, productos: items });
    alert(`Compra creada!\nVenta #${venta.id}\nTotal: ${fmtMoney(venta.total)}`);
    cart = {}; saveCart();
    // Re-fetch productos para refrescar stock
    allProducts = await fetchJson('/api/productos');
    renderProducts();
    renderCart();
  } catch (e) {
    console.error(e);
    alert('No se pudo completar la compra: ' + (e.message || e));
  } finally {
    $('#btnComprar').disabled = false;
  }
}

// === Fetch helpers ===
async function fetchJson(url){
  const res = await fetch(API + url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function postJson(url, body){
  const res = await fetch(API + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
