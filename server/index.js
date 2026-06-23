import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { requireAdmin, signAdmin, verifyPassword } from './auth.js';
import { pool, query, withTransaction } from './db.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const uploadsDir = path.join(rootDir, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: ['http://127.0.0.1:5173', 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, callback) => {
    const ext = path.extname(file.originalname || '');
    const base = path.basename(file.originalname || 'file', ext).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 },
});

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseLines(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSections(body) {
  if (Array.isArray(body.sections)) return body.sections;
  const text = body.sectionsText || body.content || '';
  const blocks = String(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.map((block) => {
    const [heading, ...rest] = block.split(/\r?\n/);
    return {
      heading: heading.replace(/\|$/, '').trim(),
      body: rest.join('\n').trim() || heading.trim(),
    };
  });
}

function formatCount(count) {
  const value = Number(count || 0);
  if (value >= 1000000) return `${Number((value / 1000000).toFixed(1))}M`;
  if (value >= 1000) return `${Number((value / 1000).toFixed(1))}K`;
  return String(value);
}

async function upsertCategory(client, name, type, color = '#16A34A') {
  const safeName = name || (type === 'app' ? 'Apps' : 'Blog');
  const slug = slugify(safeName);
  const { rows } = await client.query(
    `insert into categories (name, slug, type, color)
     values ($1, $2, $3, $4)
     on conflict (type, slug) do update set name = excluded.name, color = excluded.color
     returning id, name, slug, color`,
    [safeName, slug, type, color],
  );
  return rows[0];
}

async function hydrateApps(rows) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [featureResult, screenshotResult] = await Promise.all([
    query('select app_id, feature from app_features where app_id = any($1::bigint[]) order by sort_order, id', [ids]),
    query('select app_id, image_url, alt_text from app_screenshots where app_id = any($1::bigint[]) order by sort_order, id', [ids]),
  ]);

  const featuresByApp = new Map();
  for (const row of featureResult.rows) {
    const key = String(row.app_id);
    featuresByApp.set(key, [...(featuresByApp.get(key) || []), row.feature]);
  }

  const screenshotsByApp = new Map();
  for (const row of screenshotResult.rows) {
    const key = String(row.app_id);
    screenshotsByApp.set(key, [
      ...(screenshotsByApp.get(key) || []),
      {
        imageUrl: row.image_url,
        altText: row.alt_text,
      },
    ]);
  }

  return rows.map((row) => {
    const screenshotItems = screenshotsByApp.get(String(row.id)) || [];
    return {
      id: Number(row.id),
      title: row.title,
      slug: row.slug,
      section: row.section,
      category: row.category || 'Apps',
      categorySlug: row.category_slug || 'apps',
      version: row.version || 'v1.0',
      versionCode: row.version_code || '',
      size: row.file_size || '',
      androidRequirement: row.android_requirement || '',
      rating: Number(row.rating || 0),
      votes: Number(row.votes || 0),
      downloads: row.downloads_label || formatCount(row.downloads_count),
      downloadsCount: Number(row.downloads_count || 0),
      updatedAt: row.updated_at_label || 'Today',
      shortDescription: row.short_description || '',
      description: row.description || '',
      developerName: row.developer_name || '',
      packageName: row.package_name || '',
      features: featuresByApp.get(String(row.id)) || [],
      screenshots: screenshotItems.map((item) => item.imageUrl),
      screenshotItems,
      downloadUrl: row.download_url || '#',
      checksumSha256: row.checksum_sha256 || '',
      changelog: row.changelog || '',
      safetyScanStatus: row.safety_scan_status || 'Passed',
      safetyStatus: {
        signatureChecked: row.safety_signature_checked,
        virusScanCompleted: row.safety_virus_scan_completed,
        metadataVerified: row.safety_metadata_verified,
      },
      iconUrl: row.icon_url || '',
      color: row.color || '#16A34A',
      initial: row.initial || row.title.slice(0, 1).toUpperCase(),
      status: row.status,
      seoTitle: row.seo_title || '',
      seoDescription: row.seo_description || '',
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAtIso: row.updated_at,
    };
  });
}

async function getApps({ includeAll = false, section, q } = {}) {
  const clauses = [];
  const params = [];

  if (!includeAll) clauses.push("a.status = 'published'");
  if (section) {
    params.push(section);
    clauses.push(`lower(a.section) = lower($${params.length})`);
  }
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`(a.title ilike $${params.length} or a.description ilike $${params.length} or a.package_name ilike $${params.length})`);
  }

  const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
  const { rows } = await query(
    `select
      a.*,
      c.name as category,
      c.slug as category_slug,
      v.version,
      v.version_code,
      v.file_size,
      v.android_requirement,
      v.download_url,
      v.checksum_sha256,
      v.safety_scan_status,
      v.changelog
    from apps a
    left join categories c on c.id = a.category_id
    left join app_versions v on v.app_id = a.id and v.is_latest = true
    ${where}
    order by a.published_at desc nulls last, a.updated_at desc`,
    params,
  );

  return hydrateApps(rows);
}

