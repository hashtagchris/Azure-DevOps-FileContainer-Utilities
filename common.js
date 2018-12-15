const fs = require('fs');
const csv = require('papaparse');
const readline = require('readline');

exports.addCommonArgs = function(yargs) {
  return yargs
    .describe('url', 'TFS/Azure DevOps collection/organization url')
    .describe('pat', 'Personal Access Token. If not supplied, user will be prompted.')
    .describe('verbose', 'outputs diagnostic logging');
}

exports.getPersonalAccessToken = function(argv) {
  return new Promise(resolve => {
    if (argv.pat) {
      resolve(argv.pat);
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'Enter Personal Access Token> '
    });

    rl.prompt();
    rl.on('line', (line) => {
      const token = line.trim();
      if (token) {
        resolve(token);
        rl.close();
        return;
      }

      rl.prompt();
    })
  });
}

exports.log = function(argv, line) {
  if (argv.verbose) {
    console.log(line);
  }
}

exports.writeCsv = function(argv, records) {
  const csvText = csv.unparse(records);
  fs.writeFileSync(argv.outcsv, csvText, { encoding: 'utf8' });

  console.log(`${records.length} record(s) written to ${argv.outcsv}`);
}

exports.readCsv = function(argv) {
  const csvText = fs.readFileSync(argv.incsv, { encoding: 'utf8' });

  let records;
  if (csvText.length !== 0) {
    const parseResult = csv.parse(csvText, {
      header: true,
      dynamicTyping: true
    });

    if (parseResult.errors && parseResult.errors.length) {
      throw new Error(parseResult.errors[0].message);
    }

    records = parseResult.data;
  } else {
    records = [];
  }

  console.log(`${records.length} record(s) read from ${argv.incsv}`);
  return records;
}

