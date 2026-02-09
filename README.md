# Boat Finder - Sydney Tech Diving Availability Coordinator

A web application that connects technical divers with boat operators in Sydney by flipping the traditional booking paradigm - divers indicate their availability, and operators identify promising days.

## 📋 Project Status

✅ **Frontend**: Complete SvelteKit application with all UI components
✅ **API Structure**: Azure Functions setup with example endpoints
✅ **Domain**: tech-dive.sydney purchased and ready for configuration
✅ **Infrastructure**: Bicep templates ready (see `infrastructure/` folder - to be created)
⏳ **Deployment**: Requires Azure account setup and DNS configuration

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Azure account
- Domain: **tech-dive.sydney** (purchased, ready for DNS configuration)

### Local Development

1. **Install dependencies:**

```powershell
npm install
cd api
npm install
cd ..
```

1. **Start the frontend:**

```powershell
npm run dev
```

1. **Start the API (separate terminal):**

```powershell
cd api
npm start
```

1. **Access the app:**

- Frontend: <http://localhost:5173>
- API: <http://localhost:7071>

## 🏗️ Project Structure

```
boat-finder/
├── src/                          # SvelteKit frontend
│   ├── routes/                   # Pages
│   │   ├── +page.svelte         # Calendar view
│   │   ├── sites/               # Dive sites
│   │   ├── profile/             # User profile
│   │   └── admin/               # Admin panel
│   ├── lib/
│   │   ├── components/          # Svelte components
│   │   ├── api/                 # API client
│   │   ├── stores/              # Svelte stores
│   │   └── utils/               # Helper functions
│   └── app.css                  # Global styles
├── api/                         # Azure Functions
│   ├── src/
│   │   ├── functions/           # Function handlers
│   │   └── utils/               # Shared utilities
│   └── package.json
├── infrastructure/              # Bicep IaC (to be created)
├── .github/workflows/           # CI/CD (to be created)
└── staticwebapp.config.json     # Azure Static Web App config
```

## 🎨 Features

### For Divers

- Toggle availability on calendar days
- View other divers' interest (anonymized)
- Express interest in dive sites
- Color-coded pills by depth certification (30m pale blue → 100m blue-black)

### For Operators

- View detailed diver information (name, phone, cert, depth)
- Filter by minimum depth certification
- Tap-to-call on mobile
- Daily email digest of promising days
- See site interest analytics

### For Admin

- Promote users to operator role
- View all users
- Receive new user notifications

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root:

```
# Not needed for local development - use staticwebapp.config.json
```

### Azure Configuration

Required Azure resources:

1. **Static Web App** (Free tier)
2. **Cosmos DB** (Serverless, Australia East)
3. **Azure AD B2C** (Free tier) - Google & Microsoft auth
4. **Communication Services** (Email) - requires domain

## 📦 Deployment

### Option 1: GitHub Actions (Recommended)

1. Push code to GitHub: `notionparallax/boat-finder`
2. Create Azure resources using Bicep
3. Configure GitHub secrets:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`
4. Push to main branch → auto-deploys

### Option 2: Azure CLI

```powershell
# Build frontend
npm run build

# Deploy (requires Azure Static Web Apps CLI)
swa deploy ./build --api-location ./api
```

## 🗄️ Database Setup

### Cosmos DB Containers

Create these containers in `BoatFinderDB`:

1. **Users**
   - Partition key: `/userId`
   - Items: user profiles

2. **Availability**
   - Partition key: `/userId`
   - Items: date availability records

3. **DiveSites**
   - Partition key: `/siteId`
   - Items: dive site information

4. **SiteInterest**
   - Partition key: `/siteId`
   - Items: diver interest in sites

### Seed Data

53 Sydney dive sites from `Wreck locations- wrecks.csv.csv` - seed script to be created.

## 🎯 Next Steps

### Immediate (Before First Deploy)

1. **Purchase domain** (e.g., `sydneytechdiving.au`)
2. **Create Azure resources:**
   - Resource Group: `rg-boat-finder`
   - Region: Australia East
3. **Configure Azure AD B2C:**
   - Create tenant
   - Register Google & Microsoft identity providers
   - Configure user flows
4. **Deploy Bicep infrastructure**
5. **Seed Cosmos DB with dive sites**

### Post-Deploy

1. Test authentication flow
2. Create your admin account
3. Invite beta testers (10-20 divers, 2-3 operators)
4. Configure email notifications once domain is verified
5. Gather feedback and iterate

## 💰 Cost Estimate

- Static Web App: **$0** (Free tier)
- Cosmos DB: **$2-5/month** (Serverless, low usage)
- Azure AD B2C: **$0** (Free tier, <50K auth/month)
- Email: **$0** (Free tier, <500 emails/month)
- Domain: **~$1-2/month** (annual cost divided by 12)

**Total: ~$3-7/month** ✅ Well under $10 target

## 🛠️ Development Notes

- **Framework**: SvelteKit 2.x with Svelte 5 runes
- **Styling**: Raw CSS with scoped styles + Melt UI for interactions
- **Language**: Modern JavaScript (ES2022+), no TypeScript
- **Icons**: Lucide Svelte
- **Auth**: Azure Static Web Apps built-in auth
- **Timezone**: Display in Sydney time (AEDT/AEST), store UTC

## 📝 TODO

- [ ] Create Bicep infrastructure templates
- [ ] Create GitHub Actions workflow
- [ ] Implement remaining Azure Functions (availability, sites, admin)
- [ ] Create database seed script
- [ ] Add email notification logic (pending domain)
- [ ] Write tests
- [ ] Create operator documentation

## 👤 Admin Contact

**Ben Doherty**

- Email: <ben@notionparallax.co.uk>
- GitHub: [@notionparallax](https://github.com/notionparallax)

## 📄 License

Private project - Community service for Sydney tech diving community

---

**Status**: 🚧 In Development - Core application complete, infrastructure setup pending
