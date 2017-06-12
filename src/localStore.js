import mkdirp from 'mkdirp';
import path from 'path';
import fs from 'fs';
import jenkins from 'jenkins';

const username = process.env.JENKINS_USERNAME;
const password = process.env.JENKINS_PASSWORD;

const jenkinsBaseUrl = `https://${username}:${password}@jenkins.cbinsights.com`;
const Jenkins = jenkins({
  baseUrl: jenkinsBaseUrl,
  crumbIssuer: true,
  promisify: true
});

const mkderp = (dir, file = '') =>
  new Promise((resolve, reject) => {
    mkdirp(path.join(dir, file.split('/').slice(0, -1).join('/')), err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  }).catch(err => {
    console.log('error mkderp');
    console.log('error mkderp');
    console.log('error mkderp');
    console.log(err);
  });

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
  constructor(dir) {
    this.cache = store(dir);
  }
  saveToCache({ build, id }, res) {
    const name = `${build}-${id}`;
    return this.cache.add(name, res);
  }
  getCacheResponse({ build, id }) {
    try {
      return this.cache.load(`${build}-${id}`);
    } catch (e) {
      console.log(`No cached response for ${build} ${id}`);
      return Promise.reject();
    }
  }
  makeRequest({ build, id }) {
    return Jenkins.build.get(build, id).catch(console.log);
  }
  requestAndCache(keyInfo) {
    return this.makeRequest(keyInfo).then(res => {
      this.saveToCache(keyInfo, res);
    });
  }
  get(keyInfo) {
    return this.getCacheResponse(keyInfo).catch(() =>
      this.requestAndCache(keyInfo)
    );
  }
}
