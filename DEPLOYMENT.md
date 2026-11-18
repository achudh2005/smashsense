# SmashSense — Deployment Guide

## 🌐 Live URL

> **https://smashsense.54.79.20.200.sslip.io**

Permanent HTTPS deployment on AWS EC2. No expiry. Camera access works (HTTPS + correct security headers).

---

## Infrastructure

| Component | Details |
|-----------|---------|
| **Platform** | AWS EC2 `t3.micro` |
| **Region** | `ap-southeast-2` (Sydney) |
| **Instance ID** | `i-01f7443e6c2a2ff8a` |
| **Public IP** | `54.79.20.200` |
| **Web Server** | Nginx 1.24.0 |
| **SSL** | Let's Encrypt via sslip.io (auto-renewed) |
| **SSL Expiry** | 2027-02-16 (auto-renewed 30 days before) |
| **IAM User** | `smartprint-deployer` (AdministratorAccess) |

The same EC2 instance also runs **SmartPrint** (`smartprint-api` PM2 process). SmashSense is served as a separate nginx virtual host at port 443 on `smashsense.54.79.20.200.sslip.io`.

---

## Security Headers Verified

All required headers are present on `https://smashsense.54.79.20.200.sslip.io`:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(self), microphone=(self)
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

> [!IMPORTANT]
> `Permissions-Policy: camera=(self)` is required for `getUserMedia()` to work.
> `COOP` + `COEP` are required for `SharedArrayBuffer` (used by TF.js WebAssembly threads).

---

## Environment Variables

Create a `.env` file (never commit it — it's in `.gitignore`) based on `.env.example`:

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_APP_URL` | Canonical app URL | No |
| `VITE_GEMINI_API_KEY` | Optional LLM coaching (user-provided in Settings) | No |
| `VITE_SENTRY_DSN` | Error monitoring (opt-in) | No |
| `VITE_ANALYTICS_ID` | Plausible analytics (opt-in) | No |

None of these are required for the app to function. All AI runs client-side.

---

## Nginx Config Files

The nginx virtual host config is at:

- **Server**: `/etc/nginx/sites-available/smashsense` → symlinked to `/etc/nginx/sites-enabled/smashsense`
- **Security snippet**: `/etc/nginx/snippets/smashsense-security.conf`
- **Local backup**: `smashsense-nginx-v2.conf` (in this repo root, excluded from git)

---

## How to Redeploy

1. Build the app locally:
   ```bash
   npm run build
   ```

2. Zip the `dist/` output:
   ```powershell
   Compress-Archive -Path dist\* -DestinationPath smashsense-dist.zip -Force
   ```

3. Upload to EC2:
   ```powershell
   scp -i "~/.ssh/smartprint-key.pem" smashsense-dist.zip ubuntu@54.79.20.200:/home/ubuntu/
   ```

4. SSH in and extract:
   ```bash
   ssh -i ~/.ssh/smartprint-key.pem ubuntu@54.79.20.200
   sudo unzip -o /home/ubuntu/smashsense-dist.zip -d /var/www/smashsense/
   sudo chown -R www-data:www-data /var/www/smashsense/
   ```

No nginx restart needed — static files are served directly.

---

## How to Roll Back

Keep a backup of the previous `dist/` before each deploy:
```bash
# On EC2:
sudo cp -r /var/www/smashsense /var/www/smashsense-backup-$(date +%Y%m%d)
```

To roll back: replace `/var/www/smashsense/` with the backup.

---

## SSL Certificate Renewal

Certbot is configured with a systemd timer for automatic renewal. To check:
```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

---

## Troubleshooting

### Camera Not Working
- Ensure you're on **HTTPS** (not HTTP). Camera is blocked on plain HTTP.
- Check that `Permissions-Policy: camera=(self)` header is present.
- On iOS Safari, ensure "Camera" permission is granted in Settings → Safari.

### SharedArrayBuffer / TF.js WebAssembly
- Requires `Cross-Origin-Opener-Policy: same-origin` **and** `Cross-Origin-Embedder-Policy: credentialless` (or `require-corp`).
- Verify with: `typeof SharedArrayBuffer !== 'undefined'` in browser console.

### Models Loading Slowly
- TF.js models are cached by the service worker after first load. Subsequent visits are offline-capable.
- On first load on mobile, allow 10–30s for model initialization.

### Nginx Errors
```bash
sudo nginx -t            # test config
sudo systemctl status nginx
sudo tail -50 /var/log/nginx/error.log
```

---

## CI/CD (GitHub Actions)

The `.github/workflows/ci.yml` pipeline runs on every push to `main`:
1. `npm run lint` — ESLint
2. `npx tsc --noEmit` — TypeScript check
3. `npm run test` — Vitest (39 tests)
4. `npm run build` — Vite production build
5. Deploy to Vercel (if `VERCEL_TOKEN` secret is configured in GitHub)

**To add AWS auto-deploy**, add GitHub Actions secrets:
- `EC2_HOST`: `54.79.20.200`
- `EC2_USER`: `ubuntu`
- `EC2_SSH_KEY`: contents of `smartprint-key.pem`

Then add a deploy step to `ci.yml`:
```yaml
- name: Deploy to AWS EC2
  uses: appleboy/scp-action@v0.1.7
  with:
    host: ${{ secrets.EC2_HOST }}
    username: ${{ secrets.EC2_USER }}
    key: ${{ secrets.EC2_SSH_KEY }}
    source: dist/*
    target: /var/www/smashsense/
```

---

## Custom Domain (Optional)

To use a custom domain (e.g. `smashsense.com`):

1. Point an A record to `54.79.20.200`
2. Update nginx `server_name` to your domain
3. Run: `sudo certbot --nginx -d smashsense.com --non-interactive --agree-tos --email your@email.com`

---

*Generated: 2026-11-19 | Version: v1.2.0*
