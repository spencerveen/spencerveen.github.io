# Spencer Veen — Personal Website

Website: https://spenceraveen.com  
Repository: https://github.com/spencerveen/spencerveen.github.io

A static GitHub Pages portfolio. Projects are organized into **AI Projects** and **Non-AI Projects** with separate landing pages.

## Structure

```text
index.html                  Homepage with About and project category links
ai-projects/index.html      AI project gallery (Emberforge and future releases)
non-ai-projects/index.html  Independent project gallery
connect/index.html          GitHub and other public profile links
resume/index.html           Short professional profile (PDF not uploaded)
assets/site.css             Shared stylesheet for subpages
assets/site.js              Mobile navigation and copyright year
assets/projects.js          JSON-driven, text-safe project cards
projects.json               Single editable index of projects
emberforge/index.html       Game navigation wrapper
emberforge/game.html        Actual game, unchanged
CNAME                       Custom domain configuration
.nojekyll                   Static Pages publishing
```

## Adding projects

Edit `projects.json`: `ai` feeds `/ai-projects/` and `independent` feeds `/non-ai-projects/`. Every item appears, including items with `"featured": true`.

Example entry (illustrative only; not included in the site):

```json
{
  "title": "My independent Python utility",
  "subtitle": "Python / Automation",
  "description": "A short description of a completed project.",
  "tags": ["Python", "Automation"],
  "url": "https://github.com/spencerveen/REPO-NAME",
  "button": "View source"
}
```

Use confirmed project URLs; project links accept site-relative paths or HTTP(S) URLs. The project renderer uses `textContent` rather than injecting untrusted HTML.

## Emberforge

The playable game is still at https://spenceraveen.com/emberforge/ and is linked from the AI Projects gallery. Its existing `game.html` file and save logic are not changed by the redesign. The wrapper iframe continues to load `./game.html`.

Saved progress uses browser `localStorage`, which is tied to the site's origin. Migrating from a local HTML file or another domain requires using the game's **Export save** and **Import save** features.

## Résumé and social profiles

The `/resume/` page currently provides a short public summary, **not a downloadable PDF**. When the approved PDF is supplied, place it under `/assets/` and add its download link to `resume/index.html`.

The `/connect/` page lists the known GitHub URL and the résumé page. Add LinkedIn or other profiles once their real URLs are supplied; don't publish made-up accounts or contact details.

## Workflow

Make changes on a development branch, review the pull request, then merge into `main` when approved. GitHub Pages publishes from `main`. Test the homepage, project galleries, résumé, Connect page, and Emberforge after deployment.

The homepage's `?manage=1` footer exposes GitHub editing shortcuts only; it is **not** an authentication mechanism. Do not put secrets or tokens into static HTML or JavaScript.

Keep the `CNAME` and `.nojekyll` files intact.
