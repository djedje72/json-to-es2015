const fs = require("fs");
const chalk = require("chalk");

const {templateGet, templateClass, templateArrayGetSet, templateSet, templateIndex} = require("./templates");
const parseSchema = require("./parseSchema");

const upperFirst = str => str.charAt(0).toUpperCase() + str.slice(1);
const getRefClass = ref => ref.replace(/.*\/([^/]+)/, "$1");


module.exports = (dir, name, schema, {defaultValue, privateSuffix}) => {
    const parser = new Parser(dir, schema, {defaultValue, privateSuffix});
    parser.initProperties(name, schema.properties);
    parser.writeIndex();
    parser.writeClasses();
};

class Parser {
    constructor(directory, schema, {defaultValue, privateSuffix}) {
        this.directory = directory;
        const {definitions} = parseSchema(schema);
        this.definitions = definitions;
        this.defaultValueToUse = defaultValue;
        this.privateSuffixToUse = privateSuffix || "_";
    }

    _model = new Map();

    get model() {
        return this._model;
    }
    _toExport = new Set();
    _objectPrefix = "#";
    _lineBreak = "\r\n";
    _override = true;

    _getClazz = ({type, items, $ref}) => {
        let value;
        if ($ref) {
            value = `${this._objectPrefix}${getRefClass($ref)}`;
        } else {
            value = type.find(t => t !== "null");
            if (value === "array") {
                value = `[${this._getClazz(items)}]`;
            }
        }
        return value;
    };

    _isObject = value => value[0] === this._objectPrefix;
    _isArray = value => value[0] === "[";

    _getSetterParser = (value) => {
        switch(value && value.toLowerCase()) {
            case "string":
                return () => `_value && String(_value)`
            case "integer":
                return () => `_.isFinite(parsedValue) ? parsedValue : null`
            case "number":
                return () => `_.isFinite(parsedValue) ? parsedValue : null`
            case "boolean":
                return () => `_.isNil(_value) ? _value : (_value === "true" || _value === true)`
            default :
                return () => `_value`
        }
    };
    _getTempConstIfNecessary = (value) => {
        switch(value && value.toLowerCase()) {
            case "integer":
                return () => `const parsedValue = Number.parseInt(_value, 10);${this._lineBreak}        `
            case "number":
                return () => `const parsedValue = Number(_value);${this._lineBreak}        `
            default :
                return () => ``
        }
    };

    _generateGetterSetter = (key, value) => {
        const getter = templateGet
            .replace(/\$\$privateSuffix\$\$/g, this.privateSuffixToUse)
            .replace(/\$\$key\$\$/g, key)
            .replace(/\$\$defaultValue\$\$/g, this.defaultValueToUse);

        const setter = templateSet
            .replace(/\$\$privateSuffix\$\$/g, this.privateSuffixToUse)
            .replace(/\$\$key\$\$/g, key)
            .replace(/\$\$value\$\$/g, this._getSetterParser(value))
            .replace(/\$\$tempConst\$\$/g, this._getTempConstIfNecessary(value));
        return {getter, setter};
    };

    _writeClass = (name, props) => {
        const fields = [];
        let imports = new Set();
        let constructorStr = "";
        let classFunctionStr = "";
        let useLodash = false;
        for (const [key, value] of Object.entries(props)) {
            if (this._isObject(value)) {
                let objectValue = value.slice(1);
                imports.add(objectValue);
                constructorStr += `this.${key} = new ${objectValue}();${this._lineBreak}        `;
            } else {
                if (this._isArray(value)) {
                    useLodash = true;
                    let arrayValue = value.replace(/[\[\]#]/g, "");
                    imports.add(arrayValue);
                    constructorStr += `this.${this.privateSuffixToUse}${key} = [];${this._lineBreak}        `;
                    const arrayGetSetStr = templateArrayGetSet
                        .replace(/\$\$privateSuffix\$\$/g, this.privateSuffixToUse)
                        .replace(/\$\$key\$\$/g, key)
                        .replace(/\$\$upperKey\$\$/g, arrayValue);
                    classFunctionStr += `    ${arrayGetSetStr}${this._lineBreak}`;
                } else {
                    constructorStr += `this.${this.privateSuffixToUse}${key} = null;${this._lineBreak}        `;
                    const {getter, setter} = this._generateGetterSetter(key, value);
                    classFunctionStr += `${this._lineBreak}`;
                    classFunctionStr += `    ${getter}${this._lineBreak}`;
                    classFunctionStr += `    ${setter}${this._lineBreak}`;
                }
            }
            fields.push(key);
        }
        let importsStr = "";
        if (useLodash) {
            importsStr += `import _ from "lodash";${this._lineBreak}`;
        }
        imports.forEach((imp) => {
            importsStr += `import {${imp}} from "./${imp}";${this._lineBreak}`
        });
        const fieldsStr = fields.join(", ");
        const upperName = upperFirst(name);
        let classData = templateClass.replace(/\$\$ClassName\$\$/g, upperName);
        classData = classData
            .replace("$$imports$$", importsStr)
            .replace("$$constructor$$", constructorStr)
            .replace("$$classFunction$$", classFunctionStr)
            .replace("$$fieldsDestructuring$$", fieldsStr !== "" ? `const {${fieldsStr}} = this;`: "")
            .replace("$$fields$$", fieldsStr)
            .replace(/^\s*$[\r\n]{1,}/gm, "\n");

        const filePath = `${this.directory}/${upperName}.js`;
        this._toExport.add(upperName);
        fs.writeFile(filePath, classData, {"flag": this._override ? "w" : "wx"}, (err) => {
            if (err) {
                console.log(err);
                throw err;
            }
            console.log(chalk.green(`file [${chalk.cyan(filePath)}] -> created`));
        });
    };

    writeClasses = () => {
        for (const [name, props] of this.model.entries()) {
            this._writeClass(name, props);
        }
    }

    writeIndex = () => {
        let exportsStr = "";
        for (const key of this._model.keys()) {
            exportsStr += `export {${key}} from "./${key}";${this._lineBreak}`;
        }
        const indexData = templateIndex.replace("$$exports$$", exportsStr)
        const filePath = `${this.directory}/index.js`;
        fs.writeFile(filePath, indexData, {"flag": this._override ? "w" : "wx"}, (err) => {
            if (err) {
                throw err;
            }
            console.log(chalk.green(`file [${chalk.cyan(filePath)}] -> created`));
        });
    };

    initProperties = (name, props) => {
        // console.log(name, props);
        if (!this._model.has(name)) {
            const currentProps = Object.entries(props);
            const refs = currentProps.map(([, {$ref}]) => $ref).filter(Boolean);
            if (refs.length) {
                refs.forEach(ref => {
                    const [n, r] = this.definitions[ref];
                    this.initProperties(n, r.properties);
                });
            }
            const items = currentProps.map(([, {items}]) => items).filter((items) => items && items.$ref);
            if (items.length) {
                items.forEach(item => {
                    const [n, r] = this.definitions[item.$ref];
                    this.initProperties(n, r.properties);
                });
            }
            this._model.set(name, currentProps.reduce((acc, [n, p]) => {
                return {
                    ...acc,
                    [n]: this._getClazz(p)
                };
            }, {}));
            this.initProperties(name, props.properties);
        }
    };
}
