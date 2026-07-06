import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoDir = path.join(rootDir, 'demo');
const packagePath = path.join(rootDir, 'package.json');
const publicBaseUrl = 'https://vmitsaras.github.io/A11y-Form-Validator/';
const npmPackageUrl = 'https://www.npmjs.com/package/a11y-form-validator';
const creatorUrl = 'https://github.com/vmitsaras';

const sharedFeatureList = [
  'Native HTML constraint validation support',
  'Custom validation rules and field-specific messages',
  'Accessible inline error messages',
  'Focusable error summary',
  'Character count addon',
  'Server error rendering',
  'Async custom validation',
  'Locale message packs',
  'Destroy and cleanup lifecycle'
];

const sharedAccessibilityFeatures = [
  'Inline errors associated with aria-describedby and aria-errormessage',
  'Polite live-region error announcements',
  'Focusable error summary links',
  'Native keyboard behavior for form controls'
];

function normalizeRepositoryUrl(repository) {
  const raw =
    typeof repository === 'string'
      ? repository
      : repository && typeof repository.url === 'string'
        ? repository.url
        : '';

  return raw
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^git@github\.com:/, 'https://github.com/');
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function extractRequired(html, pattern, label, fileName) {
  const match = html.match(pattern);
  const value = match?.[1]?.trim();

  if (!value) {
    throw new Error(`Missing ${label} in demo/${fileName}`);
  }

  return value;
}

function extractPageMetadata(html, fileName) {
  const title = extractRequired(html, /<title>([\s\S]*?)<\/title>/i, 'title', fileName);
  const description = extractRequired(
    html,
    /<meta\s+name="description"\s+content="([^"]+)"/i,
    'meta description',
    fileName
  );
  const canonicalUrl = extractRequired(
    html,
    /<link\s+rel="canonical"\s+href="([^"]+)"/i,
    'canonical URL',
    fileName
  );
  const heading = stripHtml(extractRequired(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i, 'h1', fileName));
  const creatorName =
    html.match(/<a[^>]+href="https:\/\/github\.com\/vmitsaras"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ||
    'Vasileios Mistaras';

  return {
    title,
    description,
    canonicalUrl,
    heading,
    creatorName: stripHtml(creatorName)
  };
}

function cleanJsonLd(value) {
  if (Array.isArray(value)) {
    const cleaned = value.map(cleanJsonLd).filter((item) => item !== undefined);
    return cleaned.length ? cleaned : undefined;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, nestedValue]) => [key, cleanJsonLd(nestedValue)])
      .filter(([, nestedValue]) => nestedValue !== undefined && nestedValue !== '');

    return entries.length ? Object.fromEntries(entries) : undefined;
  }

  return value === null || value === undefined || value === '' ? undefined : value;
}

function buildJsonLd({ packageData, pageMetadata }) {
  const repositoryUrl = normalizeRepositoryUrl(packageData.repository);
  const packageDescription = packageData.description.endsWith('.')
    ? packageData.description
    : `${packageData.description}.`;
  const pageUrl = pageMetadata.canonicalUrl;
  const softwareId = `${pageUrl}#software`;
  const applicationId = `${pageUrl}#application`;

  return cleanJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: pageMetadata.title,
        headline: pageMetadata.heading,
        description: pageMetadata.description,
        inLanguage: 'en',
        isPartOf: pageUrl === publicBaseUrl ? undefined : { '@id': `${publicBaseUrl}#webpage` },
        mainEntity: {
          '@id': softwareId
        }
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': softwareId,
        name: 'A11y Form Validator',
        alternateName: packageData.name,
        description: packageDescription,
        codeRepository: repositoryUrl,
        programmingLanguage: ['TypeScript', 'JavaScript'],
        runtimePlatform: 'Browser',
        version: packageData.version,
        license: `${repositoryUrl}/blob/main/LICENSE`,
        keywords: packageData.keywords,
        creator: {
          '@id': `${creatorUrl}#person`
        },
        sameAs: [repositoryUrl, npmPackageUrl],
        featureList: sharedFeatureList,
        accessibilityFeature: sharedAccessibilityFeatures,
        targetProduct: {
          '@id': applicationId
        }
      },
      {
        '@type': 'SoftwareApplication',
        '@id': applicationId,
        name: 'A11y Form Validator',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        runtimePlatform: 'Browser',
        softwareVersion: packageData.version,
        installUrl: npmPackageUrl
      },
      {
        '@type': 'Person',
        '@id': `${creatorUrl}#person`,
        name: pageMetadata.creatorName,
        url: creatorUrl
      }
    ]
  });
}

function formatJsonLdScript(jsonLd) {
  const json = JSON.stringify(jsonLd, null, 2)
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');

  return `    <script type="application/ld+json">\n${json}\n    </script>\n`;
}

function injectJsonLd(html, jsonLd, fileName) {
  const withoutExistingJsonLd = html.replace(
    /\n\s*<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\n?/gi,
    '\n'
  );
  const stylesheetIndex = withoutExistingJsonLd.search(/\n\s*<link\s+rel="stylesheet"/i);

  if (stylesheetIndex === -1) {
    throw new Error(`Could not find stylesheet insertion point in demo/${fileName}`);
  }

  return `${withoutExistingJsonLd.slice(0, stylesheetIndex)}\n${formatJsonLdScript(jsonLd)}${withoutExistingJsonLd.slice(
    stylesheetIndex + 1
  )}`.replace(/\n<link\s+rel="stylesheet"/g, '\n    <link rel="stylesheet"');
}

function validateJsonLd(html, fileName) {
  const headEnd = html.indexOf('</head>');
  const matches = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];

  if (headEnd === -1) {
    throw new Error(`Missing </head> in demo/${fileName}`);
  }

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one JSON-LD block in demo/${fileName}, found ${matches.length}`);
  }

  if (matches[0].index > headEnd) {
    throw new Error(`JSON-LD block must be inside <head> in demo/${fileName}`);
  }

  JSON.parse(matches[0][1]);
}

const packageData = JSON.parse(await readFile(packagePath, 'utf8'));
const fileNames = (await readdir(demoDir)).filter((fileName) => fileName.endsWith('.html')).sort();

for (const fileName of fileNames) {
  const filePath = path.join(demoDir, fileName);
  const html = await readFile(filePath, 'utf8');
  const pageMetadata = extractPageMetadata(html, fileName);
  const jsonLd = buildJsonLd({ packageData, pageMetadata });
  const nextHtml = injectJsonLd(html, jsonLd, fileName);

  validateJsonLd(nextHtml, fileName);
  await writeFile(filePath, nextHtml);
  console.log(`Updated demo/${fileName}`);
}
