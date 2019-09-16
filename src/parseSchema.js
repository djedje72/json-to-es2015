module.exports = (schema) => {
    const {properties, definitions} = schema;

    const def = Object.entries(definitions).reduce((acc, [name, value]) => ({
        ...acc,
        [`#/definitions/${name}`]: [name, value]
    }), {});

    return {"definitions": def, properties};
};
