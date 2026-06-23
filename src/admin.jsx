import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Plus,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';
import { apiFetch, getAdminToken, setAdminToken } from './api.js';
import { Logo } from './components.jsx';

const blankApp = {
  title: '',
  slug: '',
  section: 'Apps',
  category: 'Apps',
  shortDescription: '',
  description: '',
  developerName: '',
  packageName: '',
  iconUrl: '',
  color: '#16A34A',
  initial: 'A',
  rating: 4.5,
  votes: 0,
  downloadsCount: 0,
  downloads: '0',
  updatedAt: 'Today',
  status: 'published',
  version: 'v1.0',
  versionCode: '1',
  size: '',
  androidRequirement: 'Android 5.0+',
  downloadUrl: '#',
  checksumSha256: '',
  safetyScanStatus: 'Passed',
  changelog: '',
  safetySignatureChecked: true,
  safetyVirusScanCompleted: true,
  safetyMetadataVerified: true,
  featuresText: '',
  screenshotsText: '',
  seoTitle: '',
  seoDescription: '',
};

const blankPost = {
  title: '',
  slug: '',
  type: 'blog',
  category: 'Android Guide',
  label: 'Guide',
  color: '#16A34A',
  summary: '',
  content: '',
  sectionsText: '',
  authorName: 'Admin',
  readTime: '5 min read',
  coverUrl: '',
  status: 'published',
  seoTitle: '',
  seoDescription: '',
};

const blankStaticPage = {
  title: '',
  slug: '',
  path: '',
  subtitle: '',
  content: '',
  sectionsText: '',
  status: 'published',
  seoTitle: '',
  seoDescription: '',
};

export function AdminApp() {
  const [token, setTokenState] = useState(getAdminToken());
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [state, setState] = useState({
    loading: true,
    error: '',
    stats: {},
    apps: [],
    posts: [],
    staticPages: [],
    categories: [],
    reports: [],
    messages: [],
  });

  async function loadAdmin() {
    if (!token) return;
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [me, stats, apps, posts, staticPages, categories, reports, messages] = await Promise.all([
        apiFetch('/admin/me'),
        apiFetch('/admin/stats'),
        apiFetch('/admin/apps'),
        apiFetch('/admin/posts?type=all'),
        apiFetch('/admin/static-pages'),
        apiFetch('/admin/categories'),
        apiFetch('/admin/reports'),
        apiFetch('/admin/messages'),
      ]);
      setUser(me.user);
      setState({
        loading: false,
        error: '',
        stats: stats.stats,
        apps: apps.apps,
        posts: posts.posts,
        staticPages: staticPages.pages,
        categories: categories.categories,
        reports: reports.reports,
        messages: messages.messages,
      });
    } catch (error) {
      setAdminToken('');
      setTokenState('');
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }

  useEffect(() => {
    loadAdmin();
  }, [token]);

  function logout() {
    setAdminToken('');
    setTokenState('');
  }

  if (!token) {
    return <AdminLogin onLogin={setTokenState} />;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo />
        <nav aria-label="Admin navigation">
          <AdminNavButton active={tab === 'dashboard'} icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={() => setTab('dashboard')} />
          <AdminNavButton active={tab === 'apps'} icon={<BarChart3 size={18} />} label="Apps" onClick={() => setTab('apps')} />
          <AdminNavButton active={tab === 'posts'} icon={<Newspaper size={18} />} label="News & Blog" onClick={() => setTab('posts')} />
          <AdminNavButton active={tab === 'static'} icon={<FileText size={18} />} label="Static Pages" onClick={() => setTab('static')} />
          <AdminNavButton active={tab === 'categories'} icon={<FileText size={18} />} label="Categories" onClick={() => setTab('categories')} />
          <AdminNavButton active={tab === 'inbox'} icon={<Inbox size={18} />} label="Inbox" onClick={() => setTab('inbox')} />
        </nav>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>Admin Panel</span>
            <h1>{adminTitle(tab)}</h1>
          </div>
          <div className="admin-actions">
            <span>{user?.email}</span>
            <button type="button" onClick={loadAdmin}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button type="button" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {state.error && <p className="admin-alert">{state.error}</p>}
        {state.loading ? (
          <section className="admin-card">Loading admin data...</section>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard stats={state.stats} />}
            {tab === 'apps' && <AppsManager apps={state.apps} reload={loadAdmin} />}
            {tab === 'posts' && <PostsManager posts={state.posts} reload={loadAdmin} />}
            {tab === 'static' && <StaticPagesManager pages={state.staticPages} reload={loadAdmin} />}
            {tab === 'categories' && <CategoriesManager categories={state.categories} reload={loadAdmin} />}
            {tab === 'inbox' && <InboxManager reports={state.reports} messages={state.messages} />}
          </>
        )}
      </section>
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email: 'admin@appvault.local', password: 'admin12345' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/admin/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setAdminToken(data.token);
      onLogin(data.token);
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  return (
    <main className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <Logo />
        <h1>Admin Login</h1>
        <p>Manage APK listings, app versions, blog posts, news, reports, and contact messages.</p>
        <label>
          Email
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" required />
        </label>
        <label>
          Password
          <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} type="password" required />
        </label>
        {error && <p className="admin-alert">{error}</p>}
        <button type="submit">
          <Save size={18} /> Login
        </button>
      </form>
    </main>
  );
}

