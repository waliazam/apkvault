import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hashPassword } from '../auth.js';
import { pool, withTransaction } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseDownloads(value) {
  const raw = String(value || '0').trim().toUpperCase();
  const number = Number.parseFloat(raw);
  if (Number.isNaN(number)) return 0;
  if (raw.endsWith('M')) return Math.round(number * 1000000);
  if (raw.endsWith('K')) return Math.round(number * 1000);
  return Math.round(number);
}

async function readJson(relativePath) {
  const text = await fs.readFile(join(rootDir, relativePath), 'utf8');
  return JSON.parse(text);
}

async function upsertCategory(client, name, type, color = '#16A34A') {
  const slug = slugify(name);
  const { rows } = await client.query(
    `insert into categories (name, slug, type, color)
     values ($1, $2, $3, $4)
     on conflict (type, slug) do update set name = excluded.name, color = excluded.color
     returning id`,
    [name, slug, type, color],
  );
  return rows[0].id;
}

async function seedApps(client, apps) {
  for (const app of apps) {
    const categoryId = await upsertCategory(client, app.category, 'app', app.color);
    const { rows } = await client.query(
      `insert into apps (
        title, slug, section, category_id, short_description, description, developer_name,
        package_name, icon_url, color, initial, rating, votes, downloads_count,
        downloads_label, updated_at_label, status, seo_title, seo_description, published_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'published', $17, $18, now())
      on conflict (slug) do update set
        title = excluded.title,
        section = excluded.section,
        category_id = excluded.category_id,
        short_description = excluded.short_description,
        description = excluded.description,
        color = excluded.color,
        initial = excluded.initial,
        rating = excluded.rating,
        votes = excluded.votes,
        downloads_count = excluded.downloads_count,
        downloads_label = excluded.downloads_label,
        updated_at_label = excluded.updated_at_label,
        status = 'published',
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        updated_at = now()
      returning id`,
      [
        app.title,
        app.slug,
        app.section,
        categoryId,
        app.description.slice(0, 160),
        app.description,
        app.developerName || 'Sample Developer',
        app.packageName || `com.appvault.${app.slug.replaceAll('-', '')}`,
        app.iconUrl || '',
        app.color,
        app.initial,
        app.rating,
        app.votes,
        parseDownloads(app.downloads),
        app.downloads,
        app.updatedAt,
        `${app.title} APK`,
        `${app.title} APK download page with version, file size, screenshots, safety status, and installation notes.`,
      ],
    );

    const appId = rows[0].id;
    await client.query('update app_versions set is_latest = false where app_id = $1', [appId]);
    await client.query(
      `insert into app_versions (
        app_id, version, version_code, file_size, android_requirement, download_url,
        checksum_sha256, safety_scan_status, changelog, is_latest
      )
      values ($1, $2, $3, $4, $5, $6, $7, 'Passed', $8, true)
      on conflict (app_id) where is_latest do update set
        version = excluded.version,
        version_code = excluded.version_code,
        file_size = excluded.file_size,
        android_requirement = excluded.android_requirement,
        download_url = excluded.download_url,
        checksum_sha256 = excluded.checksum_sha256,
        safety_scan_status = excluded.safety_scan_status,
        changelog = excluded.changelog`,
      [
        appId,
        app.version,
        app.versionCode || app.version.replace(/^v/i, ''),
        app.size,
        app.androidRequirement,
        app.downloadUrl,
        app.checksumSha256 || '',
        'Initial verified listing imported from the AppVault design prototype.',
      ],
    );

    await client.query('delete from app_features where app_id = $1', [appId]);
    for (const [index, feature] of (app.features || []).entries()) {
      await client.query('insert into app_features (app_id, feature, sort_order) values ($1, $2, $3)', [appId, feature, index]);
    }

    await client.query('delete from app_screenshots where app_id = $1', [appId]);
    for (const [index, imageUrl] of (app.screenshots || []).entries()) {
      await client.query('insert into app_screenshots (app_id, image_url, alt_text, sort_order) values ($1, $2, $3, $4)', [
        appId,
        imageUrl,
        `${app.title} screenshot ${index + 1}`,
        index,
      ]);
    }
  }
}

async function seedPosts(client, posts) {
  const extraNews = [
    {
      title: 'AppVault Launches Dynamic APK Directory',
      slug: 'appvault-launches-dynamic-apk-directory',
      type: 'news',
      category: 'News',
      label: 'News',
      color: '#0EA5E9',
      summary: 'The AppVault prototype now supports dynamic app, news, and blog publishing.',
      readTime: '2 min read',
      updatedAt: 'June 2026',
      sections: [
        {
          heading: 'What Changed',
          body: 'AppVault now includes a PostgreSQL database, API layer, and admin publishing workflow for live content.',
        },
      ],
    },
  ];

  for (const post of [...posts.map((item) => ({ ...item, type: 'blog' })), ...extraNews]) {
    const categoryId = await upsertCategory(client, post.category || post.label || post.type, 'post', post.color);
    await client.query(
      `insert into posts (
        title, slug, type, category_id, label, color, summary, content, sections,
        author_name, read_time, status, seo_title, seo_description, published_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'Admin', $10, 'published', $11, $12, now())
      on conflict (slug) do update set
        title = excluded.title,
        type = excluded.type,
        category_id = excluded.category_id,
        label = excluded.label,
        color = excluded.color,
        summary = excluded.summary,
        content = excluded.content,
        sections = excluded.sections,
        read_time = excluded.read_time,
        status = 'published',
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        updated_at = now()`,
      [
        post.title,
        post.slug,
        post.type,
        categoryId,
        post.label || post.category || post.type,
        post.color,
        post.summary,
        (post.sections || []).map((section) => `${section.heading}\n${section.body}`).join('\n\n'),
        JSON.stringify(post.sections || []),
        post.readTime || '5 min read',
        post.title,
        post.summary,
      ],
    );
  }
}

async function seedAdmin(client) {
  const email = process.env.ADMIN_EMAIL || 'admin@appvault.local';
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  const passwordHash = await hashPassword(password);

  await client.query(
    `insert into admin_users (name, email, password_hash, role)
     values ('AppVault Admin', $1, $2, 'admin')
     on conflict (email) do update set password_hash = excluded.password_hash`,
    [email, passwordHash],
  );
}

try {
  const apps = await readJson('src/data/apps.json');
  const posts = await readJson('src/data/posts.json');

  await withTransaction(async (client) => {
    await seedApps(client, apps);
    await seedPosts(client, posts);
    await seedAdmin(client);
  });

  console.log('Database seed completed.');
  console.log(`Admin login: ${process.env.ADMIN_EMAIL || 'admin@appvault.local'}`);
  console.log(`Admin password: ${process.env.ADMIN_PASSWORD || 'admin12345'}`);
} catch (error) {
  console.error('Database seed failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
