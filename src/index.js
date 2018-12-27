const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const rimraf = require('rimraf');
const override = true;
const templatesPath = `${__dirname}/../templates`;

const templateClass = fs.readFileSync(`${templatesPath}/class.js_template`, {"encoding": "utf-8"});
const templateGet = fs.readFileSync(`${templatesPath}/get.js_template`, {"encoding": "utf-8"});
const templateSet = fs.readFileSync(`${templatesPath}/set.js_template`, {"encoding": "utf-8"});
const templateArrayGetSet = fs.readFileSync(`${templatesPath}/arrayGetSet.js_template`, {"encoding": "utf-8"});

function isObject(elt) {
    return elt instanceof Object && !(elt instanceof Array);
}
function isArray(elt) {
    return elt instanceof Array;
}

const lineBreak = "\r\n";
const toExport = new Set();
let defaultValueToUse = undefined;
let privateSuffixToUse = undefined;

function upperFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const getPrivateSuffixToUse = () => privateSuffixToUse || "_";

function parseLevel(dir, name, level) {
    const upperName = upperFirst(name);
    let classData = templateClass.replace(/\$\$ClassName\$\$/g, upperName);
    let imports = new Map();
    let useLodash = false;
    Object.keys(level).forEach((key) => {
        const upperKey = upperFirst(key);
        const value = level[key];
        imports.set(key, value);
        if (isObject(value)) {
            parseLevel(dir, key, value);
        } else if (isArray(value) && value.length > 0) {
            useLodash = true;
            const mergedValue = {};
            value.forEach((val) => {
                if(isObject(val)) {
                    Object.assign(mergedValue, val);
                }
            });
            parseLevel(dir, `${key}Value`, mergedValue);
        }
    });
    const fields = [];
    let importsStr = "";
    let constructorStr = "";
    let classFunctionStr = "";
    if (imports.size > 0) {
        if (useLodash) {
            importsStr += `import _ from "lodash";${lineBreak}`;
        }
        let addLineBreak = false;
        for (const [key, value] of imports) {
            const upperKey = upperFirst(key);
            if (isObject(value)) {
                addLineBreak = true;
                importsStr += `import {${upperKey}} from "./${upperKey}";${lineBreak}`;
                constructorStr += `this.${key} = new ${upperKey}();${lineBreak}        `;
            } else {
                if (isArray(value)) {
                    importsStr += `import {${upperKey}Value} from "./${upperKey}Value";${lineBreak}`;
                    constructorStr += `this.${getPrivateSuffixToUse()}${key} = [];${lineBreak}        `;
                    const arrayGetSetStr = templateArrayGetSet
                        .replace(/\$\$privateSuffix\$\$/g, getPrivateSuffixToUse())
                        .replace(/\$\$key\$\$/g, key)
                        .replace(/\$\$upperKey\$\$/g, upperKey);
                    classFunctionStr += `    ${arrayGetSetStr}${lineBreak}`;
                } else {
                    constructorStr += `this.${getPrivateSuffixToUse()}${key} = null;${lineBreak}        `;
                    const {getter, setter} = generateGetterSetter(key, value);
                    classFunctionStr += `${lineBreak}`;
                    classFunctionStr += `    ${getter}${lineBreak}`;
                    classFunctionStr += `    ${setter}${lineBreak}`;
                }
            }
            fields.push(key);
        };
        if (addLineBreak) {
            importsStr += lineBreak;
        }
    }
    const fieldsStr = fields.join(", ");
    classData = classData
        .replace("$$imports$$", importsStr)
        .replace("$$constructor$$", constructorStr)
        .replace("$$classFunction$$", classFunctionStr)
        .replace("$$fieldsDestructuring$$", fieldsStr !== "" ? `const {${fieldsStr}} = this;`: "")
        .replace("$$fields$$", fieldsStr)
        .replace(/^\s*$[\r\n]{1,}/gm, "\n");
        
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

function generateGetterSetter(key, value) {
    const getter = templateGet
        .replace(/\$\$privateSuffix\$\$/g, getPrivateSuffixToUse())
        .replace(/\$\$key\$\$/g, key)
        .replace(/\$\$defaultValue\$\$/g, defaultValueToUse);

    const setter = templateSet
        .replace(/\$\$privateSuffix\$\$/g, getPrivateSuffixToUse())
        .replace(/\$\$key\$\$/g, key)
        .replace(/\$\$value\$\$/g, getSetterParser(value))
        .replace(/\$\$tempConst\$\$/g, getTempConstIfNecessary(value));
    return {getter, setter};
}

function getSetterParser(value) {
    switch(value && value.toLowerCase()) {
        case "string":
            return () => `_value && String(_value)`
        case "integer":
            return () => `_.isFinite(parsedValue) ? parsedValue : null`
        case "number":
            return () => `_.isFinite(Number(_value)) ? Number(_value) : null`
        case "boolean":
            return () => `_.isNil(_value) ? _value : (_value === "true" || _value === true)`
        default :
            return () => `_value`
    }
}

function getTempConstIfNecessary(value) {
    switch(value && value.toLowerCase()) {
        case "number":
            return () => `const parsedValue = Number.parseInt(_value, 10)\n`
        default :
            return () => ``
    }
}

function createIndex(dir) {
    const templateIndex = fs.readFileSync(`${templatesPath}/index.js_template`, {"encoding": "utf-8"});
    let exportsStr = "";
    toExport.forEach((exportName) => {
        exportsStr += `export {${exportName}} from "./${exportName}";${lineBreak}`;
    });
    const indexData = templateIndex.replace("$$exports$$", exportsStr)
    const filePath = `${dir}/index.js`;
    fs.writeFile(filePath, indexData, {"flag": override ? "w" : "wx"}, (err) => { 
        if (err) {
            throw err;
        }
        console.log(chalk.green(`file [${chalk.cyan(filePath)}] -> created`));
    });
}

module.exports = (jsonPath, {defaultValue, privateSuffix}) => {
    defaultValueToUse = defaultValue;
    privateSuffixToUse = privateSuffix;
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
