import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  Flag,
  Menu,
  Search,
  Send,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';

export const BRAND = 'AppVault';

const legalLinks = [
  ['About Us', '/about-us/'],
  ['Contact', '/contact-us/'],
  ['Disclaimer', '/disclaimer/'],
  ['DMCA Policy', '/dmca-policy/'],
  ['Privacy Policy', '/privacy-policy/'],
];

const companyLinks = [...legalLinks, ['Terms', '/terms/']];

const mainLinks = [
  ['Home', '/'],
  ['Apps', '/category/apps/'],
  ['Games', '/category/games/'],
  ['Tools', '/category/tools/'],
  ['News', '/news/'],
  ['Blog', '/blog/'],
];

export function Logo({ compact = false }) {
  return (
    <a className="logo" href="/" aria-label={`${BRAND} home`}>
      <span className="logo-mark" aria-hidden="true">
        <ShieldCheck size={compact ? 17 : 20} strokeWidth={3} />
      </span>
      <span className="logo-copy">
        <strong>{BRAND}</strong>
        <small>Safe APK Directory</small>
      </span>
    </a>
  );
}

export function TopBar() {
  return (
    <div className="topbar">
      <div className="container topbar-inner">
        <nav aria-label="Legal links">
          {legalLinks.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="social-links" aria-label="Social links">
          <a href="#facebook">Facebook</a>
          <span aria-hidden="true">•</span>
          <a href="#telegram">Telegram</a>
          <span aria-hidden="true">•</span>
          <a href="#whatsapp">WhatsApp</a>
        </div>
      </div>
    </div>
  );
}

export function SearchBar({ placeholder = 'Search apps, games, versions...', defaultValue = '', compact = false }) {
  const [term, setTerm] = useState(defaultValue);

  function submitSearch(event) {
    event.preventDefault();
    const q = term.trim();
    window.location.href = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
  }

  return (
    <form className={compact ? 'searchbar searchbar-compact' : 'searchbar'} role="search" onSubmit={submitSearch}>
      <label className="sr-only" htmlFor={compact ? 'site-search-compact' : 'site-search'}>
        Search
      </label>
      <input
        id={compact ? 'site-search-compact' : 'site-search'}
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
      />
      <button type="submit" aria-label="Search">
        {compact ? <span>Search</span> : <Search size={20} />}
      </button>
    </form>
  );
}

export function Header({ path }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <TopBar />
      <div className="mainbar">
        <div className="container mainbar-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {mainLinks.map(([label, href]) => (
              <a key={href} className={isActivePath(path, href) ? 'active' : ''} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="header-search">
            <SearchBar compact={false} />
          </div>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {mainLinks.map(([label, href]) => (
              <a key={href} className={isActivePath(path, href) ? 'active' : ''} href={href}>
                {label}
              </a>
            ))}
            <SearchBar compact defaultValue="" />
          </nav>
        )}
      </div>
    </header>
  );
}

function isActivePath(path, href) {
  if (href === '/') return path === '/';
  if (href === '/category/apps/' && (path.startsWith('/app/') || path.startsWith('/download/'))) return true;
  return path.startsWith(href);
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo compact />
          <p>A clean APK directory theme for safe app information, verified metadata, guides, and legal downloads.</p>
          <p className="disclaimer">Only download apps from trusted sources. App names and trademarks belong to their owners.</p>
        </div>
        <FooterGroup
          title="Categories"
          links={[
            ['Apps', '/category/apps/'],
            ['Games', '/category/games/'],
            ['Tools', '/category/tools/'],
            ['Editors Choice', '/category/apps/'],
            ['Latest Updates', '/category/apps/'],
          ]}
        />
        <FooterGroup title="Company" links={companyLinks} />
        <FooterGroup
          title="Popular"
          links={[
            ['Top Rated Apps', '/category/apps/'],
            ['Most Viewed Apps', '/category/apps/'],
            ['New Releases', '/category/apps/'],
            ['Android Guides', '/blog/'],
            ['Submit App', '/contact-us/'],
          ]}
        />
      </div>
      <div className="container footer-bottom">
        <span>© 2026 {BRAND}. All rights reserved.</span>
        <span>Designed for responsive WordPress / custom web app development</span>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }) {
  return (
    <nav className="footer-group" aria-label={title}>
      <h2>{title}</h2>
      {links.map(([label, href]) => (
        <a key={`${title}-${href}-${label}`} href={href}>
          {label}
        </a>
      ))}
    </nav>
  );
}

