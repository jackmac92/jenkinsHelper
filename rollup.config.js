export default {
  dest: 'bundle.js',
  format: 'cjs',
  entry: 'index.js',
  external: ['jenkins', 'mkdirp', 'localApi', 'fs', 'path']
};
