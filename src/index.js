const path = require('path');
const fs = require('fs');

const parser = require('@babel/parser');
const { transformFromAst } = require('@babel/core');
const traverse = require('@babel/traverse').default;

let ID = 0;

function createAsset(filename) {
  const content = fs.readFileSync(filename, 'utf-8');
  const ast = parser.parse(content, {
    sourceType: 'module'
  });

  const id = ID++;
  const { code } = transformFromAst(ast, null, {
    presets: ['@babel/preset-env']
  });

  const dependencies = [];

  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      dependencies.push(node.source.value);
    },
  });

  return {
    id,
    filename,
    code,
    dependencies
  };
}

function createGraph(entry) {
  const mainAsset = createAsset(entry);
  const queue = [mainAsset];

  queue.forEach((asset) => {
    asset.mapping = {};
    const dirname = path.dirname(asset.filename);

    asset.dependencies.forEach((relativePath) => {
      const filename = path.join(dirname, relativePath);

      const child = createAsset(filename);

      asset.mapping[relativePath] = child.id;
      queue.push(child);
    });
  });

  return queue;
}

function bundler({ entry, output }) {
  const graph = createGraph(entry);
  let modules = '{';

  graph.forEach((asset) => {
    modules += `${asset.id}: [function(require, module, exports) { ${asset.code} }, ${JSON.stringify(asset.mapping)}],`;
  });

  modules += '}';

  const result = `(function (modules) {
      function require(id) {
        const [fn, mapping] = modules[id];

        function localRequire(relativePath) {
          return require(mapping[relativePath]);
        }

        const module = { exports: {} };
        fn(localRequire, module, module.exports);

        return module.exports;
      }

      require(0);
    })(${modules})`;

  fs.writeFileSync(output, result);
}

module.exports = {
  bundler
};