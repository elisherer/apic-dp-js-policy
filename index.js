#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const chalk = require('chalk');
const YAML = require('yamljs');
const archiver = require('archiver');
const yargs = require('yargs');

const sha1base64 = content => crypto.createHash('sha1').update(content).digest('base64');
const logI = (strings, ...values) => console.log(chalk.blue('i') + ' ' + chalk(strings, ...values));
const logS = (strings, ...values) => console.log(chalk.green('√ ' + chalk(strings, ...values)));
const logE = (strings, ...values) => console.log(chalk.red('× ' + chalk(strings, ...values)));

/**
 * @property path (string) The project's path
 * @property name (string) The project's name (default is project's path dir name)
 * @property hashLength (number) Number of characters from the hash of the main js file to add to the result file's name (put 0 to use timestamp)
 */
const argv = yargs
  .option('path', {
    demandOption: true,
    alias: 'p',
    default: ''
  })
  .option('name', {
    alias: 'n',
    default: ''
  })
  .option('hashLength', {
    alias: 'h',
    type: 'number',
    default: 6
  })
  .option('timestamp', {
    alias: 't',
    type: 'boolean'
  })
  .argv;

const projPath = path.resolve(argv.path);
const projName = argv.name || path.basename(projPath);
const hashLength = typeof argv.hashLength === 'undefined' ? 6 : argv.hashLength;
const useTimestamp = argv.timestamp || false;

console.log(chalk`{magenta API Connect DataPower custom js policy maker}\n{cyan by Eli Sherer <eli.sherer@gmail.com>}\n`);

(async () => {
  logI`Starting to create {blue [${projName}]} ...`;

  logI`Validating yaml file ${projName}.yaml ...`;
  const yamlFile = fs.readFileSync(path.join(projPath, projName + '.yaml'), 'utf8');
  /**
   * @type {{ policy: string, info: { name: string }, gateways: Array<string>, properties: { $schema: string }}}
  **/
  const yamlObj = YAML.parse(yamlFile);
  const expectedPolicyVersion = "1.0.0";
  assert.strictEqual(yamlObj.policy, expectedPolicyVersion, `  Expecting [policy] to be ${expectedPolicyVersion} but got ${yamlObj.policy} instead`);
  const policyVersion = yamlObj.info.version;
  assert.ok(policyVersion, `  [info.version] is required`);
  assert.strictEqual(yamlObj.info.name, projName, `  Expecting [info.name] to be ${projName} but got ${yamlObj.info.name} instead`);
  const nameRegex = /^([a-z0-9]+(-)*)*([a-z0-9])$/;
  assert(nameRegex.test(yamlObj.info.name), `  Expecting [info.name] to pass regex: ${nameRegex.source}, value was ${yamlObj.info.name}`);
  const expectedGateways = ['datapower-gateway', 'datapower-api-gateway'];
  assert(yamlObj.gateways.some(gw => expectedGateways.includes(gw)), `  Expecting [gateways] to include at least one of [${expectedGateways.join()}]`);
  if (yamlObj.properties) {
    const expectedPropSchema = "http://json-schema.org/draft-04/schema#";
    assert.strictEqual(yamlObj.properties.$schema, expectedPropSchema, `  Expecting [properties.$schema] to be ${expectedPropSchema} but got ${yamlObj.properties.$schema} instead`);
  }
  logS`File passed validation`;

  logI`Preparing export.xml file ...`;
  const exportXmlTemplate = fs.readFileSync(path.join(__dirname, '_export.xml'), 'utf8');

  //payload.xsl
  const payloadXsl = fs.readFileSync(path.join(__dirname, 'payload.xsl'), 'utf8');
  const payloadXslSha1 = sha1base64(payloadXsl);
  //error.xsl
  const errorXsl = fs.readFileSync(path.join(__dirname, 'error.xsl'), 'utf8');
  const errorXslSha1 = sha1base64(errorXsl);

  //more files
  let moreFilesXML = '';
  const supportedFiles = fs.readdirSync(projPath).filter(file =>
    file === 'package.json' ||
    (file.endsWith('.js') && !file.endsWith('.spec.js') && !file.endsWith('.test.js'))
  );
  const moreFiles = [];
  let mainHash = '';
  supportedFiles.forEach(fileName => {
    const filePath = path.join(projPath, fileName);
    if (fs.existsSync(filePath)) {
      logI`Reading js file ${fileName} ...`;
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const fileSha1 = sha1base64(fileContents);
      if (fileName === projName + '.js') {
        mainHash = fileSha1;
      }
      logS`Finished reading ${fileName} file {yellow (Sha1 hash = ${fileSha1})}`;

      moreFilesXML += `<file name="local:///policy/${projName}/${fileName}" src="local/policy/${projName}/${fileName}" location="local" hash="${fileSha1}"/>`;
      moreFiles.push({ fileName, fileContents });
    }
  });

  const exportXml = exportXmlTemplate
    .replace(/&PROJNAME;/g, projName)
    .replace(/&PAYLOADFILEHASH;/g, payloadXslSha1)
    .replace(/&ERRORFILEHASH;/g, errorXslSha1)
    .replace(/<!--&MOREFILES;-->/g, moreFilesXML);

  logS`Finished preparing export.xml file`;

  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const timestamp = (new Date()).toISOString().replace(/[.:]/g, '-');

  const tempDir = path.join(outputDir, `${projName}-${timestamp}`);
  fs.mkdirSync(tempDir);

  const implDir = path.join(tempDir, 'implementation');
  fs.mkdirSync(implDir);

  const implZipPath = path.join(implDir, projName + '.zip');

  await new Promise((resolve, reject) => {
    logI`Preparing implementation zip file ...`;
    const output = fs.createWriteStream(implZipPath);
    const archive = archiver('zip', {zlib: {level: 9}});
    archive.pipe(output);
    archive.append(exportXml, {name: 'export.xml'});
    archive.append(payloadXsl, {name: `local/policy/${projName}/payload.xsl`});
    archive.append(errorXsl, {name: `local/policy/${projName}/error.xsl`});
    moreFiles.forEach(fileDesc => {
      archive.append(fileDesc.fileContents, {name: `local/policy/${projName}/${fileDesc.fileName}`});
    });

    archive.on('finish', () => {
      logS`Finished implementation zip file`;
      resolve();
    });
    archive.on('error', reject);
    archive.finalize();
  });

  const policyZipId = useTimestamp ? '-' + timestamp : (mainHash
    ? '-' + mainHash.substr(0, hashLength).replace(/\+/g, '-').replace(/\//g, '_') 
    : '');

  const policyZipPath = path.join(outputDir, `policy-${projName}_v${policyVersion}${policyZipId}.zip`);
  
  await new Promise((resolve, reject) => {
    logI`Preparing custom policy zip file ...`;
    const output = fs.createWriteStream(policyZipPath);
    const archive = archiver('zip', {zlib: {level: 9}});
    archive.pipe(output);
    archive.append(yamlFile, {name: projName + '.yaml'});
    archive.directory(implDir, 'implementation');

    archive.on('finish', () => {
      logS`Finished custom policy zip file`;
      resolve();
    });
    archive.on('error', reject);
    archive.finalize();
  });

  logI`Cleaning up ...`;
  fs.unlinkSync(implZipPath); // delete implementation zip
  fs.rmdirSync(implDir); // delete implementation dir
  fs.rmdirSync(tempDir); // delete temp dir

  logS`{green Done}. File is ready at:\n  {blue ${policyZipPath}}`;
   
})().catch(err => logE`${err.message}`);
