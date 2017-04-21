const test = {
    "prop1": "124",
    "prop2": {
        "prop3": true,
        "prop4": undefined,
        "prop5": null,
        "prop6": [{
            "prop7": null
        }]
    }
};

const fs = require("fs");

const dir = `${__dirname}/out-test`;
try {
    fs.mkdirSync(dir);
} catch(e) {

}

const override = true;

const template = fs.readFileSync(`${__dirname}/class.js_template`, {"encoding": "utf-8"});

function isObject(elt) {
    return elt instanceof Object && !(elt instanceof Array);
}
function isArray(elt) {
    return elt instanceof Array;
}

function parseLevel(name, level) {
    let data = template.replace(/\$\$ClassName\$\$/g, name.charAt(0).toUpperCase() + name.slice(1));
    let imports = [];
    Object.keys(level).forEach((key) => {
        const upperKey = key.charAt(0).toUpperCase() + key.slice(1);
        const value = level[key];
        imports.push([key, value, `import {${upperKey}} from "./${upperKey}";`]);
        if (isObject(value)) {
            parseLevel(key, value);
        } else if (isArray(value) && value.length > 0) {
            const mergedValue = {};
            value.forEach((val) => {
                Object.assign(mergedValue, val);
            });
            parseLevel(`${key}Value`, mergedValue);
        } 
    });
    let importsStr = "";
    let initStr = "";
    if (imports.length > 0) {
        let addLineBreak = false;
        imports.forEach(([key, value, importStr]) => {
            const upperKey = key.charAt(0).toUpperCase() + key.slice(1);
            if (isObject(value)) {
                addLineBreak = true;
                importsStr += `${importStr}\n`;
                initStr += `this.${key} = new ${upperKey}();\n        `;
            } else {
                initStr += `this.${key} = ${isArray(value) ? "[]" : "undefined"};\n        `;
            }
        });
        if (addLineBreak) {
            importsStr += "\n";
        }
    }
    data = data.replace("$$imports$$", importsStr).replace("$$init$$", initStr);
    fs.writeFile(`${dir}/${name}.js`, data, {"flag": override ? "w" : "wx"}, (err) => { });
}

parseLevel("test", test)
