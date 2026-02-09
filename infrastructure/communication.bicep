// Azure Communication Services - Email Infrastructure
@description('Primary Azure region for resource deployment')
param location string = 'global'

@description('Data residency location')
param dataLocation string = 'australia'

@description('Environment name (e.g., dev, staging, prod)')
param environment string = 'prod'

@description('Custom domain for email (e.g., tech-dive.sydney)')
param emailDomain string = 'tech-dive.sydney'

@description('Tags to apply to all resources')
param tags object = {
  Application: 'BoatFinder'
  Environment: environment
  ManagedBy: 'Bicep'
}

// Communication Services Resource
resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: 'boat-finder-email'
  location: location
  tags: tags
  properties: {
    dataLocation: dataLocation
  }
}

// Email Communication Service
resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: 'boat-finder-email-svc'
  location: location
  tags: tags
  properties: {
    dataLocation: dataLocation
  }
}

// Custom Domain
// Note: Requires DNS verification - domain will be in 'Pending' state until DNS records are added
resource emailDomainResource 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: emailDomain
  location: location
  tags: tags
  properties: {
    domainManagement: 'CustomerManaged'
    userEngagementTracking: 'Disabled'
  }
}

// Link Email Service to Communication Service
resource emailServiceLink 'Microsoft.Communication/communicationServices/domains@2023-04-01' = {
  parent: communicationService
  name: emailDomain
  properties: {
    domainManagement: 'CustomerManaged'
    validationState: 'NotStarted'
  }
  dependsOn: [
    emailDomainResource
  ]
}

// Outputs
output communicationServiceName string = communicationService.name
output communicationServiceEndpoint string = communicationService.properties.hostName
output emailServiceName string = emailService.name
output emailDomainName string = emailDomainResource.name
output connectionString string = communicationService.listKeys().primaryConnectionString

// DNS Records (informational - must be added manually)
output dnsInstructions string = '''
Add these DNS records to ${emailDomain}:

1. Domain Verification (TXT):
   - Name: @
   - Value: Will be shown in Azure Portal after deployment

2. SPF Record (TXT):
   - Name: @
   - Value: v=spf1 include:spf.protection.outlook.com -all

3. DKIM Records (CNAME) - Two records:
   - Name: selector1._domainkey
   - Value: Will be shown in Azure Portal
   
   - Name: selector2._domainkey
   - Value: Will be shown in Azure Portal

4. DMARC Record (TXT):
   - Name: _dmarc
   - Value: v=DMARC1; p=none; rua=mailto:ben@tech-dive.sydney

After adding records, verify domain in Azure Portal.
'''
