import jenkins from 'jenkins';

const password = '2zxx8b4Pba7u';
const username = 'jmccown';

const jenkinsBaseUrl = `https://${username}:${password}@jenkins.cbinsights.com`;
const Jenkins = jenkins({
  baseUrl: jenkinsBaseUrl,
  crumbIssuer: true,
  promisify: true
});

const formatJobReport = (jobReport, jobName) =>
  Jenkins.build.get(jobName, jobReport.lastBuild.number).then(lastBuild => {
    const buildNowUrl = `${jenkinsBaseUrl}/${jobReport.url.split('jenkins.cbinsights.com')[1]}/build?delay=0sec`;
    return {
      text: jobName
        .split('/')
        .map(x => x[0].toUpperCase() + x.slice(1))
        .join(' '),
      color: lastBuild.result === 'SUCCESS' ? 'green' : 'red',
      submenu: [
        {
          text: 'Build Now',
          bash: 'curl',
          param1: '-X',
          param2: 'POST',
          param3: buildNowUrl,
          terminal: false,
          color: 'blue'
        },
        // { text: 'current build' },
        {
          text: 'Most Recent Build',
          href: jobReport.lastBuild.url,
          color: lastBuild.result === 'SUCCESS' ? 'green' : 'red'
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
            text: `${jobName} build ${b.number}`,
            href: b.url,
            size: 8
          }))
        }
      ]
    };
  });

const getJobReports = jobs =>
  Promise.all(jobs.map(j => j.jenkinsName).map(Jenkins.job.get));

export const getJobReport = Jenkins.job.get;

export const getFormattedJobReports = jobs =>
  new Promise(resolve => {
    Promise.all(jobs.map(j => Jenkins.job.get(j.jenkinsName))).then(reports => {
      const problemJobs = reports.filter(r => r.healthReport.score < 90);
      let err;
      if (problemJobs.length) {
        err = problemJobs.map(j => j.name).join(' | ');
      }
      const formatPromises = reports.map((r, idx) =>
        formatJobReport(r, jobs[idx].jenkinsName)
      );
      Promise.all(formatPromises).then(items => resolve({ err, items }));
    });
  });
