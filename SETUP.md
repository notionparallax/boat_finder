# SETUP GUIDE - Boat Finder

Complete step-by-step guide to deploy Boat Finder to Azure.

## Prerequisites Checklist

- [ ] Azure subscription (work or personal)
- [ ] GitHub account
- [ ] Azure CLI installed
- [ ] Node.js 20+ installed
- [x] Domain purchased: **tech-dive.sydney**

## Phase 1: Initial Setup (30 minutes)

### 1.1 Clone and Install

```powershell
cd c:\Users\bdoherty\source\repos\boat_finder
npm install
cd api
npm install
cd ..
```

### 1.2 Test Locally

```powershell
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - API
cd api
npm start
```

Visit <http://localhost:5173> - you should see the login screen (auth won't work locally yet).

## Phase 2: Azure Resources (45 minutes)

### 2.1 Login to Azure

```powershell
az login
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

### 2.2 Create Resource Group

```powershell
az group create \
  --name rg-boat-finder \
  --location australiaeast
```

### 2.3 Create Cosmos DB

```powershell
# Create account (takes ~5 minutes)
az cosmosdb create \
  --name boat-finder-cosmos \
  --resource-group rg-boat-finder \
  --locations regionName=australiaeast \
  --kind GlobalDocumentDB \
  --enable-free-tier false \
  --capabilities EnableServerless

# Create database
az cosmosdb sql database create \
  --account-name boat-finder-cosmos \
  --resource-group rg-boat-finder \
  --name BoatFinderDB

# Create containers
az cosmosdb sql container create \
  --account-name boat-finder-cosmos \
  --database-name BoatFinderDB \
  --resource-group rg-boat-finder \
  --name Users \
  --partition-key-path "/userId"

az cosmosdb sql container create \
  --account-name boat-finder-cosmos \
  --database-name BoatFinderDB \
  --resource-group rg-boat-finder \
  --name Availability \
  --partition-key-path "/userId"

az cosmosdb sql container create \
  --account-name boat-finder-cosmos \
  --database-name BoatFinderDB \
  --resource-group rg-boat-finder \
  --name DiveSites \
  --partition-key-path "/siteId"

az cosmosdb sql container create \
  --account-name boat-finder-cosmos \
  --database-name BoatFinderDB \
  --resource-group rg-boat-finder \
  --name SiteInterest \
  --partition-key-path "/siteId"

# Get connection string
az cosmosdb keys list \
  --name boat-finder-cosmos \
  --resource-group rg-boat-finder \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

**Save the connection string** - you'll need it later.

### 2.4 Create Static Web App

```powershell
az staticwebapp create \
  --name boat-finder-app \
  --resource-group rg-boat-finder \
  --location australiaeast \
  --source https://github.com/notionparallax/boat-finder \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "build" \
  --login-with-github
```

This will open GitHub authorization. After authorizing, it will create a GitHub Actions workflow automatically.

**Get the deployment token:**

```powershell
az staticwebapp secrets list \
  --name boat-finder-app \
  --resource-group rg-boat-finder \
  --query "properties.apiKey" \
  --output tsv
```

## Phase 3: Configure Authentication (60 minutes)

### 3.1 Create Azure AD B2C Tenant

1. Go to Azure Portal → Create a resource → Azure Active Directory B2C
2. Choose "Create a new Azure AD B2C Tenant"
3. Fill in:
   - Organization name: `BoatFinderAuth`
   - Initial domain name: `boatfinderauth` (must be unique)
   - Country: Australia
4. Create (takes ~2 minutes)
5. Switch to the new tenant (top-right corner)

### 3.2 Register Application

1. In B2C tenant → App registrations → New registration
2. Name: `boat-finder-webapp`
3. Redirect URIs:
   - Type: Web
   - URI: `https://tech-dive.sydney/.auth/login/aad/callback`
   - URI: `https://boat-finder-app.azurestaticapps.net/.auth/login/aad/callback` (for testing)
