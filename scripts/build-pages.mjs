import { constants as fsConstants } from 'node:fs';
import { access, copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoDir = path.join(rootDir, 'demo');
const distDir = path.join(rootDir, 'dist');
const outputDir = path.join(rootDir, 'pages-dist');
const outputDistDir = path.join(outputDir, 'dist');
const outputLocalesDir = path.join(outputDistDir, 'locales');
const readmeUrl = 'https://github.com/vmitsaras/A11y-Form-Validator#readme';

async function assertReadable(filePath) {
  try {
    await access(filePath, fsConstants.R_OK);
  } catch {
    throw new Error(`Missing required Pages file: ${path.relative(rootDir, filePath)}`);
  }
}

async function copyDemoHtml(fileName) {
  const sourcePath = path.join(demoDir, fileName);
  const outputPath = path.join(outputDir, fileName);
  const source = await readFile(sourcePath, 'utf8');
  const rewritten = source
    .replaceAll('../dist/', './dist/')
    .replaceAll('href="../README.md"', `href="${readmeUrl}"`);

  await writeFile(outputPath, rewritten);
}

async function copyDemoAssets() {
  const files = await readdir(demoDir);

  for (const fileName of files) {
    if (fileName.endsWith('.html')) {
      await copyDemoHtml(fileName);
      continue;
    }

    if (fileName === 'styles.css') {
      await copyFile(path.join(demoDir, fileName), path.join(outputDir, fileName));
    }
  }
}

async function copyDirectory(sourceDir, outputDirPath) {
  await assertReadable(sourceDir);
  await mkdir(outputDirPath, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const outputPath = path.join(outputDirPath, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, outputPath);
      continue;
    }

    if (entry.isFile()) {
      await copyFile(sourcePath, outputPath);
    }
  }
}

async function copyBuiltAssets() {
  const requiredFiles = ['index.js', 'index.min.js', 'styles.css'];
  const optionalFiles = ['index.js.map', 'index.min.js.map'];

  for (const fileName of requiredFiles) {
    const sourcePath = path.join(distDir, fileName);
    await assertReadable(sourcePath);
    await copyFile(sourcePath, path.join(outputDistDir, fileName));
  }

  for (const fileName of optionalFiles) {
    const sourcePath = path.join(distDir, fileName);

    try {
      await access(sourcePath, fsConstants.R_OK);
      await copyFile(sourcePath, path.join(outputDistDir, fileName));
    } catch {
      // Source maps are useful for Pages debugging but should not block deployment.
    }
  }

  const localesDir = path.join(distDir, 'locales');
  const localeFiles = await readdir(localesDir);
  await mkdir(outputLocalesDir, { recursive: true });

  for (const fileName of localeFiles) {
    if (fileName.endsWith('.json')) {
      await copyFile(path.join(localesDir, fileName), path.join(outputLocalesDir, fileName));
    }
  }

  await copyDirectory(path.join(distDir, 'addons'), path.join(outputDistDir, 'addons'));
  await copyDirectory(path.join(distDir, 'presets'), path.join(outputDistDir, 'presets'));
}

async function writePagesSupportFiles() {
  const notFoundHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page not found | A11y Form Validator</title>
    <link rel="stylesheet" href="./styles.css" />
    <link rel="stylesheet" href="./dist/styles.css" />
  </head>
  <body>
    <div class="container">
      <header class="header">
        <h1>Page not found</h1>
        <a class="button" href="./">Back to demos</a>
      </header>
      <p class="description">The demo page you requested does not exist.</p>
    </div>
  </body>
</html>
`;

  await writeFile(path.join(outputDir, '.nojekyll'), '');
  await writeFile(path.join(outputDir, '404.html'), notFoundHtml);
}

await assertReadable(path.join(demoDir, 'index.html'));
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDistDir, { recursive: true });
await copyDemoAssets();
await copyBuiltAssets();
await writePagesSupportFiles();
