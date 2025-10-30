# CatInCloud Labs 🌩️  

_Cloud Engineering • Data Pipelines • DevOps Excellence_

**CatInCloud Labs** is a minimalist, enterprise-grade portfolio site for showcasing cloud architecture and data engineering projects.

---

## 🚀 Deployment

This site is hosted on **Cloudflare Pages**.

**Configuration:**

- **Root Directory:** `/`
- **Build Output Directory:** `public`
- **Build Command:** *(none — static site)*
- **Custom Domain:** [catincloudlabs.com](https://catincloudlabs.com)

**Public assets:**

```
public/
├── index.html
├── about.html
├── projects.html
├── styles.css
├── favicon.png
├── logo.svg
├── robots.txt
├── sitemap.xml
├── humans.txt
└── .well-known/
    └── security.txt
```

---

## 🧠 Philosophy

The site follows CatInCloud Labs’ core design principles:

- **Clarity over complexity**
- **Security and standards by default**
- **Dark-mode native aesthetic**
- **Cloud-native professionalism**

---

## 📄 Metadata & Compliance

- **robots.txt** — SEO and crawler directives  
- **sitemap.xml** — Sitemap for search engines  
- **humans.txt** — Credits and technology  
- **.well-known/security.txt** — Responsible disclosure policy  

---

## 🔧 Maintenance

**To update content:**

- Edit the HTML files in `/public`
- Commit and push changes to `main`
- Cloudflare Pages auto-deploys on push

**To test locally:**

```bash
# Run a quick local preview
python -m http.server 8080 --directory public

```

Then open: [http://localhost:8080](http://localhost:8080)

---

© 2025 CatInCloud Labs — “cats who cloud. humans that stay grounded.”
