const path = require('path');

const bundlerPath = path.resolve(__dirname, '../../src/index.js');
const { bundler } = require(bundlerPath);

const config = {
  entry: path.join(__dirname, './index.js'),
  output: path.join(__dirname, './output.js'),
};

bundler(config);