export function AppIcon({ app, size = 'md' }) {
  return (
    <span className={`app-icon app-icon-${size}`} style={{ '--icon-color': app.color }} role="img" aria-label={`${app.title} icon`}>
      {app.iconUrl ? <img src={app.iconUrl} alt="" loading="lazy" /> : <span>{app.initial}</span>}
    </span>
  );
}

export function RatingBadge({ rating, compact = false }) {
  return (
    <span className={compact ? 'rating rating-compact' : 'rating'}>
      <Star size={compact ? 13 : 16} fill="currentColor" />
      {rating.toFixed(1)}
    </span>
  );
}

export function DownloadButton({ app, wide = false, children = 'Download APK', href }) {
  return (
    <a className={wide ? 'download-btn download-btn-wide' : 'download-btn'} href={href || `/download/${app.slug}/`}>
      <Download size={18} />
      <span>{children}</span>
    </a>
  );
}

export function CategoryChip({ label, href = `/category/${label.toLowerCase()}/`, color = '#16A34A' }) {
  return (
    <a className="category-chip" href={href}>
      <span style={{ '--chip-color': color }} aria-hidden="true" />
      {label}
    </a>
  );
}

export function AppCard({ app }) {
  return (
    <article className="app-card">
      <a className="app-card-link" href={`/app/${app.slug}/`} aria-label={`View ${app.title}`}>
        <AppIcon app={app} size="lg" />
        <h3>{app.title}</h3>
        <p>
          {app.category} • {app.version}
        </p>
      </a>
      <DownloadButton app={app}>Download APK</DownloadButton>
    </article>
  );
}

export function AppListItem({ app }) {
  return (
    <article className="app-list-item">
      <a className="list-main" href={`/app/${app.slug}/`}>
        <AppIcon app={app} />
        <span>
          <h3>{app.title}</h3>
          <p>
            {app.category} • {app.version} • {app.size}
          </p>
          <span className="app-meta-line">
            <RatingBadge rating={app.rating} compact /> <span>•</span> <em>Updated {app.updatedAt.toLowerCase()}</em>
          </span>
        </span>
      </a>
      <a className="pill-action" href={`/download/${app.slug}/`}>
        Download
      </a>
    </article>
  );
}

export function AdSlot({ label = 'Ad 300 × 250', className = '' }) {
  return (
    <aside className={`ad-slot ${className}`} aria-label="Advertisement placeholder">
      {label}
    </aside>
  );
}

export function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
          {index < items.length - 1 && <span aria-hidden="true">/</span>}
        </span>
      ))}
    </nav>
  );
}

