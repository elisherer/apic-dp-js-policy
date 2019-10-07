[3.3.0] - 2019-10-07
* Add policy version to zip file name to allow multiple versions to be created and identified in the same output folder.

[3.2.0] - 2019-08-04
* Add support for multiple js files in a project (ignores .spec/.test.js files)

[3.1.0] - 2019-06-25
* Fixed the bug found in the previous version

[3.0.0] - 2019-06-24 (DO NOT USE THIS VERSION!)
* Found a bug of encoding escaped characters (\b, \f, \\, \", \n, \r, \t) in json strings.

[2.2.1] - 2019-01-02
* Add support to include package.json (if exists)

[2.2.0] - 2018-11-20
* Added error catching (almost same as original example by api connect)

[2.1.0-2.1.2] - 2018-11-20
* Added the payload xsl file

[2.0.1/2.0.2] - 2018-11-20
* Missed the `is-json.xsl` file
* Missed the added actions

[2.0.0] - 2018-11-20
* Add `name` parameter (support a different name then the project's folder)
* Move to getting arguments using yargs

[1.1.0] - 2018-10-28
* change output to be policy-{timestamp}-{projectName}.zip instead of folders