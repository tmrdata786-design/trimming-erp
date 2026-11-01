# Deployment Guide

## Overview
This document describes the deployment process for the Trimming ERP application, including frontend (GitHub Pages) and backend proxy (VPS/Docker).

## Architecture Recap

```
┌─────────────────┐     HTTPS      ┌──────────────────┐     Internal      ┌──────────────────┐
│  GitHub Pages   │ ◄─────────────► │  Backend Proxy   │ ◄──────────────►  │  Manager.io API  │
│  (Frontend)     │   REST + WS    │  (Express + PG)  │   X-API-KEY       │  (promoerp.it)   │
└─────────────────┘                └──────────────────┘                   └──────────────────┘
```

## Frontend Deployment (GitHub Pages)

### Repository Setup
1. **Repository**: `github.com/<your-org>/trimming-erp` (public)
2. **Branch**: `main` (protected, requires PR review)
3. **GitHub Pages Source**: `gh-pages` branch (via Actions)

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  base: '/trimming-erp/',  // Repository name
  // ... other config
})
```

### Build Process
```bash
# Local build
npm run build

# Output: dist/
# - index.html
# - assets/index-[hash].js
# - assets/index-[hash].css
```

### GitHub Actions Workflow
See `.github/workflows/deploy.yml` for complete workflow.

**Workflow Steps**:
1. **Lint & Type Check**: `tsc --noEmit`, `npm run lint`
2. **Test**: `vitest run --coverage`
3. **Build**: `npm run build`
4. **Deploy**: Upload `dist/` to `gh-pages` branch
5. **Verify**: Check deployed URL loads correctly

### Custom Domain (Optional)
```bash
# CNAME file in public/
echo "trimming.yourdomain.com" > public/CNAME

# DNS: CNAME trimming.yourdomain.com -> <user>.github.io
# GitHub Pages: Settings → Pages → Custom domain
```

### Environment Variables (Frontend)
```bash
# .env.production (not committed)
VITE_API_BASE=https://api.yourdomain.com/api
```

## Backend Proxy Deployment (VPS)

### Prerequisites
- Ubuntu 22.04+ or similar
- Node.js 20+
- PostgreSQL 15+
- Nginx
- Domain with DNS control

### Server Setup
```bash
# 1. Create deploy user
adduser deploy
usermod -aG sudo deploy

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres createuser --interactive deploy
sudo -u postgres createdb -O deploy trimming_erp

# 4. Install Nginx
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 5. Install PM2
sudo npm install -g pm2
```

### Application Deployment
```bash
# 1. Clone repository
cd /opt
sudo git clone https://github.com/<your-org>/trimming-erp-proxy.git
sudo chown -R deploy:deploy trimming-erp-proxy

# 2. Install dependencies
cd trimming-erp-proxy
sudo -u deploy npm ci --production

# 3. Build TypeScript
sudo -u deploy npm run build

# 4. Run migrations
sudo -u deploy npm run migrate

# 5. Seed initial data (optional)
sudo -u deploy npm run seed
```

### Environment Configuration
```bash
# /opt/trimming-erp-proxy/.env
MANAGER_API_URL=http://promoerp.promoerp.it/api2
MANAGER_API_KEY=<your-manager-io-api-key>
DATABASE_URL=postgresql://deploy:password@localhost:5432/trimming_erp
JWT_SECRET=<generate-64-char-random-string>
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://<user>.github.io/trimming-erp
ALLOWED_BUSINESSES=KEEL,TEST
PORT=3001
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### PM2 Process Management
```bash
# /opt/trimming-erp-proxy/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'trimming-erp-proxy',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/var/log/trimming-erp/error.log',
    out_file: '/var/log/trimming-erp/out.log',
    log_file: '/var/log/trimming-erp/combined.log',
    time: true,
  }]
}

# Start
sudo mkdir -p /var/log/trimming-erp
sudo chown deploy:deploy /var/log/trimming-erp
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/api.yourdomain.com
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d api.yourdomain.com
```

### Health Checks
```bash
# Proxy health
curl https://api.yourdomain.com/api/health

# Expected response:
# {"status":"ok","manager":{"ok":true,"business":"KEEL"}}
```

## Manager.io Configuration

### Custom Fields (Pre-created)
See `MANAGER_IO_CONFIGURATION.md` for complete list.

### Custom Buttons (Pre-created)
| Button | URL Template |
|--------|-------------|
| Open Trimming ERP | `https://<user>.github.io/trimming-erp/?business={business}` |
| Create PTN | `https://<user>.github.io/trimming-erp/?business={business}&action=create_ptn&item={key}&from_location={location_key}` |
| Create Work Order | `https://<user>.github.io/trimming-erp/?business={business}&action=create_wo&item={key}&ws={ws_code}` |
| QC Inspection | `https://<user>.github.io/trimming-erp/?business={business}&action=qc_inspect&item={key}&location={location_key}` |
| Scan QR/Barcode | `https://<user>.github.io/trimming-erp/?business={business}&action=scan` |
| Vendor OGP | `https://<user>.github.io/trimming-erp/?business={business}&action=create_ogp&vendor={key}` |
| Vendor IGP | `https://<user>.github.io/trimming-erp/?business={business}&action=create_igp&vendor={key}` |
| View Stock Balance | `https://<user>.github.io/trimming-erp/?business={business}&action=stock_balance&item={key}` |

