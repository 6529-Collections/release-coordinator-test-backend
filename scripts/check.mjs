import { readFile } from 'node:fs/promises';
import { checkSample } from '../coordinator/sandbox/check.mjs';

const contracts = {
  'deploy.yml': [
    'name: Deploy a service',
    'expected_source_sha:',
    'db_schema_scope:',
    'release_note_groups:',
    'group: deploy-control-${{ github.event.inputs.environment }}',
    'name: Build and deploy ${{ github.event.inputs.service }} to ${{ github.event.inputs.environment }}'
  ],
  'deploy-operational-monitoring.yml': [
    'name: Deploy operational monitoring',
    'commit_sha:',
    'group: operational-monitoring-${{ inputs.environment }}'
  ]
};

for (const [name, required] of Object.entries(contracts)) {
  const workflow = await readFile(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');
  for (const text of required) {
    if (!workflow.includes(text))
      throw new Error(`${name} no longer mirrors required contract text: ${text}`);
  }
}

await checkSample('backend');
