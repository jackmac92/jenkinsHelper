export default {
  dest: 'bundle.js',
  format: 'cjs',
  entry: 'src/index.js',
  external: ['jenkins', 'mkdirp', 'localApi', 'fs', 'path']
};
