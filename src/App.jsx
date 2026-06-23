import { useEffect, useState } from 'react';
import {
  AdSlot,
  AppCard,
  AppIcon,
  AppListItem,
  ArticleBody,
  Breadcrumb,
  CategoryChip,
  ContactForm,
  DownloadButton,
  EmptyState,
  Footer,
  Header,
  MetadataGrid,
  Pagination,
  RatingBadge,
  SafetyStatus,
  SearchBar,
  Sidebar,
} from './components.jsx';
import { Flag } from 'lucide-react';
import { fetchPublicData } from './api.js';
import { AdminApp } from './admin.jsx';
import fallbackApps from './data/apps.json';
import fallbackPosts from './data/posts.json';

const fallbackStaticPages = {
  '/about-us/': {
    title: 'About AppVault',
    subtitle: 'A clean APK directory template for app metadata, guide content, and safe download flows.',
    sections: [
      ['1. Purpose', 'AppVault is a placeholder brand for an APK directory website focused on transparent app information and legal download links.'],
      ['2. Content Standards', 'Listings should only include apps you own, have permission to distribute, or can legally link to.'],
      ['3. User Safety', 'Every detail page highlights version metadata, Android requirements, safety checks, and report options.'],
      ['4. Contact', 'Use the contact page for app update requests, listing issues, copyright concerns, or business inquiries.'],
    ],
  },
  '/privacy-policy/': {
    title: 'Privacy Policy / DMCA Template',
    subtitle: 'A clean static page template for Privacy Policy, DMCA Policy, Disclaimer, Terms, and About Us pages.',
    sections: [
      ['1. Introduction', 'Explain what your website does, what type of information you provide, and the legal limits of the content.'],
      ['2. Information We Collect', 'Mention contact form data, analytics, cookies, and ad network cookies if you use AdSense or similar networks.'],
      ['3. APK Content Disclaimer', 'Clearly state that app names, logos and trademarks belong to their respective owners and that you only share authorized or informational listings.'],
      ['4. DMCA / Copyright Requests', 'Provide a clear process for copyright owners to request removal of content or links.'],
      ['5. Contact Information', 'Add your email address and expected response time.'],
    ],
  },
  '/dmca-policy/': {
    title: 'DMCA Policy',
    subtitle: 'Use this page to explain how rights holders can request review or removal of content and links.',
    sections: [
      ['1. Copyright Requests', 'Rights holders may contact the site owner with the app name, URL, ownership details, and requested action.'],
      ['2. Review Process', 'Valid requests should be reviewed promptly and listings should be updated, hidden, or corrected when required.'],
      ['3. Good Faith Notice', 'Include a good faith statement and contact method for follow-up.'],
    ],
  },
  '/disclaimer/': {
    title: 'Disclaimer',
    subtitle: 'Use this template to set expectations for third-party names, trademarks, links, and user responsibility.',
    sections: [
      ['1. Informational Listings', 'AppVault is a placeholder directory theme. App names and trademarks belong to their respective owners.'],
      ['2. No Piracy', 'Avoid cracked apps, paid-app piracy, unauthorized MOD APKs, malware, or deceptive earning apps.'],
      ['3. Safe Downloads', 'Only download apps from trusted sources and verify package information before installing.'],
    ],
  },
  '/terms/': {
    title: 'Terms',
    subtitle: 'A lightweight terms page for acceptable use, content limits, and directory policies.',
    sections: [
      ['1. Acceptable Use', 'Visitors should use the website legally and avoid attempting to abuse forms, listings, or download links.'],
      ['2. Listing Accuracy', 'Metadata can change over time. Users should verify version and developer details before installing apps.'],
      ['3. Updates', 'The site owner may update these terms as the directory grows.'],
    ],
  },
};

