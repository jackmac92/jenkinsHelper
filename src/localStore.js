import mkdirp from 'mkdirp';
import path from 'path';
import fs from 'fs';

const mkderp = (dir, file = '') =>
  new Promise((resolve, reject) => {
    mkdirp(path.join(dir, file.split('/').slice(0, -1).join('/')), err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  }).catch(console.log);

const store = storage => {
  const dir = storage || path.join(process.cwd(), 'store');
  return {
    dir, // store in this directory

    list() {
      // list all stored objects by reading the file system
      return mkderp(dir)
        .then(() => readDir(dir))
        .then(files =>
          Promise.all(files.filter(f => f.substr(-5) === '.json').map(loadFile))
        );
    },

    // store an object to file

    add(name, obj) {
      return mkderp(dir, name).then(
        () =>
          new Promise((resolve, reject) => {
            fs.writeFile(
              path.join(dir, `${name}.json`),
              JSON.stringify(obj, null, 2),
              'utf8',
              err => (err ? reject(err) : resolve(name))
            );
          })
      );
    },

    // delete an object's file

    remove(id) {
      mkderp(dir).then(
        () =>
          new Promise((resolve, reject) =>
            fs.unlink(
              path.join(dir, `${id}.json`),
              err => (err ? reject(err) : resolve())
            )
          )
      );
    },

    // load an object from file

    load(name) {
      try {
        return mkderp(dir, name).then(() =>
          loadFile(path.join(dir, `${name}.json`))
        );
      } catch (e) {
        return Promise.reject();
      }
    }
  };
};

const readDir = dir =>
  new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) return reject(err);
      resolve(files.map(f => path.join(dir, f)));
    });
  });

const loadFile = f =>
  new Promise((resolve, reject) => {
    fs.readFile(f, 'utf8', (err, code) => {
      if (err) reject('error loading file' + err);
      let jsonObj;
      try {
        jsonObj = JSON.parse(code);
      } catch (e) {
        reject('Error parsing ' + f + ': ' + e);
      }
      resolve(jsonObj);
    });
  });

export default class Fetcher {
  constructor({ dir, Jenkins }) {
    this.cache = store(dir);
    this.Jenkins = Jenkins;
    this.saveToCache = this.saveToCache.bind(this);
    this.getCacheResponse = this.getCacheResponse.bind(this);
    this.makeRequest = this.makeRequest.bind(this);
    this.requestAndCache = this.requestAndCache.bind(this);
    this.get = this.get.bind(this);
  }
  saveToCache({ build, id }, res) {
    const name = `${build}-${id}`;
    return this.cache.add(name, res);
  }
  getCacheResponse({ build, id }) {
    return this.cache.load(`${build}-${id}`);
  }
  makeRequest({ build, id }) {
    return this.Jenkins.build.get(build, id).catch(console.log);
  }
  requestAndCache(keyInfo) {
    return this.makeRequest(keyInfo).then(res => {
      this.saveToCache(keyInfo, res);
    });
  }
  get(keyInfo) {
    return this.getCacheResponse(keyInfo)
      .then(() => console.log(`Found cached response for ${keyInfo}`))
      .catch(() => this.requestAndCache(keyInfo));
  }
}
