// Usuwa zdjęcia, do których nie odwołuje się już żaden post (np. po usunięciu posta albo podmianie zdjęcia).
//   npm run media:cleanup            – tylko pokazuje, co zostałoby usunięte
//   npm run media:cleanup -- --delete – faktycznie usuwa
// Pomija pliki młodsze niż 24 h (mogą należeć do posta, który właśnie jest edytowany).
import { pool, query } from '../server/db.js';
import { deleteMedia } from '../server/routes/media.js';

const doDelete = process.argv.includes('--delete');

async function main() {
  const { rows } = await query(`
    SELECT m.id, m.original_name, m.size_bytes FROM media m
    WHERE m.kind = 'image'
      AND m.created_at < now() - interval '24 hours'
      AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.data::text LIKE '%' || m.id::text || '%')
    ORDER BY m.created_at`);

  const totalMb = rows.reduce((sum, r) => sum + r.size_bytes, 0) / 1024 / 1024;
  console.log(`Nieużywane zdjęcia: ${rows.length} (${totalMb.toFixed(1)} MB)`);
  if (!doDelete) {
    rows.slice(0, 20).forEach((r) => console.log(`  ${r.id}  ${r.original_name ?? ''}`));
    if (rows.length) console.log('Uruchom z --delete, aby je usunąć.');
    return;
  }
  for (const r of rows) await deleteMedia(r.id);
  console.log('Usunięto.');
}

main()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => pool.end());