export default function App() {
  const path = normalizePath(window.location.pathname);
  const isAdmin = path.startsWith('/admin');
  const [siteData, setSiteData] = useState({
    apps: fallbackApps,
    posts: fallbackPosts.map((post) => ({ ...post, type: 'blog' })),
    staticPages: fallbackStaticPages,
    loading: true,
  });

  useEffect(() => {
    if (isAdmin) return;
    let alive = true;
    fetchPublicData()
      .then((data) => {
        if (alive && data.apps.length) {
          setSiteData({ ...data, loading: false });
        }
      })
      .catch(() => {
        if (alive) setSiteData((current) => ({ ...current, loading: false }));
      });
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  if (isAdmin) {
    return <AdminApp />;
  }

  const page = resolvePage(path, siteData);

  return (
    <>
      <Header path={path} />
      <main>{page}</main>
      <Footer />
    </>
  );
}

function normalizePath(path) {
  if (path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

function resolvePage(path, siteData) {
  if (path === '/') return <HomePage apps={siteData.apps} />;
  if (path.startsWith('/category/')) return <CategoryPage section={sectionFromPath(path)} apps={siteData.apps} />;
  if (path === '/search/') return <SearchPage apps={siteData.apps} />;
  if (path.startsWith('/app/')) return <AppDetailPage slug={path.split('/')[2]} apps={siteData.apps} />;
  if (path.startsWith('/download/')) return <DownloadPage slug={path.split('/')[2]} apps={siteData.apps} />;
  if (path === '/blog/') return <BlogListPage posts={siteData.posts} type="blog" />;
  if (path.startsWith('/blog/')) return <BlogDetailPage slug={path.split('/')[2]} posts={siteData.posts} type="blog" apps={siteData.apps} />;
  if (path === '/news/') return <BlogListPage posts={siteData.posts} type="news" />;
  if (path.startsWith('/news/')) return <BlogDetailPage slug={path.split('/')[2]} posts={siteData.posts} type="news" apps={siteData.apps} />;
  if (path === '/contact-us/') return <ContactPage />;
  if (siteData.staticPages[path] || fallbackStaticPages[path]) {
    return <StaticPage page={siteData.staticPages[path] || fallbackStaticPages[path]} apps={siteData.apps} />;
  }
  return <NotFoundPage />;
}

function useMeta(title, description) {
  useEffect(() => {
    document.title = `${title} | AppVault`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
  }, [title, description]);
}

function sectionFromPath(path) {
  const slug = path.split('/')[2] || 'apps';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function HomePage({ apps }) {
  useMeta('Safe APK Directory', 'Download safe Android app information, browse categories, and read installation guides on AppVault.');
  const latest = apps.slice(0, 6);
  const mostViewed = apps.slice(0, 5);
  const featured = apps[0];

  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <h1>Download Safe Android Apps & Games</h1>
          <p>Discover verified APK files, latest versions, app information, guides, and fast download pages in a clean modern directory.</p>
          <SearchBar compact placeholder='Search “VPN”, “photo editor”, “game”...' />
        </div>
        <article className="featured-app" aria-label="Featured app">
          <AppIcon app={featured} size="xl" />
          <span className="feature-label">Featured App</span>
          <h2>{featured.title}</h2>
          <p>
            {featured.category} • {featured.version} • {featured.size}
          </p>
          <div>
            <RatingBadge rating={featured.rating} /> <strong>• {featured.downloads} downloads</strong>
          </div>
          <DownloadButton app={featured}>Download Latest APK</DownloadButton>
        </article>
      </section>

      <section className="container category-row">
        <div>
          <h2>Browse by Category</h2>
          <div className="chip-row">
            <CategoryChip label="All Apps" href="/category/apps/" />
            <CategoryChip label="Games" color="#0EA5E9" />
            <CategoryChip label="Tools" color="#7C3AED" />
            <CategoryChip label="Education" href="/category/apps/" color="#F59E0B" />
            <CategoryChip label="Entertainment" href="/category/apps/" color="#EF4444" />
          </div>
        </div>
        <AdSlot label="Ad 468 × 90" className="ad-wide" />
      </section>

      <div className="container content-grid">
        <div className="primary-column">
          <section className="section-block">
            <h2>Latest Apps</h2>
            <p className="section-subtitle">Freshly updated APK files with version, size and requirements.</p>
            <div className="app-card-grid">
              {latest.map((app) => (
                <AppCard key={app.slug} app={app} />
              ))}
            </div>
          </section>

          <section className="section-block">
            <h2>Most Viewed Apps</h2>
            <div className="stack-list">
              {mostViewed.map((app) => (
                <AppListItem key={app.slug} app={app} />
              ))}
            </div>
          </section>
        </div>
        <div className="secondary-column">
          <Sidebar apps={apps} includeGuides />
        </div>
      </div>
    </>
  );
}

function CategoryPage({ section, apps }) {
  const normalizedSection = ['Apps', 'Games', 'Tools'].includes(section) ? section : 'Apps';
  useMeta(`${normalizedSection} APKs`, `Browse ${normalizedSection.toLowerCase()} listings with filters, metadata, ratings, and safe download pages.`);
  const filtered = apps.filter((app) => app.section === normalizedSection || (normalizedSection === 'Apps' && app.section === 'Apps'));

  return (
    <section className="container page-space">
      <div className="listing-hero">
        <div>
          <h1>{normalizedSection}</h1>
          <p>A searchable category page for Android applications. Users can filter by rating, update date, app type, and Android requirement.</p>
        </div>
        <a className="submit-apk" href="/contact-us/">
          Submit APK
        </a>
      </div>
      <div className="filter-row" aria-label="Listing filters">
        <span>Sort: Latest</span>
        <span>Rating: 4.0+</span>
        <span>Size: Under 100 MB</span>
        <span>Android 5.0+</span>
      </div>
      <div className="content-grid">
        <div className="primary-column">
          <div className="stack-list">
            {filtered.map((app) => (
              <AppListItem key={app.slug} app={app} />
            ))}
          </div>
          <Pagination />
        </div>
        <div className="secondary-column">
          <AdSlot label="Ad 320 × 70" className="ad-short" />
          <Sidebar apps={apps} />
          <AdSlot />
        </div>
      </div>
    </section>
  );
}

function SearchPage({ apps }) {
  const query = new URLSearchParams(window.location.search).get('q')?.trim() || '';
  useMeta(query ? `Search results for ${query}` : 'Search', 'Search APK and Android app listings on AppVault.');
  const results = apps.filter((app) => {
    const haystack = `${app.title} ${app.category} ${app.section} ${app.version}`.toLowerCase();
    return !query || haystack.includes(query.toLowerCase());
  });

  return (
    <section className="container page-space">
      <div className="listing-hero">
        <div>
          <h1>{query ? `Search: ${query}` : 'Search Apps'}</h1>
          <p>Find app listings by title, category, version, or Android requirement.</p>
        </div>
        <SearchBar compact defaultValue={query} />
      </div>
      <div className="content-grid">
        <div className="primary-column">
          {results.length ? (
            <div className="stack-list">
              {results.map((app) => (
                <AppListItem key={app.slug} app={app} />
              ))}
            </div>
          ) : (
            <EmptyState query={query} />
          )}
        </div>
        <div className="secondary-column">
          <Sidebar apps={apps} />
          <AdSlot />
        </div>
      </div>
    </section>
  );
}

function AppDetailPage({ slug, apps }) {
  const app = apps.find((item) => item.slug === slug) || apps[0];
  useMeta(`${app.title} APK`, `${app.title} APK detail page with version, file size, screenshots, safety status, and download link.`);

  return (
    <section className="container page-space">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: app.section, href: `/category/${app.section.toLowerCase()}/` },
          { label: app.title },
        ]}
      />
      <div className="content-grid detail-layout">
        <div className="primary-column">
          <section className="detail-hero">
            <AppIcon app={app} size="xl" />
            <div>
              <h1>{app.title} APK</h1>
              <p>
                {app.description.split('.')[0]} • Latest version {app.version}
              </p>
              <div className="detail-rating">
                <RatingBadge rating={app.rating} /> <span>/ 5</span> <strong>• {app.votes.toLocaleString()} votes</strong>{' '}
                <strong>• Updated {app.updatedAt.toLowerCase()}</strong>
              </div>
              <div className="detail-actions">
                <DownloadButton app={app} />
                <a className="report-btn" href="#report-app">
                  <Flag size={17} /> Report
                </a>
              </div>
            </div>
          </section>

          <MetadataGrid app={app} />

          <section className="section-block">
            <h2>Screenshots</h2>
            <div className="screenshots">
              {app.screenshots.map((src, index) => (
                <img key={src} src={src} alt={`${app.title} screenshot ${index + 1}`} loading="lazy" />
              ))}
            </div>
          </section>

          <ArticleBody
            sections={[
              {
                heading: 'Description',
                body: `${app.description} The layout gives users important app information first, then screenshots, features, installation guide, version history, and frequently asked questions.`,
              },
              {
                heading: 'Main Features',
                body: '',
                list: app.features,
              },
              {
                heading: 'How to Install',
                body: '',
                list: [
                  'Download the APK file from the verified link',
                  'Open Android Settings and allow trusted installation',
                  'Install the file and open the app',
                  'Always scan APK files before sharing with users',
                ],
              },
              {
                heading: 'Frequently Asked Questions',
                body: '',
                list: [
                  'Is this app free to download? Yes, if the developer allows free distribution.',
                  'Does it work on all Android phones? Check the requirement line above.',
                  'Can I request an update? Use the report button or contact page.',
                ],
              },
            ]}
          />
        </div>
        <div className="secondary-column">
          <SafetyStatus />
          <AdSlot />
          <Sidebar apps={apps} includeReport reportApp={app} />
        </div>
      </div>
    </section>
  );
}

function DownloadPage({ slug, apps }) {
  const app = apps.find((item) => item.slug === slug) || apps[0];
  useMeta(`Download ${app.title}`, `Secure download confirmation page for ${app.title} with safety scan and installation steps.`);
  const steps = ['Tap Download APK File', 'Open downloaded file', 'Allow trusted install when required', 'Install and open the app'];

  return (
    <section className="container page-space">
      <div className="download-banner">
        <div>
          <h1>Secure Download Page</h1>
          <p>A separate download page improves trust, avoids accidental clicks, and gives space for version notes, safety checks and ads.</p>
        </div>
        <AdSlot label="Ad 320 × 90" className="ad-invert" />
      </div>

      <section className="download-panel">
        <AppIcon app={app} size="xl" />
        <div className="download-panel-copy">
          <h2>{app.title} APK</h2>
          <p>
            Version {app.version} • {app.size} • {app.androidRequirement}
          </p>
          <p>Your download is ready. Please verify the app information before installing.</p>
          <div className="download-meta">
            <span>
              <small>Verified Version</small>
              {app.version}
            </span>
            <span>
              <small>File Size</small>
              {app.size}
            </span>
            <span>
              <small>Safety Scan</small>
              Passed
            </span>
          </div>
          <DownloadButton app={app} wide href={app.downloadUrl}>
            Download APK File
          </DownloadButton>
        </div>
      </section>

      <section className="section-block">
        <h2>Installation Steps</h2>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <article key={step} className="step-card">
              <span>{index + 1}</span>
              <h3>{step}</h3>
            </article>
          ))}
        </div>
      </section>

      <AdSlot label="Ad 970 × 90" className="ad-leaderboard" />

      <section className="plain-card">
        <h2>Alternative Download Links</h2>
        <ul>
          <li>
            <a href={app.downloadUrl}>Primary Server</a>
          </li>
          <li>
            <a href={app.downloadUrl}>Backup Server</a>
          </li>
          <li>
            <a href="/category/apps/">Older Version Archive</a>
          </li>
        </ul>
      </section>
    </section>
  );
}

