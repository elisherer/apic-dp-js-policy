[![npm version](https://badge.fury.io/js/apic-dp-js-policy.svg)](https://badge.fury.io/js/apic-dp-js-policy)

# apic-dp-js-policy

API Connect DataPower custom gatewayscript policy maker

## Installation

```
npm i -g apic-dp-js-policy
```

## Usage

(1) Create a folder with the script's name (no spaces, preferablly lower camelCase), This name will be further referred as _{projName}_ (for example: **helloWorld**).

(2) Create a JavaScript file in that folder named _{projName}_.js (e.g. **helloWorld**.js)

JavaScript file example:
```js
// API Connect utility
const apic = require('local://isp/policy/apim.custom.js');
// helper module to manipulate headers
const hm = require('header-metadata');

// Get extension properties
const props = apic.getPolicyProperty();
const message = props.message;

// Set the response header
hm.current.set('X-Hello-World', message);
```
### request.body

Note you cannot get the request body using `apim.getvariable('request.body')`. You should use `apim.readInput` or `apim.readInputAs<Type>` instead.


(3) Create a yaml file in that folder named _{projName}_.yaml  (e.g. **helloWorld**.yaml)

YAML file example:
```yaml
policy: 1.0.0

info:
  title: Hello World
  name: helloWorld
  version: 1.0.0
  description: Hello World Extension

attach:
  - rest
  - soap

gateways:
  - datapower-gateway

properties:
  $schema: "http://json-schema.org/draft-04/schema#"
  type: object
  properties:
    message:
      label: Message to be returned
      description: A message to be returned in the X-Hello-World header
      type: string
      default: oh-hi
  required:
    - message
```

* Notice `info.name` must be the _{projName}_


(4) You will now have the following folder structure:
```
  helloWorld/
    helloWorld.js
    helloWorls.yaml
```

Run the following command from outside that folder:
```
apic-dp-js-policy --project {projName}
```

(e.g. `apic-dp-js-policy -p helloWorld`)

## Credits

[Eli Sherer](https://github.com/elisherer)

## License

MIT