4. Register
5. Copy **Application (client) ID** - save this
6. Go to Certificates & secrets → New client secret
7. Description: `boat-finder-secret`
8. Expires: 24 months
9. Add → Copy **Value** - save this (you won't see it again!)

### 3.3 Configure Google Authentication

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: `boat-finder`
3. Enable Google+ API
4. Credentials → Create credentials → OAuth 2.0 Client ID
5. Application type: Web application
6. Name: `Boat Finder`
7. Authorized redirect URIs:

   ```
   https://tech-dive.sydney/.auth/login/google/callback
   https://boat-finder-app.azurestaticapps.net/.auth/login/google/callback
   ```

8. Create → Copy **Client ID** and **Client Secret**

### 3.4 Configure Microsoft Authentication

1. In Azure Portal (main tenant, not B2C) → App registrations → New registration
2. Name: `boat-finder-microsoft-auth`
3. Supported account types: Personal Microsoft accounts only
4. Redirect URIs:
   - `https://tech-dive.sydney/.auth/login/aad/callback`
   - `https://boat-finder-app.azurestaticapps.net/.auth/login/aad/callback` (for testing)
5. Register → Copy **Application (client) ID**
6. Certificates & secrets → New client secret → Copy **Value**

### 3.5 Configure Static Web App Environment

```powershell
# Set authentication secrets
az staticwebapp appsettings set \
  --name boat-finder-app \
  --resource-group rg-boat-finder \
  --setting-names \
    AAD_CLIENT_ID="<B2C_CLIENT_ID>" \
    AAD_CLIENT_SECRET="<B2C_CLIENT_SECRET>" \
    GOOGLE_CLIENT_ID="<GOOGLE_CLIENT_ID>" \
    GOOGLE_CLIENT_SECRET="<GOOGLE_CLIENT_SECRET>" \
    AZURE_COSMOS_CONNECTION_STRING="<COSMOS_CONNECTION_STRING>"
```

## Phase 4: Configure Custom Domain (10 minutes)

### 4.1 Add DNS Records

In your domain registrar (where you bought tech-dive.sydney), add these DNS records:

```
Type: CNAME
Name: www
Value: boat-finder-app.azurestaticapps.net
TTL: 3600

Type: CNAME
Name: @ (or leave blank for root domain)
Value: boat-finder-app.azurestaticapps.net
TTL: 3600
```

**Note:** DNS propagation can take 1-48 hours. You can test with:

```powershell
nslookup tech-dive.sydney
```

### 4.2 Configure Static Web App Custom Domain

```powershell
# Add custom domain
az staticwebapp hostname set \
  --name boat-finder-app \
  --resource-group rg-boat-finder \
  --hostname tech-dive.sydney

az staticwebapp hostname set \
  --name boat-finder-app \
  --resource-group rg-boat-finder \
  --hostname www.tech-dive.sydney
```

Azure will automatically provision free SSL certificates via Let's Encrypt.

## Phase 5: Deploy Application (15 minutes)

### 5.1 Push to GitHub

```powershell
cd c:\Users\bdoherty\source\repos\boat_finder
git init
git add .
git commit -m "Initial commit - Boat Finder MVP"
git branch -M main
git remote add origin https://github.com/notionparallax/boat-finder.git
git push -u origin main
```

GitHub Actions will automatically deploy! Check progress:

- Go to GitHub → Your repo → Actions tab

### 5.2 Verify Deployment

1. Visit: `https://tech-dive.sydney` (or `https://boat-finder-app.azurestaticapps.net` before DNS propagates)
2. Click "Sign in with Google" or "Sign in with Microsoft"
3. Complete signup form (first time)
4. You should see the calendar!

## Phase 6: Seed Database (10 minutes)

### 6.1 Create Seed Script

Create `scripts/seed-sites.js`:

```javascript
// Script to populate dive sites from CSV
// Run with: node scripts/seed-sites.js
```

### 6.2 Run Seed Script

```powershell
cd scripts
node seed-sites.js
```

This will populate the 53 Sydney dive sites from `Wreck locations- wrecks.csv.csv`.

## Phase 7: Promote Yourself to Admin (5 minutes)

### 7.1 Get Your User ID

1. Log into the app
2. Open browser dev tools → Network tab
3. Refresh page → Find request to `/api/users/me`
4. Copy your `userId` from the response

### 7.2 Promote via Azure Portal

1. Azure Portal → Cosmos DB → Data Explorer
2. BoatFinderDB → Users container
3. Find your user document
4. Edit JSON → Change `"isOperator": false` to `"isOperator": true`
5. Save

### 7.3 Verify

1. Refresh the app
2. You should now see "Admin" link in header
3. Click Admin → You can now promote other users

## Phase 8: Email Setup (30 minutes)

### 8.1 Create Email Communication Service

```powershell
# Create Communication Services resource
az communication create \
  --name boat-finder-email \
  --resource-group rg-boat-finder \
  --location global \
  --data-location australia

# Create Email Communication Service
az communication email domain create \
  --email-service-name boat-finder-email \
  --resource-group rg-boat-finder \
  --name tech-dive.sydney \
  --domain-management CustomerManaged
```

### 8.2 Get DNS Records

```powershell
az communication email domain show \
  --email-service-name boat-finder-email \
  --resource-group rg-boat-finder \
  --name tech-dive.sydney
```

This will output DNS records you need to add. Example output:

```
verificationRecords:
  Domain:
    - Type: TXT
      Name: @
      Value: "azure-verification=abc123..."
  
  SPF:
    - Type: TXT
      Name: @
      Value: "v=spf1 include:spf.protection.outlook.com -all"
  
  DKIM:
    - Type: CNAME
      Name: selector1._domainkey
      Value: selector1-boat-finder-email._domainkey.azurecomm.net
    - Type: CNAME
      Name: selector2._domainkey
      Value: selector2-boat-finder-email._domainkey.azurecomm.net
  
  DMARC:
    - Type: TXT
      Name: _dmarc
      Value: "v=DMARC1; p=none; rua=mailto:ben@tech-dive.sydney"
```

### 8.3 Add DNS Records

Add all the DNS records from step 8.2 to your domain registrar.

**Wait 1-24 hours** for DNS propagation.

### 8.4 Verify Domain

```powershell
az communication email domain verify \
  --email-service-name boat-finder-email \
  --resource-group rg-boat-finder \
  --name tech-dive.sydney
```

Status should change to "Verified" (may take several attempts as DNS propagates).

### 8.5 Get Connection String

```powershell
az communication list-key \
  --name boat-finder-email \
  --resource-group rg-boat-finder
```

Copy the connection string.

### 8.6 Update Static Web App Settings

```powershell
az staticwebapp appsettings set \
  --name boat-finder-app \
  --resource-group rg-boat-finder \
  --setting-names \
    AZURE_COMMUNICATION_CONNECTION_STRING="<CONNECTION_STRING>" \
    EMAIL_FROM="noreply@tech-dive.sydney" \
    ADMIN_EMAIL="ben@tech-dive.sydney"
```

### 8.7 Test Email

1. Have a new user sign up at `https://tech-dive.sydney`
2. You should receive email notification at <ben@tech-dive.sydney>
3. Check Azure Portal → Communication Services → Email logs if not received

## Phase 9: Testing Checklist

- [ ] Custom domain loads: <https://tech-dive.sydney>
- [ ] SSL certificate is active (green padlock)
- [ ] Can log in with Google
- [ ] Can log in with Microsoft
- [ ] Profile page loads and can be edited
- [ ] Calendar displays (even if empty)
- [ ] Can toggle availability on calendar days
- [ ] Dive sites page loads with 53 sites
- [ ] Can add new dive site
- [ ] Can toggle interest in sites
- [ ] Admin page shows all users
- [ ] Can promote another user to operator

## Troubleshooting

### Auth not working

- Check `staticwebapp.config.json` redirect URIs include `tech-dive.sydney`
- Verify redirect URIs in Google/Microsoft/B2C apps include `https://tech-dive.sydney/.auth/login/.../callback`
- Verify client IDs/secrets are set correctly in Static Web App settings
- Try using the Azure-provided URL first: `https://boat-finder-app.azurestaticapps.net`

### API errors

- Check Cosmos DB connection string in app settings
- Verify containers exist with correct partition keys
- Check Function logs in Azure Portal

### Calendar not loading

- Check browser console for errors
- Verify API is reachable at `/api/availability/calendar`
- Check CORS settings

## Migration to Personal Azure

When ready to move from work Azure to personal:

1. Export Cosmos DB data:

```powershell
az cosmosdb sql container export \
  --account-name boat-finder-cosmos \
  --database-name BoatFinderDB \
  --name Users \
  --output users-export.json
```

1. Run all Phase 2-4 steps in personal subscription
2. Import data to new Cosmos DB
3. Update DNS if using custom domain

**Estimated total time: ~4 hours** (including DNS propagation wait time)

**Note:** DNS propagation for custom domain (Phase 4) and email (Phase 8) can take 1-48 hours. You can proceed with other phases while waiting.

## Support

If stuck, check:

1. Azure Portal → Resource → Diagnose and solve problems
2. GitHub Actions logs
3. Browser console errors

Contact: <ben@notionparallax.co.uk>
