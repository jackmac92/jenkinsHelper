import jenkins from 'jenkins';
import JsonCache from './localStore';

export default class JenkinsFetcher {
  constructor({ dir, username, password }) {
    this.jenkinsBaseUrl = `https://${username}:${password}@jenkins.cbinsights.com`;
    const Jenkins = jenkins({
      baseUrl: this.jenkinsBaseUrl,
      crumbIssuer: true,
      promisify: true
    });
    this.jenkinsClient = Jenkins;
    this.jenkinsStore = new JsonCache({ dir, Jenkins });
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

const getJobReports = jobs =>
  Promise.all(jobs.map(j => j.jenkinsName).map(Jenkins.job.get));

if (require.main === module) {
  const username = process.env.JENKINS_USERNAME;
  const password = process.env.JENKINS_PASSWORD;

  new JenkinsFetcher({ dir: './cache', username, password })
    .getJobInfo('tests/integration/cbi-site/selenium-grid-dev')
    .then(console.log);
}
