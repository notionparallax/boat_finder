// Main Infrastructure Template
targetScope = 'subscription'

@description('Primary Azure region for resource deployment')
param location string = 'australiaeast'

@description('Environment name (e.g., dev, staging, prod)')
param environment string = 'prod'

@description('Resource group name')
param resourceGroupName string = 'rg-boat-finder'

@description('GitHub repository URL')
param repositoryUrl string = 'https://github.com/notionparallax/boat-finder'

@description('GitHub branch to deploy from')
param branch string = 'main'

@description('Custom domain for email and web app')
param customDomain string = 'tech-dive.sydney'

@description('Azure AD B2C Client ID for authentication')
@secure()
param aadClientId string

@description('Azure AD B2C Client Secret for authentication')
@secure()
param aadClientSecret string

@description('Google OAuth Client ID')
@secure()
param googleClientId string

@description('Google OAuth Client Secret')
@secure()
param googleClientSecret string

@description('Admin email address for notifications')
param adminEmail string = 'ben@tech-dive.sydney'

// Common tags
var tags = {
  Application: 'BoatFinder'
  Environment: environment
  ManagedBy: 'Bicep'
  CostCenter: 'Community'
}

// Resource Group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// Cosmos DB Module
module cosmosDb 'cosmosdb.bicep' = {
  scope: resourceGroup
  name: 'cosmosdb-deployment'
  params: {
    location: location
    environment: environment
    tags: tags
  }
}

// Static Web App Module
module staticWebApp 'staticwebapp.bicep' = {
  scope: resourceGroup
  name: 'staticwebapp-deployment'
  params: {
    location: location
    environment: environment
    repositoryUrl: repositoryUrl
    branch: branch
    tags: tags
  }
}

// Communication Services Module
module communication 'communication.bicep' = {
  scope: resourceGroup
  name: 'communication-deployment'
  params: {
    location: 'global'
    dataLocation: 'australia'
    environment: environment
    emailDomain: customDomain
    tags: tags
  }
}

// Static Web App Application Settings
module staticWebAppSettings 'staticwebapp-settings.bicep' = {
  scope: resourceGroup
  name: 'staticwebapp-settings-deployment'
  params: {
    staticWebAppName: staticWebApp.outputs.staticWebAppName
    cosmosConnectionString: cosmosDb.outputs.connectionString
    communicationConnectionString: communication.outputs.connectionString
    aadClientId: aadClientId
    aadClientSecret: aadClientSecret
    googleClientId: googleClientId
    googleClientSecret: googleClientSecret
    emailFrom: 'noreply@${customDomain}'
    adminEmail: adminEmail
  }
  dependsOn: [
    cosmosDb
    staticWebApp
    communication
  ]
}

// Outputs
output resourceGroupName string = resourceGroup.name
output cosmosDbEndpoint string = cosmosDb.outputs.cosmosEndpoint
output staticWebAppUrl string = staticWebApp.outputs.staticWebAppUrl
output customDomainUrl string = 'https://${customDomain}'
output communicationServiceName string = communication.outputs.communicationServiceName

output deploymentInstructions string = '''
===========================================
Boat Finder - Deployment Complete
===========================================

✅ Resource Group: ${resourceGroup.name}
✅ Cosmos DB: ${cosmosDb.outputs.cosmosAccountName}
✅ Static Web App: ${staticWebApp.outputs.staticWebAppName}
✅ Communication Services: ${communication.outputs.communicationServiceName}

🌐 URLs:
   - Azure URL: ${staticWebApp.outputs.staticWebAppUrl}
   - Custom Domain: https://${customDomain} (after DNS setup)

📋 Next Steps:

1. Configure DNS for Custom Domain:
   - Add CNAME record: www → boat-finder-app.azurestaticapps.net
   - Add CNAME record: @ → boat-finder-app.azurestaticapps.net

2. Configure DNS for Email (see Azure Portal for exact values):
   - Add TXT record for domain verification
   - Add SPF, DKIM, and DMARC records
   - Verify domain in Azure Portal

3. Seed Database:
   cd scripts
   AZURE_COSMOS_CONNECTION_STRING="..." node seed-sites.js

4. Promote Yourself to Admin:
   - Log into the app
   - Go to Azure Portal → Cosmos DB → Users container
   - Find your user and set isOperator: true

5. Test the Application:
   - Sign in with Google or Microsoft
   - Complete your profile
   - Toggle availability on calendar
   - Add/view dive sites

📊 Estimated Monthly Cost: $3-7 AUD
   - Cosmos DB (Serverless): $1-3
   - Static Web Apps: Free
   - Communication Services: $2-4
   - Data Transfer: <$1

===========================================
'''