function AdminNavButton({ active, icon, label, onClick }) {
  return (
    <button className={active ? 'active' : ''} type="button" onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function adminTitle(tab) {
  return {
    dashboard: 'Dashboard',
    apps: 'Apps Manager',
    posts: 'News & Blog Manager',
    static: 'Static Pages',
    categories: 'Categories',
    inbox: 'Reports & Messages',
  }[tab];
}

function Dashboard({ stats }) {
  const cards = [
    ['Total Apps', stats.apps],
    ['Published Apps', stats.published_apps],
    ['Blog Posts', stats.blogs],
    ['News Posts', stats.news],
    ['Static Pages', stats.static_pages],
    ['Open Reports', stats.open_reports],
    ['New Messages', stats.new_messages],
  ];

  return (
    <section className="admin-grid">
      {cards.map(([label, value]) => (
        <article className="admin-stat" key={label}>
          <span>{label}</span>
          <strong>{value || 0}</strong>
        </article>
      ))}
    </section>
  );
}

function AppsManager({ apps, reload }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankApp);
  const [message, setMessage] = useState('');

  const sortedApps = useMemo(() => [...apps].sort((a, b) => a.title.localeCompare(b.title)), [apps]);

  function newApp() {
    setEditing(null);
    setForm(blankApp);
    setMessage('');
  }

  function editApp(app) {
    setEditing(app);
    setForm({
      ...blankApp,
      ...app,
      category: app.category,
      safetySignatureChecked: app.safetyStatus?.signatureChecked ?? true,
      safetyVirusScanCompleted: app.safetyStatus?.virusScanCompleted ?? true,
      safetyMetadataVerified: app.safetyStatus?.metadataVerified ?? true,
      featuresText: (app.features || []).join('\n'),
      screenshotsText: (app.screenshots || []).join('\n'),
    });
    setMessage('');
  }

  async function save(event) {
    event.preventDefault();
    setMessage('Saving app...');
    const path = editing ? `/admin/apps/${editing.id}` : '/admin/apps';
    const method = editing ? 'PUT' : 'POST';
    try {
      await apiFetch(path, {
        method,
        body: JSON.stringify(form),
      });
      setMessage('App saved.');
      await reload();
      if (!editing) setForm(blankApp);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function remove(app) {
    if (!window.confirm(`Delete ${app.title}?`)) return;
    await apiFetch(`/admin/apps/${app.id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <div className="admin-section-head">
          <h2>Apps</h2>
          <button type="button" onClick={newApp}>
            <Plus size={16} /> New App
          </button>
        </div>
        <div className="admin-list">
          {sortedApps.map((app) => (
            <article key={app.id} className="admin-list-item">
              <span>
                <strong>{app.title}</strong>
                <small>
                  {app.section} / {app.category} / {app.version} / {app.status}
                </small>
              </span>
              <div>
                <a href={`/app/${app.slug}/`} target="_blank" rel="noreferrer">
                  View
                </a>
                <button type="button" onClick={() => editApp(app)}>
                  Edit
                </button>
                <button type="button" onClick={() => remove(app)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>{editing ? `Edit ${editing.title}` : 'Create App'}</h2>
        <form className="admin-form" onSubmit={save}>
          <Field label="Title" value={form.title} required onChange={(value) => setForm({ ...form, title: value })} />
          <Field label="Slug" value={form.slug} placeholder="auto-from-title if empty" onChange={(value) => setForm({ ...form, slug: value })} />
          <div className="admin-form-grid">
            <SelectField label="Section" value={form.section} options={['Apps', 'Games', 'Tools']} onChange={(value) => setForm({ ...form, section: value })} />
            <Field label="Category" value={form.category} required onChange={(value) => setForm({ ...form, category: value })} />
            <SelectField label="Status" value={form.status} options={['published', 'draft', 'archived']} onChange={(value) => setForm({ ...form, status: value })} />
            <Field label="Version" value={form.version} required onChange={(value) => setForm({ ...form, version: value })} />
            <Field label="Version Code" value={form.versionCode} onChange={(value) => setForm({ ...form, versionCode: value })} />
            <Field label="Size" value={form.size} required onChange={(value) => setForm({ ...form, size: value })} />
            <Field label="Android Requirement" value={form.androidRequirement} required onChange={(value) => setForm({ ...form, androidRequirement: value })} />
            <Field label="Package Name" value={form.packageName} onChange={(value) => setForm({ ...form, packageName: value })} />
            <Field label="Developer" value={form.developerName} onChange={(value) => setForm({ ...form, developerName: value })} />
            <Field label="Rating" type="number" step="0.1" value={form.rating} onChange={(value) => setForm({ ...form, rating: value })} />
            <Field label="Votes" type="number" value={form.votes} onChange={(value) => setForm({ ...form, votes: value })} />
            <Field label="Downloads Count" type="number" value={form.downloadsCount} onChange={(value) => setForm({ ...form, downloadsCount: value })} />
            <Field label="Downloads Label" value={form.downloads} onChange={(value) => setForm({ ...form, downloads: value })} />
            <Field label="Updated Label" value={form.updatedAt} onChange={(value) => setForm({ ...form, updatedAt: value })} />
            <Field label="Initial" value={form.initial} onChange={(value) => setForm({ ...form, initial: value })} />
            <Field label="Color" type="color" value={form.color} onChange={(value) => setForm({ ...form, color: value })} />
          </div>
          <Textarea label="Short Description" value={form.shortDescription} onChange={(value) => setForm({ ...form, shortDescription: value })} />
          <Textarea label="Full Description" value={form.description} required onChange={(value) => setForm({ ...form, description: value })} />
          <UploadField
            label="Icon Upload"
            onUploaded={(url) => setForm({ ...form, iconUrl: url })}
          />
          <Field label="Icon URL" value={form.iconUrl} onChange={(value) => setForm({ ...form, iconUrl: value })} />
          <UploadField
            label="APK Upload"
            onUploaded={(url) => setForm({ ...form, downloadUrl: url })}
          />
          <Field label="Download URL" value={form.downloadUrl} required onChange={(value) => setForm({ ...form, downloadUrl: value })} />
          <Field label="SHA-256 Checksum" value={form.checksumSha256} onChange={(value) => setForm({ ...form, checksumSha256: value })} />
          <SelectField label="Safety Scan" value={form.safetyScanStatus} options={['Passed', 'Pending', 'Failed']} onChange={(value) => setForm({ ...form, safetyScanStatus: value })} />
          <Textarea label="Changelog" value={form.changelog} onChange={(value) => setForm({ ...form, changelog: value })} />
          <Textarea label="Features (one per line)" value={form.featuresText} onChange={(value) => setForm({ ...form, featuresText: value })} />
          <UploadField
            label="Screenshot Upload"
            onUploaded={(url) => setForm({ ...form, screenshotsText: `${form.screenshotsText ? `${form.screenshotsText}\n` : ''}${url}` })}
          />
          <Textarea label="Screenshot URLs (one per line)" value={form.screenshotsText} onChange={(value) => setForm({ ...form, screenshotsText: value })} />
          <div className="admin-checkbox-row">
            <label>
              <input type="checkbox" checked={form.safetySignatureChecked} onChange={(event) => setForm({ ...form, safetySignatureChecked: event.target.checked })} />
              Signature checked
            </label>
            <label>
              <input type="checkbox" checked={form.safetyVirusScanCompleted} onChange={(event) => setForm({ ...form, safetyVirusScanCompleted: event.target.checked })} />
              Virus scan completed
            </label>
            <label>
              <input type="checkbox" checked={form.safetyMetadataVerified} onChange={(event) => setForm({ ...form, safetyMetadataVerified: event.target.checked })} />
              Metadata verified
            </label>
          </div>
          <Field label="SEO Title" value={form.seoTitle} onChange={(value) => setForm({ ...form, seoTitle: value })} />
          <Textarea label="SEO Description" value={form.seoDescription} onChange={(value) => setForm({ ...form, seoDescription: value })} />
          {message && <p className="form-status">{message}</p>}
          <button type="submit">
            <Save size={16} /> Save App
          </button>
        </form>
      </section>
    </div>
  );
}

function PostsManager({ posts, reload }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankPost);
  const [message, setMessage] = useState('');

  function newPost(type = 'blog') {
    setEditing(null);
    setForm({ ...blankPost, type, category: type === 'news' ? 'News' : 'Android Guide', label: type === 'news' ? 'News' : 'Guide' });
    setMessage('');
  }

  function editPost(post) {
    setEditing(post);
    setForm({
      ...blankPost,
      ...post,
      authorName: post.authorName || 'Admin',
      sectionsText: (post.sections || []).map((section) => `${section.heading}\n${section.body}`).join('\n\n'),
    });
    setMessage('');
  }

  async function save(event) {
    event.preventDefault();
    setMessage('Saving post...');
    const path = editing ? `/admin/posts/${editing.id}` : '/admin/posts';
    const method = editing ? 'PUT' : 'POST';
    try {
      await apiFetch(path, {
        method,
        body: JSON.stringify(form),
      });
      setMessage('Post saved.');
      await reload();
      if (!editing) setForm(blankPost);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function remove(post) {
    if (!window.confirm(`Delete ${post.title}?`)) return;
    await apiFetch(`/admin/posts/${post.id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <div className="admin-section-head">
          <h2>News & Blog</h2>
          <span className="admin-button-row">
            <button type="button" onClick={() => newPost('blog')}>
              <Plus size={16} /> Blog
            </button>
            <button type="button" onClick={() => newPost('news')}>
              <Plus size={16} /> News
            </button>
          </span>
        </div>
        <div className="admin-list">
          {posts.map((post) => (
            <article key={post.id} className="admin-list-item">
              <span>
                <strong>{post.title}</strong>
                <small>
                  {post.type} / {post.category} / {post.status}
                </small>
              </span>
              <div>
                <a href={`/${post.type}/${post.slug}/`} target="_blank" rel="noreferrer">
                  View
                </a>
                <button type="button" onClick={() => editPost(post)}>
                  Edit
                </button>
                <button type="button" onClick={() => remove(post)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>{editing ? `Edit ${editing.title}` : 'Create Post'}</h2>
        <form className="admin-form" onSubmit={save}>
          <Field label="Title" value={form.title} required onChange={(value) => setForm({ ...form, title: value })} />
          <Field label="Slug" value={form.slug} placeholder="auto-from-title if empty" onChange={(value) => setForm({ ...form, slug: value })} />
          <div className="admin-form-grid">
            <SelectField label="Type" value={form.type} options={['blog', 'news']} onChange={(value) => setForm({ ...form, type: value })} />
            <Field label="Category" value={form.category} required onChange={(value) => setForm({ ...form, category: value })} />
            <Field label="Label" value={form.label} onChange={(value) => setForm({ ...form, label: value })} />
            <SelectField label="Status" value={form.status} options={['published', 'draft', 'archived']} onChange={(value) => setForm({ ...form, status: value })} />
            <Field label="Read Time" value={form.readTime} onChange={(value) => setForm({ ...form, readTime: value })} />
            <Field label="Author" value={form.authorName} onChange={(value) => setForm({ ...form, authorName: value })} />
            <Field label="Color" type="color" value={form.color} onChange={(value) => setForm({ ...form, color: value })} />
          </div>
          <Textarea label="Summary" value={form.summary} required onChange={(value) => setForm({ ...form, summary: value })} />
          <UploadField label="Cover Upload" onUploaded={(url) => setForm({ ...form, coverUrl: url })} />
          <Field label="Cover URL" value={form.coverUrl} onChange={(value) => setForm({ ...form, coverUrl: value })} />
          <Textarea label="Article Sections (heading, body, blank line between sections)" value={form.sectionsText} required onChange={(value) => setForm({ ...form, sectionsText: value })} />
          <Textarea label="Raw Content" value={form.content} onChange={(value) => setForm({ ...form, content: value })} />
          <Field label="SEO Title" value={form.seoTitle} onChange={(value) => setForm({ ...form, seoTitle: value })} />
          <Textarea label="SEO Description" value={form.seoDescription} onChange={(value) => setForm({ ...form, seoDescription: value })} />
          {message && <p className="form-status">{message}</p>}
          <button type="submit">
            <Save size={16} /> Save Post
          </button>
        </form>
      </section>
    </div>
  );
}

function StaticPagesManager({ pages, reload }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankStaticPage);
  const [message, setMessage] = useState('');

  function newPage() {
    setEditing(null);
    setForm(blankStaticPage);
    setMessage('');
  }

  function editPage(page) {
    setEditing(page);
    setForm({
      ...blankStaticPage,
      ...page,
      sectionsText: (page.sections || []).map((section) => `${section.heading}\n${section.body}`).join('\n\n'),
    });
    setMessage('');
  }

  async function save(event) {
    event.preventDefault();
    setMessage('Saving static page...');
    const path = editing ? `/admin/static-pages/${editing.id}` : '/admin/static-pages';
    const method = editing ? 'PUT' : 'POST';
    try {
      await apiFetch(path, {
        method,
        body: JSON.stringify(form),
      });
      setMessage('Static page saved.');
      await reload();
      if (!editing) setForm(blankStaticPage);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="admin-two-column admin-two-column-narrow">
      <section className="admin-card">
        <div className="admin-section-head">
          <h2>Static Pages</h2>
          <button type="button" onClick={newPage}>
            <Plus size={16} /> New Page
          </button>
        </div>
        <div className="admin-list">
          {pages.map((page) => (
            <article key={page.id} className="admin-list-item">
              <span>
                <strong>{page.title}</strong>
                <small>
                  {page.path} / {page.status}
                </small>
              </span>
              <div>
                <a href={page.path} target="_blank" rel="noreferrer">
                  View
                </a>
                <button type="button" onClick={() => editPage(page)}>
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>{editing ? `Edit ${editing.title}` : 'Create Static Page'}</h2>
        <form className="admin-form" onSubmit={save}>
          <Field label="Title" value={form.title} required onChange={(value) => setForm({ ...form, title: value })} />
          <div className="admin-form-grid">
            <Field label="Slug" value={form.slug} required placeholder="privacy-policy" onChange={(value) => setForm({ ...form, slug: value })} />
            <Field label="Path" value={form.path} required placeholder="/privacy-policy/" onChange={(value) => setForm({ ...form, path: value })} />
            <SelectField label="Status" value={form.status} options={['published', 'draft', 'archived']} onChange={(value) => setForm({ ...form, status: value })} />
          </div>
          <Textarea label="Subtitle" value={form.subtitle} onChange={(value) => setForm({ ...form, subtitle: value })} />
          <Textarea
            label="Page Sections (heading, body, blank line between sections)"
            value={form.sectionsText}
            required
            onChange={(value) => setForm({ ...form, sectionsText: value })}
          />
          <Textarea label="Raw Content / Notes" value={form.content} onChange={(value) => setForm({ ...form, content: value })} />
          <Field label="SEO Title" value={form.seoTitle} onChange={(value) => setForm({ ...form, seoTitle: value })} />
          <Textarea label="SEO Description" value={form.seoDescription} onChange={(value) => setForm({ ...form, seoDescription: value })} />
          {message && <p className="form-status">{message}</p>}
          <button type="submit">
            <Save size={16} /> Save Static Page
          </button>
        </form>
      </section>
    </div>
  );
}

function CategoriesManager({ categories, reload }) {
  const [form, setForm] = useState({ name: '', type: 'app', color: '#16A34A' });
  const [message, setMessage] = useState('');

  async function save(event) {
    event.preventDefault();
    setMessage('Saving category...');
    try {
      await apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setMessage('Category saved.');
      setForm({ name: '', type: 'app', color: '#16A34A' });
      await reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="admin-two-column admin-two-column-narrow">
      <section className="admin-card">
        <h2>Create Category</h2>
        <form className="admin-form" onSubmit={save}>
          <Field label="Name" value={form.name} required onChange={(value) => setForm({ ...form, name: value })} />
          <SelectField label="Type" value={form.type} options={['app', 'post']} onChange={(value) => setForm({ ...form, type: value })} />
          <Field label="Color" type="color" value={form.color} onChange={(value) => setForm({ ...form, color: value })} />
          {message && <p className="form-status">{message}</p>}
          <button type="submit">
            <Save size={16} /> Save Category
          </button>
        </form>
      </section>
      <section className="admin-card">
        <h2>Existing Categories</h2>
        <div className="admin-list">
          {categories.map((category) => (
            <article key={category.id} className="admin-list-item">
              <span>
                <strong>{category.name}</strong>
                <small>
                  {category.type} / {category.slug}
                </small>
              </span>
              <span className="admin-color-dot" style={{ '--dot-color': category.color }} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function InboxManager({ reports, messages }) {
  return (
    <div className="admin-two-column admin-two-column-narrow">
      <section className="admin-card">
        <h2>App Reports</h2>
        <div className="admin-list">
          {reports.map((report) => (
            <article key={report.id} className="admin-list-item">
              <span>
                <strong>{report.app_title || report.app_slug || 'App report'}</strong>
                <small>
                  {report.reason} / {report.status} / {new Date(report.created_at).toLocaleString()}
                </small>
                {report.message && <p>{report.message}</p>}
              </span>
            </article>
          ))}
          {!reports.length && <p>No reports yet.</p>}
        </div>
      </section>
      <section className="admin-card">
        <h2>Contact Messages</h2>
        <div className="admin-list">
          {messages.map((message) => (
            <article key={message.id} className="admin-list-item">
              <span>
                <strong>{message.subject || 'Contact message'}</strong>
                <small>
                  {message.full_name} / {message.email} / {new Date(message.created_at).toLocaleString()}
                </small>
                <p>{message.message}</p>
              </span>
            </article>
          ))}
          {!messages.length && <p>No messages yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '', step }) {
  return (
    <label>
      {label}
      <input
        type={type}
        step={step}
        value={value ?? ''}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Textarea({ label, value, onChange, required = false }) {
  return (
    <label>
      {label}
      <textarea value={value ?? ''} required={required} rows="5" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function UploadField({ label, onUploaded }) {
  const [message, setMessage] = useState('');

  async function uploadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('Uploading...');
    const data = new FormData();
    data.append('file', file);
    try {
      const result = await apiFetch('/admin/upload', {
        method: 'POST',
        body: data,
      });
      onUploaded(result.file.public_url);
      setMessage(`Uploaded ${result.file.public_url}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <label className="admin-upload">
      {label}
      <span>
        <Upload size={16} />
        <input type="file" onChange={uploadFile} />
      </span>
      {message && <small>{message}</small>}
    </label>
  );
}
