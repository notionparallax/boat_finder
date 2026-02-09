// Static Web App Application Settings
@description('Static Web App name')
param staticWebAppName string

@description('Cosmos DB connection string')
@secure()
param cosmosConnectionString string

@description('Communication Services connection string')
@secure()
param communicationConnectionString string

@description('Azure AD B2C Client ID')
@secure()
param aadClientId string

@description('Azure AD B2C Client Secret')
@secure()
param aadClientSecret string

@description('Google OAuth Client ID')
@secure()
param googleClientId string

@description('Google OAuth Client Secret')
@secure()
param googleClientSecret string

@description('Email from address')
param emailFrom string

@description('Admin email address')
param adminEmail string

// Reference existing Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' existing = {
  name: staticWebAppName
}

// Application Settings
resource appSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    AZURE_COSMOS_CONNECTION_STRING: cosmosConnectionString
    AZURE_COMMUNICATION_CONNECTION_STRING: communicationConnectionString
    AAD_CLIENT_ID: aadClientId
    AAD_CLIENT_SECRET: aadClientSecret
    GOOGLE_CLIENT_ID: googleClientId
    GOOGLE_CLIENT_SECRET: googleClientSecret
    EMAIL_FROM: emailFrom
    ADMIN_EMAIL: adminEmail
  }
}

output appSettingsConfigured bool = true
