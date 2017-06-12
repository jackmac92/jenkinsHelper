import jenkins from 'jenkins';
import jsonCache from './localStore';
// TODO figure out how to determine if build is active
const username = process.env.JENKINS_USERNAME;
const password = process.env.JENKINS_PASSWORD;

const jenkinsBaseUrl = `https://${username}:${password}@jenkins.cbinsights.com`;
const Jenkins = jenkins({
  baseUrl: jenkinsBaseUrl,
  crumbIssuer: true,
  promisify: true
});

export default class JenkinsFetcher {
  constructor(dir) {
    this.jenkinsStore = jsonCache(dir);
  }
  getBuildHistory(jobReport, jobName, numHist) {
    return Promise.all(
      jobReport.builds
        .slice(0, numHist)
        .map(b => this.jenkinsStore.get({ build: jobName, id: b.number }))
    );
  }
  getJobInfo(jobName, numHist = 5) {
    return new Promise((resolve, reject) =>
      Jenkins.job.get(jobName).then(jobReport =>
        this.getBuildHistory(jobReport, jobName, numHist).then(buildHistory =>
          resolve(
            Object.assign({}, jobReport, {
              buildHistory,
              buildNowUrl: `${jenkinsBaseUrl}/${jobReport.url.split('jenkins.cbinsights.com')[1]}/build?delay=0sec`
            })
          )
        )
      )
    );
  }
}

const getJobReports = jobs =>
  Promise.all(jobs.map(j => j.jenkinsName).map(Jenkins.job.get));
