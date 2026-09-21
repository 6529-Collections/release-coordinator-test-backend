import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const environments = ['staging', 'prod'];

export function verifyControlledMonitoringDeploy(value, environment) {
  if (
    !environments.includes(environment) ||
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).join(',') !== 'fail_environment' ||
    !(value.fail_environment === null || environments.includes(value.fail_environment))
  )
    throw new Error('The controlled sample monitoring deployment input is invalid.');
  if (value.fail_environment === environment)
    throw new Error(`Controlled sample monitoring deployment failure for ${environment}.`);
  return { environment, allowed: true };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const value = JSON.parse(await readFile(process.argv[2], 'utf8'));
  console.log(JSON.stringify(verifyControlledMonitoringDeploy(value, process.env.ENVIRONMENT)));
}
