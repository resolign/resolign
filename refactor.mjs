import fs from 'fs';
import path from 'path';

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  let original = code;

  // Replace db.prepare(`...`).get(...)
  code = code.replace(/db\.prepare\((['"`])([\s\S]*?)\1\)\.get\(([\s\S]*?)\)/g, '(await db.execute({ sql: $1$2$1, args: [$3] })).rows[0]');
  code = code.replace(/db\.prepare\((['"`])([\s\S]*?)\1\)\.get\(\)/g, '(await db.execute({ sql: $1$2$1, args: [] })).rows[0]');

  // Replace db.prepare(`...`).run(...)
  code = code.replace(/db\.prepare\((['"`])([\s\S]*?)\1\)\.run\(([\s\S]*?)\)/g, 'await db.execute({ sql: $1$2$1, args: [$3] })');
  code = code.replace(/db\.prepare\((['"`])([\s\S]*?)\1\)\.run\(\)/g, 'await db.execute({ sql: $1$2$1, args: [] })');

  // Replace db.prepare(`...`).all(...)
  code = code.replace(/db\.prepare\((['"`])([\s\S]*?)\1\)\.all\(([\s\S]*?)\)/g, '(await db.execute({ sql: $1$2$1, args: [$3] })).rows');
  code = code.replace(/db\.prepare\((['"`])([\s\S]*?)\1\)\.all\(\)/g, '(await db.execute({ sql: $1$2$1, args: [] })).rows');

  if (code !== original) {
    fs.writeFileSync(filePath, code);
    console.log(`Updated ${filePath}`);
  }
}

const dirs = [
  'src/app/api/profile/route.ts',
  'src/app/api/notes/route.ts',
  'src/app/api/network/requests/route.ts',
  'src/app/api/network/connections/route.ts',
  'src/app/api/connections/route.ts'
];

dirs.forEach(f => {
  const absolutePath = path.join(process.cwd(), f);
  if (fs.existsSync(absolutePath)) {
    processFile(absolutePath);
  } else {
    console.warn(`File not found: ${absolutePath}`);
  }
});
