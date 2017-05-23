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
  ).then(buildHistory =>
    Object.assign({}, jobReport, {
      buiilds: buildHistory,
      buildNowUrl: `${jenkinsBaseUrl}/${jobReport.url.split('jenkins.cbinsights.com')[1]}/build?delay=0sec`
    })
  );

const getJobInfo = (jobName, numHist = 5) =>
  Jenkins.job
    .get(jobName)
    .then(jobReport => getBuildHistory(jobReport, jobName, numHist));

const formatJobReport = jobReport => ({
  text: jobReport.name,
  color: jobReport.builds[0].result === 'SUCCESS' ? 'green' : 'red',
  submenu: [
    // { text: 'current build' },
    {
      text: 'Build Now',
      bash: 'curl',
      param1: '-X',
      param2: 'POST',
      param3: jobReport.buildNowUrl,
      terminal: false,
      color: 'blue'
    },
    {
      text: 'Most Recent Build',
      href: jobReport.builds[0].url,
      color: jobReport.builds[0].result === 'SUCCESS' ? 'green' : 'red'
    },
    {
      text: 'Last Failure',
      href: jobReport.lastFailedBuild.url,
      color: 'red'
    },
    {
      text: 'Last Successful Build',
      href: jobReport.lastSuccessfulBuild.url,
      color: 'green'
    },
    {
      text: 'Full History',
      submenu: jobReport.builds.map(b => ({
        text: b.fullDisplayName,
        href: b.url,
        color: b.result === 'SUCCESS' ? 'green' : 'red',
        size: 8
      }))
    }
  ]
});

// actions: [Object],
// artifacts: [],
// building: false,
// description: null,
// displayName: '#256',
// duration: 465413,
// estimatedDuration: 470412,
// executor: null,
// fullDisplayName: 'CBI-Site » develop #256',
// id: '256',
// keepLog: false,
// number: 256,
// queueId: 22897,
// result: 'SUCCESS',
// timestamp: 1495553806956,
// url: 'https://jenkins.cbinsights.com/job/cbi-site/job/develop/256/',
// changeSets: [Object],
// nextBuild: [Object],

const getJobInfoWithFormat = jobName =>
  getJobInfo(jobName).then(formatJobReport);

const getJobReport = Jenkins.job.get;

const getFormattedJobReports = jobs =>
  jobs.map(j => j.jenkinsName).map(getJobInfoWithFormat);
getJobInfo('cbi-site/develop').then(report => {
  console.log(report.builds.slice(0, 5)[0]);
});

exports.getJobReport = getJobReport;
exports.getFormattedJobReports = getFormattedJobReports;
