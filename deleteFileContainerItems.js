const azdev = require('azure-devops-node-api');
const common = require('./common');
const readline = require('readline');

const argv = common.addCommonArgs(require('yargs'))
  .usage('Usage: $0 --url [organizationUrl] --incsv [filename]')
  .describe('incsv', 'input csv file')
  .demand(['url', 'incsv'])
  .describe('dryrun', 'Execute without deleting files.')
  .argv;

(async function main() {
  try {
    const records = common.readCsv(argv);

    // Sanity check the column values we'll use.
    for (const record of records) {
      if (!record.ContainerId || !Number.isInteger(record.ContainerId)) {
        throw new Error(`ContainerId isn't an integer: ${record.ContainerId}`);
      }

      if (!record.ItemPath || record.ItemPath.split("/").length < 2) {
        throw new Error(`ItemPaths with less than two segments not supported: ${record.ItemPath}`);
      }
    }

    let files = 0;
    let folders = 0;
    let containerMap = {};
    console.log("FileContainer items:");
    for (const record of records) {
      if (record.ItemType.toLowerCase() === 'file') {
        files++;
      } else {
        folders++;
      }

      containerMap[record.ContainerId] = true;

      console.log(`* ContainerId: ${record.ContainerId}, ItemPath: ${record.ItemPath}, ItemType: ${record.ItemType}`);
    }

    console.log();
    if (!await getYesNo(`Do you want to delete ${files} file(s), ${folders} folder(s) across ${Object.keys(containerMap).length} container(s)?`)) {
      return;
    }

    const token = await common.getPersonalAccessToken(argv);

    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    const connection = new azdev.WebApi(argv.url, authHandler);

    common.log(argv, 'Getting APIs...');
    const containerApi = await connection.getFileContainerApi();

    for (const record of records) {
      if (argv.dryrun) {
        console.log(`[Dryrun] Deleting ContainerId ${record.ContainerId}, ${record.ItemType} ${record.ItemPath}...`);
      } else {
        console.log(`Deleting ContainerId ${record.ContainerId}, ${record.ItemType} ${record.ItemPath}...`);
        await containerApi.deleteItem(record.ContainerId, record.ItemPath);
      }
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();

function getYesNo(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${prompt} Enter "Yes" or "No": `
    });

    rl.prompt();
    rl.on('line', (line) => {
      const answer = line.trim().toLowerCase();

      switch (answer) {
        case 'yes':
          resolve(true);
          rl.close();
          return;

        case 'no':
          resolve(false);
          rl.close();
          return;

        default:
          rl.prompt();
      }
    })
  });
}
