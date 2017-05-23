import jenkins from 'jenkins';
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

export const getJobInfo = (jobName, numHist = 5) =>
  Jenkins.job.get(jobName).then(jobReport =>
    getBuildHistory(jobReport, jobName, numHist).then(buildHistory =>
      Object.assign({}, jobReport, {
        buildHistory,
        buildNowUrl: `${jenkinsBaseUrl}/${jobReport.url.split('jenkins.cbinsights.com')[1]}/build?delay=0sec`
      })
    )
  );

// export const formatJobReport = jobReport => ({
//   text: jobReport.name,
//   color: jobReport.builds[0].result === 'SUCCESS' ? 'green' : 'red',
//   submenu: [
//     // { text: 'current build' },
//     {
//       text: 'Build Now',
//       bash: 'curl',
//       param1: '-X',
//       param2: 'POST',
//       param3: jobReport.buildNowUrl,
//       terminal: false,
//       color: 'blue'
//     },
//     {
//       text: 'Most Recent Build',
//       href: jobReport.builds[0].url,
//       color: jobReport.builds[0].result === 'SUCCESS' ? 'green' : 'red'
//     },
//     {
//       text: 'Last Failure',
//       href: jobReport.lastFailedBuild.url,
//       color: 'red'
//     },
//     {
//       text: 'Last Successful Build',
//       href: jobReport.lastSuccessfulBuild.url,
//       color: 'green'
//     },
//     {
//       text: 'Full History',
//       submenu: jobReport.builds.map(b => ({
//         text: b.fullDisplayName,
//         href: b.url,
//         color: b.result === 'SUCCESS' ? 'green' : 'red',
//         size: 8
//       }))
//     }
//   ]
// });

const getJobInfoWithFormat = jobName =>
  getJobInfo(jobName).then(formatJobReport);

const getJobReports = jobs =>
  Promise.all(jobs.map(j => j.jenkinsName).map(Jenkins.job.get));

