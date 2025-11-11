const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

(async () => {
  const fp = path.join(__dirname, '..', 'Datos', 'usuarios.json');
  const raw = await fs.readFile(fp, 'utf8');
  const data = JSON.parse(raw);
  let cambios = 0;

  for (const u of data) {
    const pwd = u["contraseña"];
    if (typeof pwd === 'string' && !pwd.startsWith('$2a$') && !pwd.startsWith('$2b$')) {
      u["contraseña"] = await bcrypt.hash(pwd, 10);
      cambios++;
    }
  }

  if (cambios > 0) {
    await fs.writeFile(fp, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Listo: ${cambios} contraseñas migradas a bcrypt.`);
  } else {
    console.log('No había contraseñas planas para migrar.');
  }
})();
