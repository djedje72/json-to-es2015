const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const rimraf = require("rimraf");
const generate = require("./index");

module.exports = (jsonPath, {defaultValue, privateSuffix}) => {
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
                        generate(dir, pathInfo.name, JSON.parse(data), {defaultValue, privateSuffix});
                        //createIndex(dir);
                    }
                });
            });
        });
    }
};