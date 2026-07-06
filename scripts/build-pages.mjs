import { constants as fsConstants } from 'node:fs';
import { access, copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoDir = path.join(rootDir, 'demo');
const distDir = path.join(rootDir, 'dist');
const outputDir = path.join(rootDir, 'docs');
const outputDistDir = path.join(outputDir, 'dist');
const readmeUrl = 'https://github.com/vmitsaras/A11y-Form-Validator#readme';
const localJsImportPattern =
  /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']((?:\.{1,2}\/)[^"']+\.js)["']|import\(\s*["']((?:\.{1,2}\/)[^"']+\.js)["']\s*\)/g;

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
  await assertReadable(path.join(distDir, 'index.js'));
  await assertReadable(path.join(distDir, 'index.min.js'));
  await assertReadable(path.join(distDir, 'styles.css'));

  await copyDirectory(distDir, outputDistDir);
}

async function findJavaScriptFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findJavaScriptFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }

  return files;
}

async function assertLocalJsImportsExist(filePath) {
  const source = await readFile(filePath, 'utf8');
  const matches = source.matchAll(localJsImportPattern);

  for (const match of matches) {
    const importPath = match[1] || match[2];
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);

    try {
      await assertReadable(resolvedPath);
    } catch {
      throw new Error(
        `Missing Pages runtime import: ${importPath} referenced by ${path.relative(rootDir, filePath)}`
      );
    }
  }
}

async function assertPagesRuntimeFiles() {
  await assertReadable(path.join(outputDistDir, 'index.js'));
  await assertReadable(path.join(outputDistDir, 'index.min.js'));
  await assertReadable(path.join(outputDistDir, 'styles.css'));

  const javaScriptFiles = await findJavaScriptFiles(outputDistDir);

  for (const filePath of javaScriptFiles) {
    await assertLocalJsImportsExist(filePath);
  }
}

async function writePagesSupportFiles() {
  const notFoundHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page Not Found | A11y Form Validator</title>
    <meta
      name="description"
      content="The A11y Form Validator demo page you requested could not be found. Return to the demo gallery for working examples."
    />
    <meta name="robots" content="noindex,follow" />
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
await assertPagesRuntimeFiles();
await writePagesSupportFiles();
