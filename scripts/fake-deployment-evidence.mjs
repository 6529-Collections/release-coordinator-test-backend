import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateReleaseBuild } from "../coordinator/src/release-contract.mjs";
import { verifyApplicationBuild } from "../coordinator/sandbox/application-build.mjs";

const sha = (value) => /^[0-9a-f]{40}$/u.test(value ?? "");
const runId = (value) => /^[1-9][0-9]{0,19}$/u.test(value ?? "");
const digest = (value) => createHash("sha256").update(value).digest("hex");

function expected({ role, environment, sourceSha, workflowRunId, workflowPath, unit }) {
  if (
    !["frontend", "backend", "monitoring"].includes(role) ||
    !["staging", "prod"].includes(environment) ||
    !sha(sourceSha) ||
    !runId(workflowRunId) ||
    !/^\.github\/workflows\/[a-z0-9-]+\.yml$/u.test(workflowPath) ||
    (unit !== null && !/^[A-Za-z][A-Za-z0-9]{0,80}$/u.test(unit))
  )
    throw new Error("Fake deployment identity is invalid.");
  return {
    role,
    environment,
    source_sha: sourceSha,
    workflow_run_id: workflowRunId,
    workflow_path: workflowPath,
    unit
  };
}

async function readBuild(manifestPath, role, sourceSha) {
  const text = await readFile(manifestPath);
  const manifest = validateReleaseBuild(JSON.parse(text.toString("utf8")));
  if (manifest.role !== role || manifest.source_commit !== sourceSha)
    throw new Error("Fake deployment build belongs to different source code.");
  await verifyApplicationBuild(path.dirname(path.dirname(manifestPath)), role, sourceSha);
  return digest(text);
}

export async function createFakeDeploymentEvidence(input) {
  const identity = expected(input);
  const evidence = {
    contract: "fake-deployment-evidence-v1",
    ...identity,
    build_manifest_sha256: await readBuild(
      input.manifestPath,
      input.role,
      input.sourceSha
    )
  };
  await writeFile(input.outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export async function verifyFakeDeploymentEvidence(input) {
  const wanted = {
    contract: "fake-deployment-evidence-v1",
    ...expected(input),
    build_manifest_sha256: await readBuild(
      input.manifestPath,
      input.role,
      input.sourceSha
    )
  };
  const evidence = JSON.parse(await readFile(input.evidencePath, "utf8"));
  if (JSON.stringify(evidence) !== JSON.stringify(wanted))
    throw new Error("Fake deployment evidence does not match the selected run.");
  return evidence;
}

const direct =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (direct) {
  const [command, role, environment, sourceSha, workflowRunId, workflowPath, unitValue, manifestPath, evidencePath] =
    process.argv.slice(2);
  const input = {
    role,
    environment,
    sourceSha,
    workflowRunId,
    workflowPath,
    unit: unitValue === "-" ? null : unitValue,
    manifestPath,
    ...(command === "create" ? { outputPath: evidencePath } : { evidencePath })
  };
  const result =
    command === "create"
      ? await createFakeDeploymentEvidence(input)
      : command === "verify"
        ? await verifyFakeDeploymentEvidence(input)
        : (() => {
            throw new Error("Expected create or verify.");
          })();
  console.log(JSON.stringify(result));
}
