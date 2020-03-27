const isNull = evaluatedObj => typeof evaluatedObj === 'object' && !evaluatedObj === true;

module.exports = isNull;
