// Zakłada konto lub zmienia hasło istniejącego użytkownika.
//   npm run user:create -- <login> [admin|editor]
// Hasło podaje się interaktywnie (nie trafia do historii powłoki).
// W skryptach można je przekazać zmienną środowiskową NEW_USER_PASSWORD.
import readline from 'node:readline';
import { pool, query } from '../server/db.js';
import { migrate } from '../server/migrate.js';
import { hashPassword, validateNewPassword } from '../server/auth.js';

function askHidden(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (s) => { if (!muted) rl.output.write(s); };
    rl.question(prompt, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
    muted = true;
  });
}

async function main() {
  const [username, role = 'admin'] = process.argv.slice(2);
  if (!username || !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
    throw new Error('Użycie: npm run user:create -- <login> [admin|editor]\nLogin: 3–50 znaków (litery, cyfry, . _ -).');
  }
  if (!['admin', 'editor'].includes(role)) throw new Error('Rola musi być "admin" albo "editor".');

  let password = process.env.NEW_USER_PASSWORD;
  if (!password) {
    password = await askHidden('Hasło (min. 10 znaków): ');
    const repeat = await askHidden('Powtórz hasło: ');
    if (password !== repeat) throw new Error('Hasła się różnią.');
  }
  const problem = validateNewPassword(password);
  if (problem) throw new Error(problem);

  await migrate({ log: () => {} });
  const hash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)
     ON CONFLICT ((lower(username))) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
     RETURNING (xmax = 0) AS inserted`,
    [username, hash, role],
  );
  console.log(rows[0].inserted ? `Utworzono użytkownika "${username}" (${role}).` : `Zmieniono hasło użytkownika "${username}".`);
}

main()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => pool.end());
