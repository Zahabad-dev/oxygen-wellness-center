// Genera un hash bcrypt para pegar manualmente en usuarios_internos.password_hash
// Uso: npm run hash -- "MiPasswordSegura"
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash -- "MiPasswordSegura"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log(hash);
