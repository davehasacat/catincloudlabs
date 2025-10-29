# CatInCloud Labs — Website (Cloudflare Pages)

A minimal, production-ready static site for **catincloudlabs.com**. Deploys automatically from GitHub to **Cloudflare Pages**.

## Quick start

1. **Create repo** on GitHub (public or private).
2. Copy these files into the repo (root).
3. Commit & push to `main`.

## Deploy to Cloudflare Pages

1. Cloudflare Dashboard → **Pages** → *Create project* → **Connect to Git**.
2. Select this repo.
3. **Build settings**:  
   - Framework preset: **None**  
   - Build command: *(leave empty)*  
   - Build output directory: **/** (project root)
4. Click **Save and Deploy**.
5. You’ll get a preview URL like `https://<project>.pages.dev`.

## Add custom domain

1. In the Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter `catincloudlabs.com` (and add `www.catincloudlabs.com` if you prefer a `www` host).  
3. Cloudflare will prompt to create DNS records automatically.
4. Optional: set a redirect from `www` → apex (or apex → www) in Pages' **Domain management**.

## Edit content

- Update text in `index.html`.  
- Tweak colors/spacing in `assets/style.css`.  
- Replace the logo at `assets/logo.svg` and social image at `assets/social-card.png`.  
- Update contact email in the **Contact** section.  
- Add more pages later (e.g., `services.html`, `about.html`).

## Security headers

- `_headers` sets a strict baseline CSP and common security headers.  
- Because `script-src 'none'`, the page has **no JavaScript dependencies** (except a tiny inline year-setter). If you add scripts later, loosen CSP accordingly (e.g., `script-src 'self'`).

## SEO

- `robots.txt` and `sitemap.xml` included.  
- Open Graph/Twitter tags set in `index.html`.

## 404 page

- `404.html` is used by Cloudflare Pages automatically for missing routes.

## License

This starter is provided as-is. Feel free to adapt it for CatInCloud Labs.
