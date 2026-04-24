import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');

if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir);
  for (const file of files) {
    fs.unlinkSync(path.join(dataDir, file));
  }
  console.log("All local database files erased successfully!");
} else {
  console.log("No data directory found.");
}
