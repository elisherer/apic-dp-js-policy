#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const chalk = require('chalk');
const YAML = require('yamljs');
const archiver = require('archiver');

const sha1base64 = content => crypto.createHash('sha1').update(content).digest('base64');
const logI = (strings, ...values) => console.log(chalk.blue('i') + ' ' + chalk(strings, ...values));
const logS = (strings, ...values) => console.log(chalk.green('√ ' + chalk(strings, ...values)));
const logE = (strings, ...values) => console.log(chalk.red('× ' + chalk(strings, ...values)));

/**
 * @property path (string) The project's path
 * @property name (string) The project's name (default is project's path dir name)
 */
const argv = require('yargs')
  .option('path', {
    alias: 'p',
    default: ''
  })
  .option('name', {
    alias: 'n',
    default: ''
  })
  .argv;

const projPath = path.resolve(argv.path);
const projName = argv.name || path.basename(projPath);

console.log(chalk`{magenta API Connect DataPower custom js policy maker}\n{cyan by Eli Sherer <eli.sherer@gmail.com>}\n`);

(async () => {
  try {

    logI`Starting to create {blue [${projName}]} ...`;

    logI`Reading js file ${projName}.js ...`;
    const jsFile = fs.readFileSync(path.join(projPath, projName + '.js'), 'utf8');
    const jsFileSha1 = sha1base64(jsFile);
    logS`Finished reading js file {yellow (Sha1 hash = ${jsFileSha1})}`;

    logI`Validating yaml file ${projName}.yaml ...`;
    const yamlFile = fs.readFileSync(path.join(projPath, projName + '.yaml'), 'utf8');
    const yamlObj = YAML.parse(yamlFile);
    const expectedPolicyVersion = "1.0.0";
    assert.strictEqual(yamlObj.policy, expectedPolicyVersion, `  Expecting [policy] to be ${expectedPolicyVersion} but got ${yamlObj.policy} instead`);
    assert.strictEqual(yamlObj.info.name, projName, `  Expecting [info.name] to be ${projName} but got ${yamlObj.info.name} instead`);
    const expectedGateway = 'datapower-gateway';
    assert(yamlObj.gateways.includes(expectedGateway), `  Expecting [gateways] to include '${expectedGateway}'`);
    const expectedPropSchema = "http://json-schema.org/draft-04/schema#";
    assert.strictEqual(yamlObj.properties.$schema, expectedPropSchema, `  Expecting [properties.$schema] to be ${expectedPropSchema} but got ${yamlObj.properties.$schema} instead`);
    logS`File passed validation`;

    logI`Preparing export.xml file ...`;
    const exportXmlTemplate = fs.readFileSync(path.join(__dirname, '_export.xml'), 'utf8');

    //is-json.xsl
    const isJsonXsl = fs.readFileSync(path.join(__dirname, 'is-json.xsl'), 'utf8');
    const isJsonXslSha1 = sha1base64(isJsonXsl);
    //payload.xsl
    const payloadXsl = fs.readFileSync(path.join(__dirname, 'payload.xsl'), 'utf8');
    const payloadXslSha1 = sha1base64(payloadXsl);
    //error.xsl
    const errorXsl = fs.readFileSync(path.join(__dirname, 'error.xsl'), 'utf8');
    const errorXslSha1 = sha1base64(errorXsl);

    const exportXml = exportXmlTemplate
      .replace(/&PROJNAME;/g, projName)
      .replace(/&ISJSONFILEHASH;/g, isJsonXslSha1)
      .replace(/&PAYLOADFILEHASH;/g, payloadXslSha1)
      .replace(/&ERRORFILEHASH;/g, errorXslSha1)
      .replace(/&JSFILEHASH;/g, jsFileSha1);

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
      archive.append(isJsonXsl, {name: `local/policy/${projName}/is-json.xsl`});
      archive.append(payloadXsl, {name: `local/policy/${projName}/payload.xsl`});
      archive.append(errorXsl, {name: `local/policy/${projName}/error.xsl`});
      archive.append(jsFile, {name: `local/policy/${projName}/${projName}.js`});

      archive.on('finish', () => {
        logS`Finished implementation zip file`;
        resolve();
      });
      archive.on('error', reject);
      archive.finalize();
    });

    const policyZipPath = path.join(outputDir, `policy-${timestamp}-${projName}.zip`);
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
  }
  catch (err) {
    logE`${err.message}`;
  }
})();
