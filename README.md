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
3. Open the generated csv file in a text editor or Excel. Review the build artifact items to be deleted. Remove rows for items you don't want deleted.
4. Use deleteFileContainerItems.js to delete the build artifact items. Run `node deleteFileContainerItems.js` for a description of each argument. Example usage: `node deleteFileContainerItems.js --url http://localhost/DefaultCollection --incsv deleteSymbols.csv --verbose`

