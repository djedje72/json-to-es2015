# Introduction

Generate sealed ES2015(ES6) model class files from json file.

# Usage

## Global install
You can use this package globally

###  npm 
```
npm install -g json-to-es2015
```
###  yarn
```
yarn global add json-to-es2015
```

## Example
file example.json
```json
{
    "key1":"any",
    "key2":false,
    "key3":null,
    "key4":{
        "key5": 12,
        "key6": [
            {
                "key7": ""
            }
        ]
    }
}
```

```
json-to-es2015 ./example.json
```
will generate

```
- example
  --- Example.js
  --- Key4.js
  --- Key6Value.js
```

Example.js
```javascript
//This is a generated-file, do not modify.

import {Key4} from "./Key4";

export class Example {
    constructor() {
        this.key1 = undefined;
        this.key2 = undefined;
        this.key3 = undefined;
        this.key4 = new Key4();
        Object.seal(this);
    }
}

```

Key4.js
```javascript
//This is a generated-file, do not modify.

export class Key4 {
    constructor() {
        this.key5 = undefined;
        this.key6 = [];
        Object.seal(this);
    }
}

```

Key6Value.js
```javascript
//This is a generated-file, do not modify.

export class Key6Value {
    constructor() {
        this.key7 = undefined;
        Object.seal(this);
    }
}

```

## Local project install
You can add package to your dev dependencies 

###  npm 
```
npm install -D json-to-es2015
```
###  yarn
```
yarn add --dev json-to-es2015
```

Then add a script entry in your package json and use it.
```javascript
...
"scripts": {
    "generate:example": "json-to-es2015 ./path-to-your-example.json"
}
```
