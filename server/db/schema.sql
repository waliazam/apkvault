create table if not exists categories (
  id bigserial primary key,
  name text not null,
  slug text not null,
  type text not null check (type in ('app', 'post')),
  color text not null default '#16A34A',
  created_at timestamptz not null default now(),
  unique (type, slug)
);

create table if not exists apps (
  id bigserial primary key,
  title text not null,
  slug text not null unique,
  section text not null default 'Apps',
  category_id bigint references categories(id) on delete set null,
  short_description text not null default '',
  description text not null default '',
  developer_name text not null default '',
  package_name text not null default '',
  icon_url text not null default '',
  color text not null default '#16A34A',
  initial text not null default 'A',
  rating numeric(3, 2) not null default 0,
  votes integer not null default 0,
  downloads_count integer not null default 0,
  downloads_label text not null default '0',
  updated_at_label text not null default 'Today',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  seo_title text not null default '',
  seo_description text not null default '',
  safety_signature_checked boolean not null default true,
  safety_virus_scan_completed boolean not null default true,
  safety_metadata_verified boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_versions (
  id bigserial primary key,
  app_id bigint not null references apps(id) on delete cascade,
  version text not null,
  version_code text not null default '',
  file_size text not null default '',
  android_requirement text not null default '',
  download_url text not null default '',
  checksum_sha256 text not null default '',
  safety_scan_status text not null default 'Passed',
  changelog text not null default '',
  is_latest boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists app_versions_one_latest_idx on app_versions(app_id) where is_latest;

create table if not exists app_features (
  id bigserial primary key,
  app_id bigint not null references apps(id) on delete cascade,
  feature text not null,
  sort_order integer not null default 0
);

create table if not exists app_screenshots (
  id bigserial primary key,
  app_id bigint not null references apps(id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0
);

create table if not exists app_tags (
  id bigserial primary key,
  app_id bigint not null references apps(id) on delete cascade,
  tag text not null,
  unique (app_id, tag)
);

create table if not exists posts (
  id bigserial primary key,
  title text not null,
  slug text not null unique,
  type text not null default 'blog' check (type in ('blog', 'news')),
  category_id bigint references categories(id) on delete set null,
  label text not null default '',
  color text not null default '#16A34A',
  summary text not null default '',
  content text not null default '',
  sections jsonb not null default '[]'::jsonb,
  author_name text not null default 'Admin',
  read_time text not null default '5 min read',
  cover_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  seo_title text not null default '',
  seo_description text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists post_tags (
  id bigserial primary key,
  post_id bigint not null references posts(id) on delete cascade,
  tag text not null,
  unique (post_id, tag)
);

create table if not exists static_pages (
  id bigserial primary key,
  title text not null,
  slug text not null unique,
  path text not null unique,
  subtitle text not null default '',
  content text not null default '',
  sections jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  seo_title text not null default '',
  seo_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_reports (
  id bigserial primary key,
  app_id bigint references apps(id) on delete set null,
  app_slug text not null default '',
  reason text not null,
  message text not null default '',
  reporter_email text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id bigserial primary key,
  full_name text not null default '',
  email text not null default '',
  subject text not null default '',
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'read', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists admin_users (
  id bigserial primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists media_files (
  id bigserial primary key,
  file_name text not null,
  original_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  public_url text not null,
  uploaded_by bigint references admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigserial primary key,
  admin_id bigint references admin_users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists apps_status_idx on apps(status);
create index if not exists apps_section_idx on apps(section);
create index if not exists apps_category_idx on apps(category_id);
create index if not exists apps_title_search_idx on apps using gin (to_tsvector('english', title || ' ' || short_description || ' ' || description || ' ' || package_name));
create index if not exists posts_status_idx on posts(status);
create index if not exists posts_type_idx on posts(type);
create index if not exists posts_title_search_idx on posts using gin (to_tsvector('english', title || ' ' || summary || ' ' || content));

insert into static_pages (title, slug, path, subtitle, sections, seo_title, seo_description)
values
  (
    'About AppVault',
    'about-us',
    '/about-us/',
    'A clean APK directory template for app metadata, guide content, and safe download flows.',
    '[
      {"heading":"1. Purpose","body":"AppVault is a placeholder brand for an APK directory website focused on transparent app information and legal download links."},
      {"heading":"2. Content Standards","body":"Listings should only include apps you own, have permission to distribute, or can legally link to."},
      {"heading":"3. User Safety","body":"Every detail page highlights version metadata, Android requirements, safety checks, and report options."},
      {"heading":"4. Contact","body":"Use the contact page for app update requests, listing issues, copyright concerns, or business inquiries."}
    ]'::jsonb,
    'About AppVault',
    'Learn about AppVault, a safe APK directory theme for verified metadata, legal links, and Android guides.'
  ),
  (
    'Privacy Policy / DMCA Template',
    'privacy-policy',
    '/privacy-policy/',
    'A clean static page template for Privacy Policy, DMCA Policy, Disclaimer, Terms, and About Us pages.',
    '[
      {"heading":"1. Introduction","body":"Explain what your website does, what type of information you provide, and the legal limits of the content."},
      {"heading":"2. Information We Collect","body":"Mention contact form data, analytics, cookies, and ad network cookies if you use AdSense or similar networks."},
      {"heading":"3. APK Content Disclaimer","body":"Clearly state that app names, logos and trademarks belong to their respective owners and that you only share authorized or informational listings."},
      {"heading":"4. DMCA / Copyright Requests","body":"Provide a clear process for copyright owners to request removal of content or links."},
      {"heading":"5. Contact Information","body":"Add your email address and expected response time."}
    ]'::jsonb,
    'Privacy Policy',
    'Read the AppVault privacy policy, APK content disclaimer, and contact information.'
  ),
  (
    'DMCA Policy',
    'dmca-policy',
    '/dmca-policy/',
    'Use this page to explain how rights holders can request review or removal of content and links.',
    '[
      {"heading":"1. Copyright Requests","body":"Rights holders may contact the site owner with the app name, URL, ownership details, and requested action."},
      {"heading":"2. Review Process","body":"Valid requests should be reviewed promptly and listings should be updated, hidden, or corrected when required."},
      {"heading":"3. Good Faith Notice","body":"Include a good faith statement and contact method for follow-up."}
    ]'::jsonb,
    'DMCA Policy',
    'Submit copyright or DMCA requests for app listings and APK-related content on AppVault.'
  ),
  (
    'Disclaimer',
    'disclaimer',
    '/disclaimer/',
    'Use this template to set expectations for third-party names, trademarks, links, and user responsibility.',
    '[
      {"heading":"1. Informational Listings","body":"AppVault is a placeholder directory theme. App names and trademarks belong to their respective owners."},
      {"heading":"2. No Piracy","body":"Avoid cracked apps, paid-app piracy, unauthorized MOD APKs, malware, or deceptive earning apps."},
      {"heading":"3. Safe Downloads","body":"Only download apps from trusted sources and verify package information before installing."}
    ]'::jsonb,
    'Disclaimer',
    'Read the AppVault disclaimer for third-party app names, trademarks, links, and user responsibility.'
  ),
  (
    'Terms',
    'terms',
    '/terms/',
    'A lightweight terms page for acceptable use, content limits, and directory policies.',
    '[
      {"heading":"1. Acceptable Use","body":"Visitors should use the website legally and avoid attempting to abuse forms, listings, or download links."},
      {"heading":"2. Listing Accuracy","body":"Metadata can change over time. Users should verify version and developer details before installing apps."},
      {"heading":"3. Updates","body":"The site owner may update these terms as the directory grows."}
    ]'::jsonb,
    'Terms',
    'Review AppVault terms for acceptable use, listing accuracy, and directory policies.'
  )
on conflict (slug) do nothing;
