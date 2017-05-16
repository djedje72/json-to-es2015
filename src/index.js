const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const rimraf = require('rimraf');
const override = true;
const templatesPath = `${__dirname}/../templates`;

const templateClass = fs.readFileSync(`${templatesPath}/class.js_template`, {"encoding": "utf-8"});

function isObject(elt) {
    return elt instanceof Object && !(elt instanceof Array);
}
function isArray(elt) {
    return elt instanceof Array;
}

const lineBreak = "\r\n";
const toExport = new Set();
let defaultValueToUse = undefined;

function parseLevel(dir, name, level) {
    const upperName = name.charAt(0).toUpperCase() + name.slice(1);
    let classData = templateClass.replace(/\$\$ClassName\$\$/g, upperName);
    let imports = [];
    Object.keys(level).forEach((key) => {
        const upperKey = key.charAt(0).toUpperCase() + key.slice(1);
        const value = level[key];
        imports.push([key, value, `import {${upperKey}} from "./${upperKey}";`]);
        if (isObject(value)) {
            parseLevel(dir, key, value);
        } else if (isArray(value) && value.length > 0) {
            const mergedValue = {};
            value.forEach((val) => {
                Object.assign(mergedValue, val);
            });
            parseLevel(dir, `${key}Value`, mergedValue);
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
                importsStr += `${importStr}${lineBreak}`;
                initStr += `this.${key} = new ${upperKey}();${lineBreak}        `;
            } else {
                initStr += `this.${key} = ${isArray(value) ? "[]" : `${defaultValueToUse}`};${lineBreak}        `;
            }
        });
        if (addLineBreak) {
            importsStr += lineBreak;
        }
    }
    classData = classData.replace("$$imports$$", importsStr).replace("$$init$$", initStr);
    const filePath = `${dir}/${upperName}.js`;
    toExport.add(upperName);
    fs.writeFile(filePath, classData, {"flag": override ? "w" : "wx"}, (err) => { 
        if (err) {
            console.log(err);
            throw err;
        }
        console.log(chalk.green(`file [${chalk.cyan(filePath)}] -> created`));
    });
}

function createIndex(dir) {
    const templateIndex = fs.readFileSync(`${templatesPath}/index.js_template`, {"encoding": "utf-8"});
    let exportsStr = "";
    toExport.forEach((exportName) => {
        exportsStr += `export {${exportName}} from "./${exportName}";${lineBreak}`;
    })
    const indexData = templateIndex.replace("$$exports$$", exportsStr)
    const filePath = `${dir}/index.js`;
    fs.writeFile(filePath, indexData, {"flag": override ? "w" : "wx"}, (err) => { 
        if (err) {
            throw err;
        }
        console.log(chalk.green(`file [${chalk.cyan(filePath)}] -> created`));
    });
}

module.exports = (jsonPath, defaultValue) => {
    defaultValueToUse = defaultValue;
    const pathInfo = path.parse(jsonPath);
    if (pathInfo.ext === ".json") {
        const dir = `${pathInfo.dir}/${pathInfo.name}`;
        rimraf(dir, () => {
            console.log(chalk.green(`dir[${chalk.cyan(dir)}] removed.`));
            fs.mkdir(dir, (err) => {
                console.log(err);
                console.log(chalk.green(`dir[${chalk.cyan(dir)}] created.`));
                fs.readFile(jsonPath, "utf8", (err, data) => {
                    if (err) {
                        throw err;
                    } else {
                        parseLevel(dir, pathInfo.name, JSON.parse(data));
                        createIndex(dir);
                    }
                });
            });
        });
    }
};