async function getAppBySlug(slug, includeAll = false) {
  const apps = await getApps({ includeAll, q: '' });
  return apps.find((item) => item.slug === slug);
}

function normalizePost(row) {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    type: row.type,
    category: row.category || row.label || row.type,
    categorySlug: row.category_slug || slugify(row.category || row.type),
    label: row.label || row.category || row.type,
    color: row.color || '#16A34A',
    summary: row.summary || '',
    content: row.content || '',
    sections: Array.isArray(row.sections) ? row.sections : [],
    authorName: row.author_name || 'Admin',
    readTime: row.read_time || '5 min read',
    updatedAt: row.published_at ? new Date(row.published_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Draft',
    coverUrl: row.cover_url || '',
    status: row.status,
    seoTitle: row.seo_title || '',
    seoDescription: row.seo_description || '',
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

function normalizeStaticPage(row) {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    path: row.path,
    subtitle: row.subtitle || '',
    content: row.content || '',
    sections: Array.isArray(row.sections) ? row.sections : [],
    status: row.status,
    seoTitle: row.seo_title || '',
    seoDescription: row.seo_description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getPosts({ includeAll = false, type, q } = {}) {
  const clauses = [];
  const params = [];

  if (!includeAll) clauses.push("p.status = 'published'");
  if (type && type !== 'all') {
    params.push(type);
    clauses.push(`p.type = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`(p.title ilike $${params.length} or p.summary ilike $${params.length} or p.content ilike $${params.length})`);
  }

  const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
  const { rows } = await query(
    `select p.*, c.name as category, c.slug as category_slug
     from posts p
     left join categories c on c.id = p.category_id
     ${where}
     order by p.published_at desc nulls last, p.updated_at desc`,
    params,
  );
  return rows.map(normalizePost);
}

async function getPostBySlug(slug, includeAll = false) {
  const { rows } = await query(
    `select p.*, c.name as category, c.slug as category_slug
     from posts p
     left join categories c on c.id = p.category_id
     where p.slug = $1 ${includeAll ? '' : "and p.status = 'published'"}
     limit 1`,
    [slug],
  );
  return rows[0] ? normalizePost(rows[0]) : null;
}

async function getStaticPages({ includeAll = false } = {}) {
  const { rows } = await query(
    `select *
     from static_pages
     ${includeAll ? '' : "where status = 'published'"}
     order by id`,
  );
  return rows.map(normalizeStaticPage);
}

async function getStaticPageBySlug(slug, includeAll = false) {
  const { rows } = await query(
    `select *
     from static_pages
     where slug = $1 ${includeAll ? '' : "and status = 'published'"}
     limit 1`,
    [slug],
  );
  return rows[0] ? normalizeStaticPage(rows[0]) : null;
}

async function saveApp(body, admin, id) {
  const saved = await withTransaction(async (client) => {
    const slug = slugify(body.slug || body.title);
    const category = await upsertCategory(client, body.category || 'Apps', 'app', body.color || '#16A34A');
    const values = [
      body.title,
      slug,
      body.section || 'Apps',
      category.id,
      body.shortDescription || '',
      body.description || '',
      body.developerName || '',
      body.packageName || '',
      body.iconUrl || '',
      body.color || '#16A34A',
      body.initial || String(body.title || 'A').slice(0, 1).toUpperCase(),
      Number(body.rating || 0),
      Number(body.votes || 0),
      Number(body.downloadsCount || 0),
      body.downloads || formatCount(body.downloadsCount),
      body.updatedAt || 'Today',
      body.status || 'draft',
      body.seoTitle || '',
      body.seoDescription || '',
      Boolean(body.safetySignatureChecked ?? true),
      Boolean(body.safetyVirusScanCompleted ?? true),
      Boolean(body.safetyMetadataVerified ?? true),
    ];

    let appRow;
    if (id) {
      const { rows } = await client.query(
        `update apps set
          title = $1, slug = $2, section = $3, category_id = $4, short_description = $5,
          description = $6, developer_name = $7, package_name = $8, icon_url = $9,
          color = $10, initial = $11, rating = $12, votes = $13, downloads_count = $14,
          downloads_label = $15, updated_at_label = $16, status = $17, seo_title = $18,
          seo_description = $19, safety_signature_checked = $20, safety_virus_scan_completed = $21,
          safety_metadata_verified = $22, published_at = case when $17 = 'published' and published_at is null then now() else published_at end,
          updated_at = now()
         where id = $23
         returning id`,
        [...values, id],
      );
      appRow = rows[0];
    } else {
      const { rows } = await client.query(
        `insert into apps (
          title, slug, section, category_id, short_description, description, developer_name,
          package_name, icon_url, color, initial, rating, votes, downloads_count, downloads_label,
          updated_at_label, status, seo_title, seo_description, safety_signature_checked,
          safety_virus_scan_completed, safety_metadata_verified, published_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22, case when $17 = 'published' then now() else null end)
        returning id`,
        values,
      );
      appRow = rows[0];
    }

    if (!appRow) throw new Error('App not found');
    const appId = appRow.id;

    const latestVersion = await client.query('select id from app_versions where app_id = $1 and is_latest = true limit 1', [appId]);
    const versionValues = [
      body.version || 'v1.0',
      body.versionCode || '',
      body.size || '',
      body.androidRequirement || '',
      body.downloadUrl || '',
      body.checksumSha256 || '',
      body.safetyScanStatus || 'Passed',
      body.changelog || '',
    ];
    if (latestVersion.rows[0]) {
      await client.query(
        `update app_versions set version = $1, version_code = $2, file_size = $3,
         android_requirement = $4, download_url = $5, checksum_sha256 = $6,
         safety_scan_status = $7, changelog = $8
         where id = $9`,
        [...versionValues, latestVersion.rows[0].id],
      );
    } else {
      await client.query(
        `insert into app_versions (
          app_id, version, version_code, file_size, android_requirement, download_url,
          checksum_sha256, safety_scan_status, changelog, is_latest
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
        [appId, ...versionValues],
      );
    }

    await client.query('delete from app_features where app_id = $1', [appId]);
    for (const [index, feature] of parseLines(body.featuresText || body.features).entries()) {
      await client.query('insert into app_features (app_id, feature, sort_order) values ($1,$2,$3)', [appId, feature, index]);
    }

    await client.query('delete from app_screenshots where app_id = $1', [appId]);
    for (const [index, imageUrl] of parseLines(body.screenshotsText || body.screenshots).entries()) {
      await client.query('insert into app_screenshots (app_id, image_url, alt_text, sort_order) values ($1,$2,$3,$4)', [
        appId,
        imageUrl,
        `${body.title} screenshot ${index + 1}`,
        index,
      ]);
    }

    await client.query('insert into audit_logs (admin_id, action, entity_type, entity_id) values ($1,$2,$3,$4)', [
      admin.id,
      id ? 'update' : 'create',
      'app',
      String(appId),
    ]);

    return { id: appId, slug };
  });
  return getAppBySlug(saved.slug, true);
}

async function savePost(body, admin, id) {
  const saved = await withTransaction(async (client) => {
    const slug = slugify(body.slug || body.title);
    const type = body.type === 'news' ? 'news' : 'blog';
    const category = await upsertCategory(client, body.category || (type === 'news' ? 'News' : 'Blog'), 'post', body.color || '#16A34A');
    const sections = parseSections(body);
    const values = [
      body.title,
      slug,
      type,
      category.id,
      body.label || body.category || type,
      body.color || '#16A34A',
      body.summary || '',
      body.content || sections.map((section) => `${section.heading}\n${section.body}`).join('\n\n'),
      JSON.stringify(sections),
      body.authorName || 'Admin',
      body.readTime || '5 min read',
      body.coverUrl || '',
      body.status || 'draft',
      body.seoTitle || '',
      body.seoDescription || '',
    ];

    let postId;
    if (id) {
      const { rows } = await client.query(
        `update posts set
          title = $1, slug = $2, type = $3, category_id = $4, label = $5, color = $6,
          summary = $7, content = $8, sections = $9::jsonb, author_name = $10,
          read_time = $11, cover_url = $12, status = $13, seo_title = $14,
          seo_description = $15, published_at = case when $13 = 'published' and published_at is null then now() else published_at end,
          updated_at = now()
         where id = $16
         returning id`,
        [...values, id],
      );
      postId = rows[0]?.id;
    } else {
      const { rows } = await client.query(
        `insert into posts (
          title, slug, type, category_id, label, color, summary, content, sections,
          author_name, read_time, cover_url, status, seo_title, seo_description, published_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15, case when $13 = 'published' then now() else null end)
        returning id`,
        values,
      );
      postId = rows[0].id;
    }

    if (!postId) throw new Error('Post not found');
    await client.query('insert into audit_logs (admin_id, action, entity_type, entity_id) values ($1,$2,$3,$4)', [
      admin.id,
      id ? 'update' : 'create',
      type,
      String(postId),
    ]);

    return { id: postId, slug };
  });
  return getPostBySlug(saved.slug, true);
}

async function saveStaticPage(body, admin, id) {
  const slug = slugify(body.slug || body.title);
  const pathValue = body.path || `/${slug}/`;
  const normalizedPath = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
  const finalPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
  const sections = parseSections(body);
  const values = [
    body.title,
    slug,
    finalPath,
    body.subtitle || '',
    body.content || sections.map((section) => `${section.heading}\n${section.body}`).join('\n\n'),
    JSON.stringify(sections),
    body.status || 'published',
    body.seoTitle || '',
    body.seoDescription || '',
  ];

  const saved = await withTransaction(async (client) => {
    let pageId;
    if (id) {
      const { rows } = await client.query(
        `update static_pages set
          title = $1,
          slug = $2,
          path = $3,
          subtitle = $4,
          content = $5,
          sections = $6::jsonb,
          status = $7,
          seo_title = $8,
          seo_description = $9,
          updated_at = now()
         where id = $10
         returning id`,
        [...values, id],
      );
      pageId = rows[0]?.id;
    } else {
      const { rows } = await client.query(
        `insert into static_pages (
          title, slug, path, subtitle, content, sections, status, seo_title, seo_description
        )
        values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
        returning id`,
        values,
      );
      pageId = rows[0].id;
    }

    if (!pageId) throw new Error('Static page not found');
    await client.query('insert into audit_logs (admin_id, action, entity_type, entity_id) values ($1,$2,$3,$4)', [
      admin.id,
      id ? 'update' : 'create',
      'static_page',
      String(pageId),
    ]);
    return { slug };
  });

  return getStaticPageBySlug(saved.slug, true);
}

app.get('/api/health', async (req, res) => {
  const { rows } = await query('select now() as now');
  res.json({ ok: true, databaseTime: rows[0].now });
});

app.get('/api/apps', async (req, res, next) => {
  try {
    const apps = await getApps({ section: req.query.section, q: req.query.q });
    res.json({ apps });
  } catch (error) {
    next(error);
  }
});

app.get('/api/apps/:slug', async (req, res, next) => {
  try {
    const appItem = await getAppBySlug(req.params.slug);
    if (!appItem) return res.status(404).json({ error: 'App not found' });
    return res.json({ app: appItem });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/posts', async (req, res, next) => {
  try {
    const posts = await getPosts({ type: req.query.type || 'all', q: req.query.q });
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/:slug', async (req, res, next) => {
  try {
    const post = await getPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/static-pages', async (req, res, next) => {
  try {
    const pages = await getStaticPages();
    res.json({ pages });
  } catch (error) {
    next(error);
  }
});

app.get('/api/static-pages/:slug', async (req, res, next) => {
  try {
    const page = await getStaticPageBySlug(req.params.slug);
    if (!page) return res.status(404).json({ error: 'Static page not found' });
    return res.json({ page });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/contact', async (req, res, next) => {
  try {
    const { name, fullName, email, subject, message } = req.body;
    await query('insert into contact_messages (full_name, email, subject, message) values ($1,$2,$3,$4)', [
      fullName || name || '',
      email || '',
      subject || '',
      message || '',
    ]);
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reports', async (req, res, next) => {
  try {
    const appItem = req.body.appSlug ? await getAppBySlug(req.body.appSlug, true) : null;
    await query('insert into app_reports (app_id, app_slug, reason, message, reporter_email) values ($1,$2,$3,$4,$5)', [
      appItem?.id || null,
      req.body.appSlug || '',
      req.body.reason || 'Wrong info',
      req.body.message || '',
      req.body.email || '',
    ]);
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query('select id, name, email, role, password_hash from admin_users where email = $1', [email]);
    const user = rows[0];
    if (!user || !(await verifyPassword(password || '', user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signAdmin(user);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ user: req.admin });
});

app.get('/api/admin/stats', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      `select
        (select count(*) from apps) as apps,
        (select count(*) from apps where status = 'published') as published_apps,
        (select count(*) from posts where type = 'blog') as blogs,
        (select count(*) from posts where type = 'news') as news,
        (select count(*) from static_pages) as static_pages,
        (select count(*) from app_reports where status = 'open') as open_reports,
        (select count(*) from contact_messages where status = 'new') as new_messages`,
    );
    res.json({ stats: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/apps', requireAdmin, async (req, res, next) => {
  try {
    const apps = await getApps({ includeAll: true, section: req.query.section, q: req.query.q });
    res.json({ apps });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/apps', requireAdmin, async (req, res, next) => {
  try {
    const appItem = await saveApp(req.body, req.admin);
    res.status(201).json({ app: appItem });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/apps/:id', requireAdmin, async (req, res, next) => {
  try {
    const appItem = await saveApp(req.body, req.admin, req.params.id);
    res.json({ app: appItem });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/apps/:id', requireAdmin, async (req, res, next) => {
  try {
    await query('delete from apps where id = $1', [req.params.id]);
    await query('insert into audit_logs (admin_id, action, entity_type, entity_id) values ($1,$2,$3,$4)', [
      req.admin.id,
      'delete',
      'app',
      String(req.params.id),
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/posts', requireAdmin, async (req, res, next) => {
  try {
    const posts = await getPosts({ includeAll: true, type: req.query.type || 'all', q: req.query.q });
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/posts', requireAdmin, async (req, res, next) => {
  try {
    const post = await savePost(req.body, req.admin);
    res.status(201).json({ post });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/posts/:id', requireAdmin, async (req, res, next) => {
  try {
    const post = await savePost(req.body, req.admin, req.params.id);
    res.json({ post });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/posts/:id', requireAdmin, async (req, res, next) => {
  try {
    await query('delete from posts where id = $1', [req.params.id]);
    await query('insert into audit_logs (admin_id, action, entity_type, entity_id) values ($1,$2,$3,$4)', [
      req.admin.id,
      'delete',
      'post',
      String(req.params.id),
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/static-pages', requireAdmin, async (req, res, next) => {
  try {
    const pages = await getStaticPages({ includeAll: true });
    res.json({ pages });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/static-pages', requireAdmin, async (req, res, next) => {
  try {
    const page = await saveStaticPage(req.body, req.admin);
    res.status(201).json({ page });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/static-pages/:id', requireAdmin, async (req, res, next) => {
  try {
    const page = await saveStaticPage(req.body, req.admin, req.params.id);
    res.json({ page });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/categories', requireAdmin, async (req, res, next) => {
  try {
    const params = [];
    const where = req.query.type ? 'where type = $1' : '';
    if (req.query.type) params.push(req.query.type);
    const { rows } = await query(`select * from categories ${where} order by type, name`, params);
    res.json({ categories: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/categories', requireAdmin, async (req, res, next) => {
  try {
    const category = await withTransaction((client) =>
      upsertCategory(client, req.body.name, req.body.type === 'post' ? 'post' : 'app', req.body.color || '#16A34A'),
    );
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/reports', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      `select r.*, a.title as app_title
       from app_reports r
       left join apps a on a.id = r.app_id
       order by r.created_at desc
       limit 100`,
    );
    res.json({ reports: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/messages', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query('select * from contact_messages order by created_at desc limit 100');
    res.json({ messages: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/upload', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const publicUrl = `/uploads/${req.file.filename}`;
    const { rows } = await query(
      `insert into media_files (file_name, original_name, mime_type, file_size, public_url, uploaded_by)
       values ($1,$2,$3,$4,$5,$6)
       returning *`,
      [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, publicUrl, req.admin.id],
    );
    return res.status(201).json({ file: rows[0] });
  } catch (error) {
    return next(error);
  }
});

const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Server error' });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`AppVault API running at http://127.0.0.1:${port}`);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
