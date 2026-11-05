# Spencer Veen — Personal Website

Website: https://spenceraveen.com  
Source: https://github.com/spencerveen/spencerveen.github.io

A static GitHub Pages portfolio with AI Projects and Non-AI Projects galleries, playable Emberforge, an online résumé, and a Connect page.

## Important routes

- `/` — portfolio home
- `/ai-projects/` — AI-assisted projects, including Emberforge
- `/non-ai-projects/` — independent project gallery
- `/resume/` — stylized, accessible résumé matching the uploaded source
- `/resume/Spencer-Veen-Resume.pdf` — downloadable one-page, reformatted PDF résumé
- `/connect/` — GitHub and contact hub
- `/emberforge/` — playable game; this change does not touch its code

## Resume maintenance

The résumé page is `resume/index.html` with a dedicated stylesheet at `assets/resume.css`. It uses the existing shared `assets/site.css` and `assets/site.js` for consistent site-wide navigation.

The résumé information is drawn from Spencer's supplied PDF. The downloadable PDF is a one-page typeset copy with the same resume facts rather than a byte-for-byte copy of the uploaded design.

**Public information:** The résumé page and PDF display the email address, telephone number, and Sussex NJ location appearing in the supplied résumé. Treat this as public portfolio content.

If résumé facts change, update both the HTML and the PDF. The degree is **Bachelor of Arts in Computer Science**, with a 3.5 GPA, undergraduate certificates in Cybersecurity and Computer Information Systems, and 2027 graduation as provided.

## Updating projects

Edit `projects.json`: the `ai` array populates `/ai-projects/` and `independent` populates `/non-ai-projects/`. Emberforge is a featured AI listing and remains at its original URL.

## Deploying

Open a feature branch, review a pull request, then merge into `main` to trigger GitHub Pages publishing. Preserve `CNAME`, `.nojekyll`, and `emberforge/game.html`. No private tokens should be committed to the static site.