function BlogListPage({ posts, type = 'blog' }) {
  const isNews = type === 'news';
  const visiblePosts = posts.filter((post) => (post.type || 'blog') === type);
  useMeta(
    isNews ? 'Android App News' : 'Android Guides & Blog',
    isNews
      ? 'Latest Android app news, release notes, and AppVault directory updates.'
      : 'Helpful posts for APK installation, safety, Android troubleshooting, and app update guides.',
  );

  return (
    <section className="container page-space">
      <div className="blog-heading">
        <div>
          <h1>{isNews ? 'Android App News' : 'Android Guides & Blog'}</h1>
          <p>
            {isNews
              ? 'Publish app updates, release announcements, security notices, and directory news.'
              : 'Helpful posts for APK installation, safety, Android troubleshooting, and app update guides.'}
          </p>
        </div>
        <AdSlot label="Ad 468 × 90" className="ad-wide" />
      </div>
      <div className="blog-grid">
        {visiblePosts.map((post) => (
          <a key={post.slug} className="post-card" href={`/${type}/${post.slug}/`}>
            <span className="post-media" style={{ '--post-color': post.color }}>
              {post.label}
            </span>
            <span className="post-copy">
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
            </span>
          </a>
        ))}
        {!visiblePosts.length && <EmptyState query={isNews ? 'news posts' : 'blog posts'} />}
      </div>
    </section>
  );
}

