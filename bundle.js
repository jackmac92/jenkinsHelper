'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var jenkins = _interopDefault(require('jenkins'));
var mkdirp = _interopDefault(require('mkdirp'));
var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));

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

class Fetcher {
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
      return res;
    });
  }
  get(keyInfo) {
    return this.getCacheResponse(keyInfo).catch(() =>
      this.requestAndCache(keyInfo)
    );
  }
}

class JenkinsFetcher {
  constructor({ dir, username, password }) {
    this.jenkinsBaseUrl = `https://${username}:${password}@jenkins.cbinsights.com`;
    const Jenkins = jenkins({
      baseUrl: this.jenkinsBaseUrl,
      crumbIssuer: true,
      promisify: true
    });
    this.jenkinsClient = Jenkins;
    this.jenkinsStore = new Fetcher({ dir, Jenkins });
    this.getJobInfo = this.getJobInfo.bind(this);
    this.getBuildHistory = this.getBuildHistory.bind(this);
  }
  getBuildHistory(jobReport, jobName, numHist) {
    return Promise.all(
      jobReport.builds
        .slice(0, numHist)
        .map(b => this.jenkinsStore.get({ build: jobName, id: b.number }))
    );
  }
  getJobInfo(jobName, numHist = 5) {
    const self = this;
    return new Promise((resolve, reject) =>
      self.jenkinsClient.job.get(jobName).then(jobReport =>
        self.getBuildHistory(jobReport, jobName, numHist).then(buildHistory =>
          resolve(
            Object.assign({}, jobReport, {
              buildHistory,
              buildNowUrl: `${this.jenkinsBaseUrl}/${jobReport.url.split('jenkins.cbinsights.com')[1]}/build?delay=0sec`
            })
          )
        )
      )
    );
  }
}

if (require.main === module) {
  const username = process.env.JENKINS_USERNAME;
  const password = process.env.JENKINS_PASSWORD;

  new JenkinsFetcher({ dir: './cache', username, password })
    .getJobInfo('tests/integration/cbi-site/selenium-grid-dev')
    .then(console.log);
}

module.exports = JenkinsFetcher;
