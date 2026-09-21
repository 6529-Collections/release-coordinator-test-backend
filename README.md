# Coordinator sample backend

Small executable programs, locked npm builds, short-lived GitHub Actions artifacts and temporary test services for the sandbox only. No product credentials, environments or deployments are used.

The repository also exposes the Coordinator-facing workflow contract used by the real backend:

- `deploy.yml` keeps the real `Deploy a service` workflow name, environment and service inputs, specialist inputs, branch rules, concurrency groups and job name.
- `deploy-operational-monitoring.yml` keeps the real monitoring workflow name, `environment` and `commit_sha` inputs, main-only rule and concurrency group.
- Both workflows build the small sample packages and publish `fake-deployment-evidence-v1` artifacts tied to the exact source commit and workflow run.

These workflows never use AWS, real services, product databases, monitoring accounts, or product secrets. The older `sandbox-release.yml` remains available while the Coordinator is taught to use the mirrored interface. Its `worker` fixture remains sandbox-only; mirrored dispatches use the real backend service names.

The coordinator directory is generated from the standalone Coordinator; edit the source project and republish the bundle instead of maintaining a second implementation.
