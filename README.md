# Azure DevOps FileContainer Utilities

## Prerequisites

1. Install [Nodejs and npm](https://nodejs.org/).
2. Clone or download a zip of this repository.
3. Unzip and `cd` into the directory with these tools.
4. Run `npm install`
5. In Azure DevOps/TFS, create a Personal Access Token (PAT) for authenticating on the command-line.

## Deleting Build Artifact Items

1. Use your web browser to identify a particular build pipeline (definition) with builds you want to delete artifact items from. Select the build pipeline and get the definitionId from the browser's url (e.g. http://localhost/DefaultCollection/MyFirstProject/_build?definitionId=42).
2. Use listBuildArtifactItems.js to generate a csv with the build artifact items to delete. Run `node listBuildArtifactItems.js` for a description of each argument. Example usage: `node listBuildArtifactItems.js --url http://localhost/DefaultCollection --project MyFirstProject --definitionId 42 --maxAgeDays 365 --minAgeDays 30 --filenameRegex "\.pdb$" --outcsv deleteSymbols.csv  --verbose`
3. Open the generated csv file in a text editor or Excel. Carefully review the build artifact items to be deleted. Remove rows for items you don't want deleted.
4. Use deleteFileContainerItems.js to delete the build artifact items. Run `node deleteFileContainerItems.js` for a description of each argument. Example usage: `node deleteFileContainerItems.js --url http://localhost/DefaultCollection --incsv deleteSymbols.csv --verbose`
5. Optional: Run listBuildArtifactItems.js a second time to verify the items were deleted. See below.

## Questions

Q. deleteFileContainerItems.js succeeded, but listBuildArtifactItems.js still returns the same items. What gives? Why weren't the items deleted?

A. Currently if you don't have permission to delete the item, the server will return `404 Not Found` and the [azure-devops-node-api](https://github.com/Microsoft/azure-devops-node-api) client treats this as success. You can grant the collection administrators permission to delete items using these steps:
1. Go to http://localhost/DefaultCollection/_apis/projects to determine the projectId for your team project. It's a guid, formatted something like "bbf1abc8-bbc4-4763-bafe-a6d61f332c9d"
2. cd to the Azure DevOps/TFS Tools directory (e.g. `cd C:\Program Files\Azure DevOps Server 2019\Tools`)
3. Inspect existing permissions by running `TFSSecurity /acl Build <ProjectIdFromStep1> /collection:http://localhost/DefaultCollection | findstr /c:UpdateBuildInformation`
4. Give collection admins the permission to remove build artifact items by running `TFSSecurity /a+ Build <ProjectIdFromStep1> "UpdateBuildInformation" "[DefaultCollection]\Project Collection Administrators" ALLOW /collection:http://localhost/DefaultCollection`
