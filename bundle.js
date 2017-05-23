'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var jenkins = _interopDefault(require('jenkins'));

// TODO figure out how to determine if build is active
const password = '2zxx8b4Pba7u';
const username = 'jmccown';

const jenkinsBaseUrl = `https://${username}:${password}@jenkins.cbinsights.com`;
const Jenkins = jenkins({
  baseUrl: jenkinsBaseUrl,
  crumbIssuer: true,
  promisify: true
});

const getBuildHistory = (jobReport, jobName, numHist) =>
  Promise.all(
    jobReport.builds
      .slice(0, numHist)
      .map(b =>
        Jenkins.build.get(jobName, b.number).catch(err => console.log(err))
      )
  );

const getJobInfo = (jobName, numHist = 5) =>
  Jenkins.job.get(jobName).then(jobReport =>
    getBuildHistory(jobReport, jobName, numHist).then(buildHistory =>
      Object.assign({}, jobReport, {
        buildHistory,
        buildNowUrl: `${jenkinsBaseUrl}/${jobReport.url.split('jenkins.cbinsights.com')[1]}/build?delay=0sec`
      })
    )
  );

getJobInfo('cbi-site/develop').then(console.dir);

exports.getJobInfo = getJobInfo;
