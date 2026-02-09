// Azure Cosmos DB for NoSQL - Main Infrastructure
@description('Primary Azure region for resource deployment')
param location string = 'australiaeast'

@description('Environment name (e.g., dev, staging, prod)')
param environment string = 'prod'

@description('Tags to apply to all resources')
param tags object = {
  Application: 'BoatFinder'
  Environment: environment
  ManagedBy: 'Bicep'
}

// Cosmos DB Account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: 'boat-finder-cosmos'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: {
        tier: 'Continuous7Days'
      }
    }
    enableFreeTier: false
    publicNetworkAccess: 'Enabled'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
  }
}

// Database
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosAccount
  name: 'BoatFinderDB'
  properties: {
    resource: {
      id: 'BoatFinderDB'
    }
  }
}

// Users Container
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'Users'
  properties: {
    resource: {
      id: 'Users'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          { path: '/*' }
        ]
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    }
  }
}

// Availability Container
resource availabilityContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'Availability'
  properties: {
    resource: {
      id: 'Availability'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          { path: '/*' }
        ]
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    }
  }
}

// DiveSites Container
resource diveSitesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'DiveSites'
  properties: {
    resource: {
      id: 'DiveSites'
      partitionKey: {
        paths: ['/siteId']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          { path: '/*' }
        ]
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    }
  }
}

// SiteInterest Container
resource siteInterestContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'SiteInterest'
  properties: {
    resource: {
      id: 'SiteInterest'
      partitionKey: {
        paths: ['/siteId']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          { path: '/*' }
        ]
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    }
  }
}

// Outputs
output cosmosAccountName string = cosmosAccount.name
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output databaseName string = database.name
output connectionString string = cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
