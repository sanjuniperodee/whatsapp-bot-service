/* eslint-disable @typescript-eslint/no-var-requires */
//@es
const tsConfig = require('./tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

const baseUrl = './';

// Adjust paths for compiled output (replace src with dist)
const adjustedPaths = {};
for (const [key, value] of Object.entries(tsConfig.compilerOptions.paths)) {
  adjustedPaths[key] = value.map(path => path.replace('./src/', './dist/'));
}

// Add direct src/* mapping to dist/*
adjustedPaths['src/*'] = ['./dist/*'];

tsConfigPaths.register({
  baseUrl,
  paths: adjustedPaths,
});
