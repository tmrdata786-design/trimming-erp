# Trimming ERP - Production, Inventory, QC & Cost Management System

A manufacturing operations application for plastic moulded parts trimming plants, integrated with Manager.io Server Edition.

## Overview

This application manages the complete trimming production lifecycle:
- **Molding Receipts** → Raw material intake
- **PTN** → Internal transfers (Production Transfer Notes)
- **Work Orders** → Shift-based production planning & execution
- **OGP/IGP** → Outsourced vendor gate passes
- **QC** → Quality control with defect classification
- **Rework** → Closed-loop rework with full lineage
- **Vendor Settlement** → Piece-rate earnings & payments (PKR)
- **Employee Costing** → Labour cost allocation
- **Product Costing** → Finished unit cost breakdown
- **Stocktaking** → Monthly physical reconciliation

## Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────┐     Internal      ┌──────────────────┐
│  GitHub Pages   │ ◄─────────────► │  Backend Proxy   │ ◄──────────────►  │  Manager.io API  │
│  (Frontend)     │   REST + WS    │  (Express + PG)  │   X-API-KEY       │  (promoerp.it)   │
└─────────────────┘                └──────────────────┘                   └──────────────────┘
```

### Data Ownership

| Data Category | System of Record |
|---------------|------------------|
| Inventory Items, Locations, Suppliers, Employees | Manager.io |
| Inventory Transfers (PTN), Write-offs, Counts | Manager.io |
| Work Orders, QC, Rework, OGP/IGP | PostgreSQL (App) |
| Vendor Earnings, Employee Costing, Stocktaking | PostgreSQL (App) |

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (for backend proxy)
- Manager.io Server Edition with API access

### Frontend Development
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Type check
npm run lint
```

### Backend Proxy Development
```bash
cd proxy

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
npm run migrate

# Start dev server (http://localhost:3001)
npm run dev
```

### Docker (Optional)
```bash
# Build proxy image
cd proxy
docker build -t trimming-erp-proxy .

# Run with docker-compose
docker-compose up -d
```

## Manager.io Configuration

### Required Custom Fields
See [MANAGER_IO_CONFIGURATION.md](MANAGER_IO_CONFIGURATION.md) for complete list including:
- 1 Checkbox field (QC Required)
- 6 Number fields (Capacity, Rates, Salary, Hours, Workforce)
- 15 Text fields (Types, Stages, References, Affinity)

### Custom Buttons (8 pre-created)
- Open Trimming ERP
- Create PTN
- Create Work Order
- QC Inspection
- Scan QR/Barcode
- Vendor OGP
- Vendor IGP
- View Stock Balance

### Inventory Locations (13 pre-created)
Hierarchical structure: Molding Bay → Raw Store → Rack → Shelf → Bin, plus QC, Rework, Finished, Packing, Dispatch, Vendor Sites, Workstations

## Project Structure

```
├── src/                          # Frontend (React 19 + TypeScript + Vite)
│   ├── components/               # Shared UI components
│   ├── views/                    # 15 main application views
│   ├── services/                 # API clients, storage, inventory engine
│   ├── types/                    # TypeScript interfaces
│   └── App.tsx                   # Main app with routing
├── proxy/                        # Backend proxy (Express + PostgreSQL)
│   ├── src/
│   │   ├── routes/               # API endpoints
│   │   ├── services/             # Manager.io API client
│   │   ├── middleware/           # Auth, audit logging
│   │   ├── db/                   # Database pool, migrations
│   │   └── utils/                # Config, validation
│   └── package.json
├── .github/workflows/            # CI/CD pipelines
├── MANAGER_IO_CONFIGURATION.md   # Custom fields & buttons audit
├── INTEGRATION_ARCHITECTURE.md   # Technical integration design
├── DATA_MAPPING.md               # App types ↔ Manager.io fields
├── DATABASE_SCHEMA.md            # PostgreSQL schema
├── BUSINESS_WORKFLOWS.md         # Operational workflows
├── TESTING.md                    # Test strategy & scenarios
├── DEPLOYMENT.md                 # Deployment guide
└── KNOWN_LIMITATIONS.md          # Documented limitations
```

## Key Features

### Inventory Engine
- Double-entry stock movements
- Negative stock prevention
- Atomic transfers with audit trail
- Manager.io Inventory Transfer integration

### Work Order Management
- 70 workstations (WS-01..70)
- 3 shifts with overnight support
- Material balance reconciliation: `Issued = Trimmed + Returned + Closing`
- Printable shift sheets

### QC & Rework
- Invariant: `Inspected = Accepted + Rejected`
- Defect classification (6 types)
- Multi-cycle rework with lineage tracking
- Payment eligibility rules

### Vendor & Costing
- In-house piece-rate vendors
- Outsourced vendors with OGP/IGP
- Employee salary cost allocation (3 methods)
- Product cost breakdown (5 components)

### Stocktaking
- Blind physical counts
- Variance analysis (qty + PKR)
- Approved adjustments → Manager.io Inventory Write-off/Receipt

## Documentation

| Document | Purpose |
|----------|---------|
| [MANAGER_IO_CONFIGURATION.md](MANAGER_IO_CONFIGURATION.md) | Custom fields, locations, buttons audit |
| [INTEGRATION_ARCHITECTURE.md](INTEGRATION_ARCHITECTURE.md) | Proxy design, auth, data ownership |
| [DATA_MAPPING.md](DATA_MAPPING.md) | App types ↔ Manager.io field mapping |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | PostgreSQL schema for operational data |
| [BUSINESS_WORKFLOWS.md](BUSINESS_WORKFLOWS.md) | 11 core manufacturing workflows |
| [TESTING.md](TESTING.md) | Unit, integration, E2E test strategy |
| [DEPLOYMENT.md](DEPLOYMENT.md) | GitHub Pages + VPS deployment |
| [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) | Documented constraints & future work |

## Testing

```bash
# Unit tests (when implemented)
npm run test

# E2E tests (when implemented)
npx playwright test

# Automated scenarios (in-app)
# Navigate to "Automated Test Suite" view
```

## Deployment

### Frontend → GitHub Pages
1. Push to `main` branch
2. GitHub Actions builds & deploys automatically
3. Available at `https://<user>.github.io/trimming-erp/`

### Backend Proxy → VPS
1. Configure VPS with Node.js, PostgreSQL, Nginx
2. Set environment variables
3. Deploy via PM2
4. Configure Nginx reverse proxy + SSL

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete guide.

## Security

- API keys never in frontend (server-side only)
- JWT authentication with 8h expiry
- Role-based access control (8 roles)
- Audit logging on all mutations
- Rate limiting on proxy endpoints
- CORS restricted to frontend domain

## License

Apache-2.0 - See [LICENSE](LICENSE) for details.

## Support

- **Issues**: GitHub Issues
- **Manager.io API**: Manager.io Documentation
- **Architecture Questions**: See documentation files above