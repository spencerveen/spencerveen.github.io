# Spencer Veen — Personal Website

Website: https://spenceraveen.com  
Repository: https://github.com/spencerveen/spencerveen.github.io

This is a static GitHub Pages portfolio with two separate project sections:

- **AI-assisted projects**, featuring the playable Emberforge VI: Living Kingdoms browser game.
- **Independent (non-AI) projects**, initially empty until you add projects you want to showcase.

## Files

```text
spencerveen.github.io/
├── index.html               # Portfolio homepage (CSS and JS included)
├── projects.json            # Editable project listings
├── emberforge/
│   └── index.html           # Full playable Emberforge game, unchanged
├── CNAME                    # Keep spenceraveen.com custom domain configured
├── .nojekyll                # Publish static files without Jekyll processing
└── README.md
```

## First deployment (GitHub website)

1. Download and unzip the bundle.
2. Open https://github.com/spencerveen/spencerveen.github.io
3. Select **Add file → Upload files** (or the `+` menu, then Upload files).
4. Drag the **contents** of the unzipped folder (the root files **and** the `emberforge` folder) onto GitHub's upload area. Do not drag the ZIP itself, or an extra wrapper folder.
5. Confirm the upload list includes both `index.html` and `emberforge/index.html`. Overwrite the existing homepage and README; keep the `CNAME` text as `spenceraveen.com`.
6. Commit to `main`.
7. Visit https://spenceraveen.com/ and https://spenceraveen.com/emberforge/ after deployment completes.

If your browser does not preserve the `emberforge/` folder, upload the root files first, then visit the `emberforge` folder in GitHub and upload its `index.html` there in a second commit.

**Tip:** A more reliable option for uploading the entire folder tree is GitHub Desktop: clone the repository, copy the bundle's contents into the cloned repository folder, commit, and push. The repository must retain the folder layout shown above. Do not upload the ZIP itself; GitHub Pages will not automatically extract it.

## Updating Emberforge from your browser

- Open https://spenceraveen.com/?manage=1 for a small **Site management** bar in the footer. This is just a shortcut menu, **not** access control.
- Choose **Update Emberforge files**. In GitHub, open the `emberforge` directory, choose **Add file → Upload files** and upload a new game file named exactly `index.html` to overwrite the previous version. Then commit to `main`.
- GitHub Pages automatically publishes changes to `main`. You may need a hard refresh (`Ctrl+F5`) after deployment.
- This particular Emberforge HTML is large (~5.8 MB), so uploading a replacement file is easier than editing it in GitHub's in-browser text editor.

## Updating project cards

Use the **Edit project listings** link at https://spenceraveen.com/?manage=1 (or edit `projects.json` in GitHub). Example:

```json
{
  "ai": [
    {
      "title": "Emberforge VI: Living Kingdoms",
      "subtitle": "Featured playable project",
      "description": "My playable fantasy browser game",
      "tags": ["JavaScript", "AI-assisted"],
      "url": "/emberforge/",
      "button": "Play Emberforge",
      "featured": true
    }
  ],
  "independent": [
    {
      "title": "My original Python tool",
      "subtitle": "Python / Automation",
      "description": "A description of a real project I've completed.",
      "url": "https://github.com/spencerveen/YOUR-REPO",
      "button": "View source"
    }
  ]
}
```

The example independent project is **only an example**; it has not been added to your live portfolio.

## Save-game warning

Emberforge saves progress in browser `localStorage`. Saves from the original local HTML file or another domain are **not automatically available** on `spenceraveen.com` because browser storage is origin-specific. Use Emberforge's built-in **Export save** on the old location and **Import save** on the new location to migrate progress. Keep your export backed up before switching versions.

## What GitHub Pages can't do

GitHub Pages is static hosting. Visitors can play the game, but the portfolio itself cannot safely allow direct code modifications or host a private admin API. The management shortcuts open GitHub, where your account's authentication and permissions govern edits. Never put GitHub access tokens, passwords, or private keys in HTML or JavaScript.
