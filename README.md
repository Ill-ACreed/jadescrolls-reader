# jadescrolls-reader

Public, passphrase-gated reader for JadeScrolls chapters.

- `reader.html` / `index.html` — webnovel reader (decrypts encrypted chapters in-browser)
- `encrypt.js` — AES-GCM encryption used to publish chapters
- `.github/workflows/publish.yml` — clones the private `jadescrolls` repo, encrypts chapters, publishes to `gh-pages`

Requires repo secrets: `PASS` (reader passphrase) and `PRIVATE_REPO_TOKEN` (access to the private repo).
