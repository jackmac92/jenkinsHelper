import jenkins from 'jenkins';
import localApi from 'localApi';

export default class JenkinsFetcher {
  constructor({ dir, username, password }) {
    this.jenkinsBaseUrl = `https://${username}:${password}@jenkins.cbinsights.com`;
    this.makeJenkinsUrl = (un, pw) =>
      `https://${un}:${pw}@jenkins.cbinsights.com`;
    const Jenkins = jenkins({
      baseUrl: this.jenkinsBaseUrl,
      crumbIssuer: true,
      promisify: true
    });
    this.getJob = jobName =>
      Jenkins.job.get(jobName).catch(err => {
        console.log(`Error fetching ${jobName}`);
        console.log(err);
        console.log(`Error fetching ${jobName}`);
      });
    const buildFetcher = new localApi({
      doRequest: (name, id) => Jenkins.build.get(name, id),
      shouldCache: (res, name, id) => !res.building,
      getKey: (name, id) => `${name}-${id}`,
      storage: dir
    });
    this.getBuild = (name, id) => buildFetcher.get(name, id);

    this.getJobInfo = this.getJobInfo.bind(this);
    this.makeBuildUrl = this.makeBuildUrl.bind(this);
    this.getBuildHistory = this.getBuildHistory.bind(this);
  }
  getBuildHistory(jobReport, jobName, numHist = 50) {
    return Promise.all(
      jobReport.builds
        .slice(0, numHist)
        .map(b => this.getBuild(jobName, b.number))
    );
  }
  makeBuildUrl(url) {
    return `${this.jenkinsBaseUrl}/${url.split(
      'jenkins.cbinsights.com'
    )[1]}/build?delay=0sec`;
  }
  getJobInfo(jobName) {
    const self = this;
    return new Promise((resolve, reject) =>
      self
        .getJob(jobName)
        .then(jobReport =>
          self.getBuildHistory(jobReport, jobName).then(buildHistory =>
            resolve(
              Object.assign({}, jobReport, {
                buildHistory,
                buildNowUrl: this.makeBuildUrl(jobReport.url),
                jenkinsName: jobName
              })
            )
          )
        )
        .catch(reject)
    );
  }
}

const getJobReports = jobs =>
  Promise.all(jobs.map(j => j.jenkinsName).map(Jenkins.job.get));

if (require.main === module) {
  const username = process.env.JENKINS_USERNAME;
  const password = process.env.JENKINS_PASSWORD;

  new JenkinsFetcher({ dir: './cache', username, password })
    .getJobInfo('tests/integration/cbi-site/selenium-grid-dev')
    .then(console.log);
}
