# QR Generator

Generate a QR code from any URL or text, then download it as PNG or SVG.

The preview updates as you type. Size and error-correction are adjustable. All encoding happens in the browser — nothing is uploaded.

**GitHub description:** Generate QR codes from a URL or text. Download PNG/SVG. React + Vite, Docker/nginx, published to GHCR.

## Features

- Live QR preview from a URL or any string
- Sizes: 128, 256, 320, and 512px
- Error correction: L, M, Q, H
- Download PNG, download SVG, or copy the image
- Byte-count limit so the payload stays valid for a QR code
- Default content: `https://google.com`

## Tech stack

| Layer | Tool |
|-------|------|
| UI | React 19, Vite |
| QR encoding | `qrcode.react` |
| Production build | Node 22 Alpine |
| Web server | nginx Alpine |
| CI / image | GitHub Actions → GitHub Container Registry |

## Run locally

Requires Node 22 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
npm run build      # production files in dist/
npm run preview    # serve the production build
```

## Docker

The image is two stages: Node builds the app, nginx serves `/app/dist` on port 80.

```bash
docker build -t qr-generator .
docker run -p 8080:80 qr-generator
```

Open [http://localhost:8080](http://localhost:8080).

## CI/CD pipeline

The pipeline lives in `.github/workflows/ci.yml`. GitHub Actions runs it on a fresh Ubuntu machine.

**CI (continuous integration)** — prove the image still builds  
**CD (continuous delivery)** — publish that image to GitHub Container Registry

```text
push / pull request
        │
        ▼
  GitHub Actions (ubuntu-latest)
        │
        ├─ checkout the repo
        ├─ name the image  ghcr.io/<repo-owner>/qr_generator_githubaction:latest
        ├─ docker build
        │
        ├─ pull request  → stop here (build only)
        │
        └─ push to main
               ├─ docker login ghcr.io  (GITHUB_TOKEN, no secret to paste)
               └─ docker push           → GitHub Container Registry
```

| Event | What runs |
|-------|-----------|
| Pull request | Checkout + `docker build` |
| Push to `main` | Checkout + `docker build` + login + `docker push` |

Login uses GitHub’s built-in `GITHUB_TOKEN` with `packages: write`. You do not create a token for Actions.

This pipeline **does not deploy** to a server. CD here means the image is published to GHCR. You (or a host) then pull and run it.

## GitHub Container Registry

Image name:

The image owner is whoever owns the GitHub repo (`github.repository_owner`). Right now that is the user `sugata2002`. After you transfer the repo to the org `sugataray`, the image becomes `ghcr.io/sugataray/qr_generator_githubaction:latest`.

```bash
docker pull ghcr.io/sugata2002/qr_generator_githubaction:latest
docker run -p 8080:80 ghcr.io/sugata2002/qr_generator_githubaction:latest
```

If the package is private, log in first with a Personal Access Token that has `read:packages`:

```bash
echo YOUR_PAT | docker login ghcr.io -u sugata2002 --password-stdin
```

## Project layout

```text
src/                 React app
Dockerfile           Node 22 build → nginx image
nginx.conf           Serves /app/dist on port 80
.github/workflows/ci.yml   CI/CD: build image, push to GHCR on main
```
