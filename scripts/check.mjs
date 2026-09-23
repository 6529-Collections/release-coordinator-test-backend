import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { parse } from 'yaml';
import { checkSample } from '../coordinator/sandbox/check.mjs';
import { verifyControlledMonitoringDeploy } from './controlled-monitoring-deploy.mjs';

const workflow = async (name) =>
  parse(await readFile(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8'));
const same = (actual, expected, label) => {
  if (!isDeepStrictEqual(actual, expected))
    throw new Error(`${label} no longer matches the mirrored workflow contract.`);
};

const deploy = await workflow('deploy.yml');
same(deploy.name, 'Deploy a service', 'service workflow name');
same(
  Object.keys(deploy.on.workflow_dispatch.inputs),
  [
    'environment',
    'service',
    'expected_source_sha',
    'db_schema_scope',
    'membership_runtime_mode',
    'membership_source_tracking_mode',
    'membership_read_mode',
    'membership_shadow_mode',
    'membership_reader_profile_ids',
    'membership_reader_coverage_revision',
    'membership_worker_mapping_enabled',
    'membership_dispatch_schedule_enabled',
    'release_pull_request',
    'release_note_publish',
    'release_group_services',
    'release_note_groups',
    'release_note_opt_out'
  ],
  'service dispatch inputs'
);
same(
  deploy.concurrency.group,
  'deploy-control-${{ github.event.inputs.environment }}',
  'service environment lock'
);
same(
  deploy.jobs['build-and-deploy'].name,
  'Build and deploy ${{ github.event.inputs.service }} to ${{ github.event.inputs.environment }}',
  'service deploy job'
);
same(
  deploy.jobs['build-and-deploy'].concurrency.group,
  'deploy-service-${{ github.event.inputs.environment }}-${{ github.event.inputs.service }}',
  'individual service lock'
);
const inputCheck = deploy.jobs['build-and-deploy'].steps.find(
  (step) => step.name === 'Validate dispatch inputs before using code'
);
if (
  !inputCheck?.run.includes('test "$GITHUB_REF" = refs/heads/1a-staging') ||
  !inputCheck.run.includes('test "$GITHUB_REF" = refs/heads/main')
)
  throw new Error('Service deployment branch guards are missing.');

const monitoring = await workflow('deploy-operational-monitoring.yml');
same(monitoring.name, 'Deploy operational monitoring', 'monitoring workflow name');
same(
  Object.keys(monitoring.on.workflow_dispatch.inputs),
  ['environment'],
  'monitoring inputs'
);
same(
  monitoring.concurrency.group,
  'operational-monitoring-${{ inputs.environment }}',
  'monitoring lock'
);
const monitoringBranch = monitoring.jobs.monitoring.steps.find(
  (step) => step.name === 'Verify environment branch'
);
if (
  monitoring.jobs.monitoring.if !== undefined ||
  !monitoringBranch?.run.includes(
    'staging) expected_ref=refs/heads/1a-staging'
  ) ||
  !monitoringBranch.run.includes('prod) expected_ref=refs/heads/main') ||
  !monitoringBranch.run.includes('"$GITHUB_REF" != "$expected_ref"')
)
  throw new Error('Monitoring environment branch guards are missing.');
const monitoringCheckout = monitoring.jobs.monitoring.steps.find(
  (step) => step.uses?.startsWith('actions/checkout@')
);
same(monitoringCheckout?.with?.ref, '${{ github.sha }}', 'monitoring source');
const controlledFailure = monitoring.jobs.monitoring.steps.find(
  (step) => step.name === 'Apply the controlled sample monitoring switch'
);
if (
  controlledFailure?.env?.ENVIRONMENT !== '${{ inputs.environment }}' ||
  controlledFailure.run !==
    'node scripts/controlled-monitoring-deploy.mjs ops/monitoring/dist/deploy.json'
)
  throw new Error('The controlled sample monitoring failure step is missing.');
same(
  verifyControlledMonitoringDeploy({ fail_environment: null }, 'staging'),
  { environment: 'staging', allowed: true },
  'controlled monitoring pass'
);
let failed = false;
try {
  verifyControlledMonitoringDeploy({ fail_environment: 'staging' }, 'staging');
} catch (error) {
  failed = error.message === 'Controlled sample monitoring deployment failure for staging.';
}
if (!failed) throw new Error('The controlled sample monitoring failure did not stop deployment.');

const monitoringPackage = JSON.parse(
  await readFile(new URL('../ops/monitoring/package.json', import.meta.url), 'utf8')
);
if (monitoringPackage.scripts?.build !== 'node ../../coordinator/sandbox/application-build.mjs monitoring')
  throw new Error('The sample monitoring build entry point is missing.');

await checkSample('backend');
