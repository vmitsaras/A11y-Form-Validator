import { constants as fsConstants } from 'node:fs';
import { access, copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const srcLocalesDir = path.join(srcDir, 'locales');
const distLocalesDir = path.join(distDir, 'locales');

async function copyIfReadable(sourcePath, outputPath) {
  try {
    await access(sourcePath, fsConstants.R_OK);
  } catch {
    return false;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await copyFile(sourcePath, outputPath);
  return true;
}

async function copyLocaleFiles() {
  const files = await readdir(srcLocalesDir);
  await mkdir(distLocalesDir, { recursive: true });

  for (const fileName of files) {
    if (fileName.endsWith('.json')) {
      await copyFile(path.join(srcLocalesDir, fileName), path.join(distLocalesDir, fileName));
    }
  }
}

await copyIfReadable(path.join(srcDir, 'styles.css'), path.join(distDir, 'styles.css'));
await copyLocaleFiles();
