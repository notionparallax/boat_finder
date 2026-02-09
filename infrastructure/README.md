# Boat Finder Infrastructure

Infrastructure as Code (IaC) for deploying Boat Finder to Azure using Bicep templates.

## 📁 Files

- **main.bicep** - Main orchestration template (subscription-level)
- **cosmosdb.bicep** - Cosmos DB database and containers
- **staticwebapp.bicep** - Static Web App configuration
- **communication.bicep** - Email Communication Services
- **staticwebapp-settings.bicep** - Application settings and secrets

## 🚀 Deployment

### Prerequisites

1. Azure CLI installed
2. Azure subscription access
3. GitHub repository set up
4. OAuth credentials obtained (Google, Microsoft)
5. Azure AD B2C tenant created

### Quick Deploy

```powershell
# Login to Azure
az login
az account set --subscription "YOUR_SUBSCRIPTION_NAME"

# Deploy all infrastructure
az deployment sub create \
  --location australiaeast \
  --template-file infrastructure/main.bicep \
  --parameters \
    resourceGroupName='rg-boat-finder' \
    environment='prod' \
    repositoryUrl='https://github.com/notionparallax/boat-finder' \
    branch='main' \
    customDomain='tech-dive.sydney' \
    aadClientId='YOUR_B2C_CLIENT_ID' \
    aadClientSecret='YOUR_B2C_SECRET' \
    googleClientId='YOUR_GOOGLE_CLIENT_ID' \
    googleClientSecret='YOUR_GOOGLE_SECRET' \
    adminEmail='ben@tech-dive.sydney'
```

### Step-by-Step Deploy

#### 1. Deploy Resource Group and Cosmos DB

```powershell
az group create \
  --name rg-boat-finder \
  --location australiaeast

az deployment group create \
  --resource-group rg-boat-finder \
  --template-file infrastructure/cosmosdb.bicep \
  --parameters environment='prod'
```

#### 2. Deploy Static Web App

```powershell
az deployment group create \
  --resource-group rg-boat-finder \
  --template-file infrastructure/staticwebapp.bicep \
  --parameters \
    repositoryUrl='https://github.com/notionparallax/boat-finder' \
    branch='main'
```

#### 3. Deploy Communication Services

```powershell
az deployment group create \
  --resource-group rg-boat-finder \
  --template-file infrastructure/communication.bicep \
  --parameters emailDomain='tech-dive.sydney'
```

#### 4. Configure Application Settings

```powershell
# Get connection strings
COSMOS_CONNECTION=$(az cosmosdb keys list \
  --name boat-finder-cosmos \
  --resource-group rg-boat-finder \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv)

COMM_CONNECTION=$(az communication list-key \
  --name boat-finder-email \
  --resource-group rg-boat-finder \
  --query primaryConnectionString \
  --output tsv)

# Deploy settings
az deployment group create \
  --resource-group rg-boat-finder \
  --template-file infrastructure/staticwebapp-settings.bicep \
  --parameters \
    staticWebAppName='boat-finder-app' \
    cosmosConnectionString="$COSMOS_CONNECTION" \
    communicationConnectionString="$COMM_CONNECTION" \
    aadClientId='YOUR_B2C_CLIENT_ID' \
    aadClientSecret='YOUR_B2C_SECRET' \
    googleClientId='YOUR_GOOGLE_CLIENT_ID' \
    googleClientSecret='YOUR_GOOGLE_SECRET' \
    emailFrom='noreply@tech-dive.sydney' \
    adminEmail='ben@tech-dive.sydney'
```

## 🔧 Configuration

### Custom Domain Setup

After deployment, configure DNS records:

```
# Web App Custom Domain
Type: CNAME
Name: www
Value: boat-finder-app.azurestaticapps.net

Type: CNAME
Name: @
Value: boat-finder-app.azurestaticapps.net
```

Then uncomment the custom domain resources in `staticwebapp.bicep` and redeploy.

### Email Domain Setup

Get DNS records from Azure Portal or deployment output:

```powershell
az deployment group show \
  --resource-group rg-boat-finder \
  --name communication-deployment \
  --query properties.outputs.dnsInstructions.value
```

Add the DNS records to your domain registrar, then verify:

```powershell
az communication email domain verify \
  --email-service-name boat-finder-email-svc \
  --resource-group rg-boat-finder \
  --name tech-dive.sydney
```

## 📊 Resource Overview

| Resource | Type | SKU | Region | Purpose |
|----------|------|-----|--------|---------|
| boat-finder-cosmos | Cosmos DB | Serverless | Australia East | Database |
| boat-finder-app | Static Web App | Free | Australia East | Frontend + API |
| boat-finder-email | Communication Services | Standard | Global | Email notifications |

## 💰 Cost Estimate

- **Cosmos DB (Serverless)**: $1-3/month
- **Static Web Apps (Free)**: $0/month
- **Communication Services**: $2-4/month
- **Data Transfer**: <$1/month

**Total: $3-7 AUD/month**

## 🔐 Secrets Management

Never commit secrets! Use Azure Key Vault or parameter files:

```powershell
# Create parameters file (DO NOT COMMIT)
cat > infrastructure/main.parameters.json <<EOF
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "aadClientId": { "value": "YOUR_VALUE" },
    "aadClientSecret": { "value": "YOUR_VALUE" },
    "googleClientId": { "value": "YOUR_VALUE" },
    "googleClientSecret": { "value": "YOUR_VALUE" }
  }
}
EOF

# Deploy with parameters file
az deployment sub create \
  --location australiaeast \
  --template-file infrastructure/main.bicep \
  --parameters infrastructure/main.parameters.json
```

Add to `.gitignore`:

```
infrastructure/*.parameters.json
```

## 🔄 Updates and Redeployment

Bicep deployments are idempotent. Rerun to update:

```powershell
az deployment sub create \
  --location australiaeast \
  --template-file infrastructure/main.bicep \
  --parameters @infrastructure/main.parameters.json
```

## 🗑️ Cleanup

To delete all resources:

```powershell
az group delete --name rg-boat-finder --yes --no-wait
```

## 📚 References

- [Azure Bicep Documentation](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Cosmos DB Bicep Reference](https://learn.microsoft.com/azure/templates/microsoft.documentdb/databaseaccounts)
- [Static Web Apps Bicep Reference](https://learn.microsoft.com/azure/templates/microsoft.web/staticsites)
- [Communication Services Bicep Reference](https://learn.microsoft.com/azure/templates/microsoft.communication/communicationservices)