export function MetadataGrid({ app }) {
  const rows = [
    ['Updated', app.updatedAt],
    ['Size', app.size],
    ['Version', app.version],
    ['Requires', app.androidRequirement],
    ['Downloads', app.downloads],
    ['Category', app.category],
  ];

  return (
    <dl className="metadata-grid">
      {rows.map(([label, value]) => (
        <div key={label} className="metadata-card">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Sidebar({ apps, includeGuides = false, includeReport = false, reportApp }) {
  const topRated = useMemo(() => [...apps].sort((a, b) => b.rating - a.rating).slice(0, 4), [apps]);

  return (
    <aside className="sidebar">
      <TopRatedApps apps={topRated} />
      <CategoryBox />
      {includeGuides && <GuideBox />}
      {includeReport && <ReportAppBox app={reportApp} />}
    </aside>
  );
}

export function TopRatedApps({ apps }) {
  return (
    <section className="side-card">
      <h2>Top Rated Apps</h2>
      <div className="mini-list">
        {apps.map((app) => (
          <a key={app.slug} href={`/app/${app.slug}/`} className="mini-app">
            <AppIcon app={app} size="sm" />
            <span>
              <strong>{app.title.replace(' Pro', '')}</strong>
              <small>
                ★ {app.rating.toFixed(1)} • APK
              </small>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function CategoryBox() {
  return (
    <section className="side-card">
      <h2>Categories</h2>
      <div className="side-links">
        <a href="/category/apps/">Apps</a>
        <a href="/category/games/">Games</a>
        <a href="/category/tools/">Tools</a>
        <a href="/category/apps/">Education</a>
      </div>
    </section>
  );
}

export function GuideBox() {
  const guides = [
    ['How to install APK safely', '/blog/how-to-install-apk-files-safely/'],
    ['How to check APK version', '/blog/how-to-check-app-version-before-download/'],
    ['Allow unknown sources safely', '/blog/how-to-install-apk-files-safely/'],
    ['Fix app not installed error', '/blog/fix-app-not-installed-error/'],
  ];

  return (
    <section className="side-card guide-box">
      <h2>Android Guides</h2>
      {guides.map(([label, href]) => (
        <a key={label} href={href}>
          {label}
        </a>
      ))}
    </section>
  );
}

export function ReportAppBox({ app }) {
  const [status, setStatus] = useState('');

  async function submitReport(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus('Sending...');
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appSlug: app?.slug || '',
          reason: form.get('reason'),
          message: form.get('message'),
          email: form.get('email'),
        }),
      });
      event.currentTarget.reset();
      setStatus('Report sent.');
    } catch (error) {
      setStatus('Could not send report.');
    }
  }

  return (
    <section className="side-card" id="report-app">
      <h2>Report this app</h2>
      <form className="report-form" onSubmit={submitReport}>
        <label>
          <input type="radio" name="reason" value="Broken link" defaultChecked /> Broken link
        </label>
        <label>
          <input type="radio" name="reason" value="New version" /> New version
        </label>
        <label>
          <input type="radio" name="reason" value="Wrong info" /> Wrong info
        </label>
        <input type="email" name="email" placeholder="Your email (optional)" />
        <textarea name="message" aria-label="Report details" placeholder="Add details..." rows="3" />
        <button type="submit">
          <Flag size={16} /> Send Report
        </button>
        {status && <p className="form-status">{status}</p>}
      </form>
    </section>
  );
}

export function SafetyStatus() {
  const items = ['Signature checked', 'Virus scan completed', 'Version metadata verified'];

  return (
    <section className="side-card safety-card">
      <h2>Safety Status</h2>
      {items.map((item) => (
        <p key={item}>
          <Check size={16} /> {item}
        </p>
      ))}
    </section>
  );
}

export function ContactForm() {
  const [status, setStatus] = useState('');

  async function submitContact(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus('Sending...');
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.get('name'),
          email: form.get('email'),
          subject: form.get('subject'),
          message: form.get('message'),
        }),
      });
      event.currentTarget.reset();
      setStatus('Message sent.');
    } catch (error) {
      setStatus('Could not send message.');
    }
  }

  return (
    <form className="contact-form" onSubmit={submitContact}>
      <h2>Send a Message</h2>
      <label>
        <span className="sr-only">Full name</span>
        <input type="text" name="name" placeholder="Full Name" autoComplete="name" />
      </label>
      <label>
        <span className="sr-only">Email address</span>
        <input type="email" name="email" placeholder="Email Address" autoComplete="email" />
      </label>
      <label>
        <span className="sr-only">Subject</span>
        <input type="text" name="subject" placeholder="Subject" />
      </label>
      <label>
        <span className="sr-only">Message</span>
        <textarea name="message" placeholder="Message" rows="7" />
      </label>
      <button type="submit">
        <Send size={18} /> Submit
      </button>
      {status && <p className="form-status">{status}</p>}
    </form>
  );
}

export function ArticleBody({ sections }) {
  return (
    <article className="article-body">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
          {section.list && (
            <ul>
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}

export function Pagination() {
  return (
    <nav className="pagination" aria-label="Pagination">
      <a className="active" href="#page-1">
        1
      </a>
      <a href="#page-2">2</a>
      <a href="#page-3">3</a>
      <span>...</span>
      <a href="#page-12">12</a>
      <a className="next" href="#next">
        Next
      </a>
    </nav>
  );
}

export function EmptyState({ query }) {
  return (
    <section className="empty-state">
      <AlertCircle size={28} />
      <h2>No results found</h2>
      <p>No app listings matched “{query}”. Try a category, app name, or version number.</p>
      <a className="pill-action" href="/category/apps/">
        Browse Apps
      </a>
    </section>
  );
}
