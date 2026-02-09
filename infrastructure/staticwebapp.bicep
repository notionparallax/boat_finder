// Azure Static Web Apps - Main Infrastructure
@description('Primary Azure region for resource deployment')
param location string = 'australiaeast'

@description('Environment name (e.g., dev, staging, prod)')
param environment string = 'prod'

@description('GitHub repository URL')
param repositoryUrl string = 'https://github.com/notionparallax/boat-finder'

@description('GitHub branch to deploy from')
param branch string = 'main'

@description('Tags to apply to all resources')
param tags object = {
  Application: 'BoatFinder'
  Environment: environment
  ManagedBy: 'Bicep'
}

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'boat-finder-app'
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'build'
      appBuildCommand: 'npm run build'
      apiBuildCommand: 'npm install'
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
  }
}

// Custom Domain (requires manual DNS setup first)
// Uncomment after DNS is configured
/*
resource customDomain 'Microsoft.Web/staticSites/customDomains@2023-01-01' = {
  parent: staticWebApp
  name: 'tech-dive.sydney'
  properties: {}
}

resource customDomainWww 'Microsoft.Web/staticSites/customDomains@2023-01-01' = {
  parent: staticWebApp
  name: 'www.tech-dive.sydney'
  properties: {}
}
*/

// Outputs
output staticWebAppName string = staticWebApp.name
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output staticWebAppId string = staticWebApp.id
