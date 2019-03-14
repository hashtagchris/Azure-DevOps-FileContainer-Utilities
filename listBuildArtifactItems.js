const azdev = require('azure-devops-node-api');
const common = require('./common');

const argv = common.addCommonArgs(require('yargs'))
  .usage('Usage: $0 --url [organizationUrl] --project [project] --definitionId [buildDefinitionId] --filenameRegex [regularExpression] --outcsv [filename]')
  .describe('project', 'Project id or name')
  .describe('definitionId', 'build definition id (number)')
  .describe('filenameRegex', 'Regular expression for filenames')
  .describe('pathRegex', 'Regular expression for filepaths')
  .describe('outcsv', 'output csv file')
  .demand(['url', 'project', 'definitionId', 'outcsv'])
  .describe('dryrun', 'Execute without deleting files.')
  .describe('minAgeDays', 'minimum age of builds to scan, in days')
  .describe('maxAgeDays', 'maximum age of builds to scan, in days')
  .argv;

(async function main() {
  try {
    if (!argv.filenameRegex && !argv.pathRegex) {
      throw new Error('--filenameRegex or --pathRegex required.');
    }

    const filenameRegex = argv.filenameRegex && new RegExp(argv.filenameRegex);
    const pathRegex = argv.pathRegex && new RegExp(argv.pathRegex);

    const token = await common.getPersonalAccessToken(argv);

    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    const connection = new azdev.WebApi(argv.url, authHandler);

    common.log(argv, 'Getting APIs...');
    const buildApi = await connection.getBuildApi();
    const containerApi = await connection.getFileContainerApi();

    const minTime = getDate(argv.maxAgeDays);
    if (minTime) {
      common.log(argv, `Minimum datetime: ${minTime}`);
    }

    const maxTime = getDate(argv.minAgeDays);
    if (maxTime) {
      common.log(argv, `Maximum datetime: ${maxTime}`);
    }

    if (minTime && maxTime && maxTime <= minTime) {
      throw new Error('maxAgeDays has to be greater than minAgeDays');
    }

    const records = [];

    common.log(argv, `Getting builds in definition ${argv.definitionId}...`);
    const builds = await buildApi.getBuilds(argv.project, [argv.definitionId], null, null, minTime, maxTime);

    common.log(argv, `${builds.length} build(s) returned.`);
    for (const build of builds) {
      common.log(argv, '');
      common.log(argv, `Getting artifacts for build ${build.buildNumber} (${build.id})...`);

      const artifacts = await buildApi.getArtifacts(build.id, argv.project);
      common.log(argv, `build ${build.buildNumber} (${build.id}) has ${artifacts.length} artifact(s).`);

      for (const artifact of artifacts) {
        common.log(argv, `Artifact found. Id: ${artifact.id}, name: ${artifact.name}, type: ${artifact.resource && artifact.resource.type}.`);
        if (artifact.resource && artifact.resource.type === 'Container') {
          const dataSegments = artifact.resource.data.split('/');
          if (dataSegments.length === 3 && dataSegments[0] === '#' && dataSegments[2] === 'drop') {
            const containerId = Number.parseInt(dataSegments[1]);
            if (!Number.isNaN(containerId)) {
              const containerResults = await scanFileContainer(build.buildNumber, containerApi, containerId, dataSegments[2], pathRegex, filenameRegex);

              for (const item of containerResults) {
                records.push({
                 Date: build.queueTime,
                 OwningResource: `Build ${build.buildNumber}`,
                 ContainerId: containerId,
                 ItemPath: item.path,
                 ItemfileLength: item.fileLength,
                 ItemType: item.itemType === 2 ? "file" : "folder"
                });
              }
            } else {
              common.log(argv, `"${dataSegments[1]}" isn't an integer`);
            }
          } else {
            common.log(argv, `"${artifact.resource.data}" isn't formatted like a container drop path.`);
          }
        } else {
          common.log(argv, `Artifact ${artifact.id} isn't a File Container artifact.`);
        }
      }
    }

    common.writeCsv(argv, records);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();

async function scanFileContainer(contextText, containerApi, containerId, itemPath, pathRegex, filenameRegex) {
  common.log(argv, `Getting items in containerId ${containerId} under path ${itemPath}.`);
  const items = await containerApi.getItems(containerId, null, itemPath);

  common.log(argv, `Container ${containerId} has ${items.length} item(s) under path ${itemPath}.`);

  const results = [];

  for (const item of items) {
    if (item.itemType === 2 /* File */) {
      let match = true;

      if (match && pathRegex) {
        // common.log(argv, `pathRegex.test: ${item.path}`);
        match = pathRegex.test(item.path);
      }

      if (match && filenameRegex) {
        // common.log(argv, `filenameRegex.test: ${item.path}`);
        const pathSegments = item.path.split("/");
        const filename = pathSegments[pathSegments.length-1];
        match = filenameRegex.test(filename);
      }

      common.log(argv, `filePath: ${item.path}, fileLength: ${item.fileLength}, regex match:${match}`);

      if (match) {
        results.push(item);
      }
    }
  }

  return results;
}

function getDate(daysAgo) {
  if (daysAgo === undefined) {
    return undefined;
  }

  const daysAgoNumber = Number.parseInt(daysAgo);
  if (Number.isNaN(daysAgoNumber)) {
    throw new Error(`"${daysAgo}" is not a number`);
  }

  const date = new Date(Date.now() - (daysAgoNumber * 24 * 60 * 60 * 1000));
  if (Number.isNaN(date)) {
    throw new Error(`Error producing a date for ${daysAgo} days ago.`);
  }

  return date;
}