function BlogDetailPage({ slug, posts, type = 'blog', apps }) {
  const filtered = posts.filter((item) => (item.type || 'blog') === type);
  const post = filtered.find((item) => item.slug === slug) || filtered[0] || posts[0];
  useMeta(post.title, post.summary);

  return (
    <section className="container page-space">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: type === 'news' ? 'News' : 'Blog', href: type === 'news' ? '/news/' : '/blog/' },
          { label: post.title },
        ]}
      />
      <div className="content-grid">
        <div className="primary-column">
          <section className="article-hero">
            <h1>{post.title}</h1>
            <p>
              By Admin • Updated {post.updatedAt} • {post.readTime}
            </p>
            <span>{post.category}</span>
          </section>
          <ArticleBody sections={post.sections} />
        </div>
        <div className="secondary-column">
          <AdSlot />
          <Sidebar apps={apps} />
          <AdSlot />
        </div>
      </div>
    </section>
  );
}

function ContactPage() {
  useMeta('Contact Us', 'Contact AppVault for app update requests, broken links, business inquiries, and support messages.');
  const cards = [
    ['Email Support', 'support@example.com'],
    ['Response Time', '24-48 hours'],
    ['App Reports', 'Broken links & updates'],
    ['Business', 'Partnership inquiries'],
  ];

  return (
    <section className="container page-space contact-page">
      <header className="page-heading">
        <h1>Contact Us</h1>
        <p>Use this page for app update requests, broken links, business inquiries, and support messages.</p>
      </header>
      <div className="contact-grid">
        <ContactForm />
        <aside className="contact-side">
          <div className="support-grid">
            {cards.map(([title, text]) => (
              <article key={title} className="support-card">
                <span>✓</span>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <AdSlot />
          <section className="side-card faq-card">
            <h2>Quick FAQ</h2>
            <a href="/blog/how-to-check-app-version-before-download/">How to request new version?</a>
            <a href="/dmca-policy/">How to report copyright?</a>
            <a href="/contact-us/">Can developers submit apps?</a>
          </section>
        </aside>
      </div>
    </section>
  );
}

function StaticPage({ page, apps }) {
  useMeta(page.title, page.subtitle);
  const sections = normalizeStaticSections(page.sections);

  return (
    <section className="container page-space">
      <header className="page-heading">
        <h1>{page.title}</h1>
        <p>{page.subtitle}</p>
      </header>
      <div className="content-grid">
        <article className="static-content">
          {sections.map(({ heading, body }) => (
            <section key={heading}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </section>
          ))}
        </article>
        <div className="secondary-column">
          <Sidebar apps={apps} />
          <AdSlot />
        </div>
      </div>
    </section>
  );
}

function normalizeStaticSections(sections = []) {
  return sections.map((section) => {
    if (Array.isArray(section)) {
      return { heading: section[0], body: section[1] };
    }
    return {
      heading: section.heading,
      body: section.body,
    };
  });
}

function NotFoundPage() {
  useMeta('404 Not Found', 'The requested AppVault page could not be found.');

  return (
    <section className="container page-space">
      <div className="not-found">
        <h1>404</h1>
        <p>The page you requested could not be found.</p>
        <a className="download-btn" href="/">
          Return Home
        </a>
      </div>
    </section>
  );
}
