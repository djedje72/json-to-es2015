const fs = require("fs");

const templatesPath = `${__dirname}/../templates`;

module.exports = {
    "templateClass": fs.readFileSync(`${templatesPath}/class.js_template`, {"encoding": "utf-8"}),
    "templateGet": fs.readFileSync(`${templatesPath}/get.js_template`, {"encoding": "utf-8"}),
    "templateSet": fs.readFileSync(`${templatesPath}/set.js_template`, {"encoding": "utf-8"}),
    "templateArrayGetSet": fs.readFileSync(`${templatesPath}/arrayGetSet.js_template`, {"encoding": "utf-8"}),
    "templateIndex": fs.readFileSync(`${templatesPath}/index.js_template`, {"encoding": "utf-8"})
};
