# Sample operational monitoring

A separate sample package, like the real backend's ops/monitoring: hand-edited alarm sources in src/, a controlled deployment switch, and committed inventories generated from src/config/deploy-services.json. The build fails when a committed inventory is stale; run npm run generate after editing src/alarms.json. The sandbox release deploys it only from test main. No AWS account, credential or product monitoring is involved.