**Note**: Verify actual Manager.io Custom Button placeholder syntax. The above assumes `{business}`, `{key}`, `{entity}`, `{location_key}` format.

### Inventory Locations
Hierarchy already configured in Manager.io. Verify all 13 locations exist and parent-child relationships are correct.

## Database Maintenance

### Backup
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/opt/backups/trimming-erp"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U deploy -h localhost trimming_erp | gzip > $BACKUP_DIR/trimming_erp_$DATE.sql.gz

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/trimming_erp_$DATE.sql.gz s3://your-bucket/backups/
```

### Restore
```bash
gunzip -c backup_file.sql.gz | psql -U deploy -h localhost trimming_erp
```

### Monitoring
```bash
# PM2 monitoring
pm2 monit

# Logs
pm2 logs trimming-erp-proxy

# Database size
psql -U deploy -c "SELECT pg_size_pretty(pg_database_size('trimming_erp'));"
```

## Rollback Procedure

### Frontend
```bash
# 1. Find previous deployment commit
git log --oneline gh-pages -10

# 2. Force push previous version
git push origin <commit-hash>:gh-pages --force

# 3. Or revert in GitHub Actions (re-run previous successful workflow)
```

### Backend
```bash
# 1. Deploy previous Docker image / git commit
cd /opt/trimming-erp-proxy
git checkout <previous-tag>
npm run build
pm2 reload trimming-erp-proxy

# 2. Database rollback (if migration was run)
# Restore from backup
gunzip -c /opt/backups/trimming-erp/trimming_erp_YYYYMMDD_HHMMSS.sql.gz | psql -U deploy trimming_erp
```

## Security Checklist

### Pre-Deployment
- [ ] MANAGER_API_KEY rotated and stored only in proxy .env
- [ ] JWT_SECRET is 64+ random characters
- [ ] Database password is strong and unique
- [ ] Nginx serves only HTTPS (HSTS enabled)
- [ ] Rate limiting configured on proxy
- [ ] CORS restricted to frontend domain only
- [ ] Audit logging enabled
- [ ] Error messages don't leak stack traces in production

### Post-Deployment
- [ ] Verify HTTPS on both frontend and proxy
- [ ] Test Custom Button launches from Manager.io
- [ ] Verify JWT authentication works
- [ ] Confirm audit logs are writing
- [ ] Test rate limiting
- [ ] Verify CORS headers
- [ ] Run security scan (OWASP ZAP)

## Monitoring & Alerting

### Key Metrics
- Proxy uptime (PM2 / systemd)
- API response time (Nginx access logs)
- Database connections (pg_stat_activity)
- Error rate (application logs)
- Manager.io API latency

### Alerting (Optional)
- UptimeRobot / Pingdom for HTTPS endpoints
- PM2 alerting for process crashes
- PostgreSQL pg_stat_monitor for slow queries

## Disaster Recovery

### RTO/RPO Targets
- **RTO**: 1 hour (time to restore service)
- **RPO**: 24 hours (daily backups)

### Recovery Steps
1. Provision new VPS
2. Install dependencies (Node, PostgreSQL, Nginx)
3. Restore database from latest backup
4. Deploy proxy application
5. Configure Nginx + SSL
6. Update DNS if needed
7. Verify Manager.io integration
8. Test critical workflows

## Version Management

### Release Process
1. Create release branch: `release/v1.x.x`
2. Update version in `package.json` (both frontend and proxy)
3. Update CHANGELOG.md
4. Create PR to main
5. After merge, tag: `git tag v1.x.x`
6. GitHub Actions builds and deploys automatically

### Version Format
- Frontend: `v1.0.0` (semver)
- Proxy: `v1.0.0` (aligned with frontend)
- Database migrations: Sequential numbers `001`, `002`, etc.

## Troubleshooting

### Common Issues

**Frontend shows "Disconnected"**
- Check proxy health endpoint
- Verify CORS headers
- Check JWT token not expired
- Verify VITE_API_BASE matches proxy URL

**Manager.io sync fails**
- Check MANAGER_API_KEY validity
- Verify network connectivity to promoerp.promoerp.it
- Check Manager.io API version compatibility
- Review proxy logs for specific errors

**Database connection errors**
- Check PostgreSQL service status
- Verify DATABASE_URL in .env
- Check pg_hba.conf for password auth
- Check connection pool limits

**Custom Button doesn't pass context**
- Verify Manager.io Custom Button URL format
- Check placeholder syntax ({business} vs {Business})
- Test with simple URL first
- Check browser console for errors

## Support Contacts

- **Application Issues**: GitHub Issues
- **Manager.io API**: Manager.io Support
- **Server Infrastructure**: Your DevOps team
- **Security Incidents**: security@yourdomain.com