# Concurrent staging drift restoration acceptance fixture

This documentation-only backend change represents another developer's staging
work. It changes no sample application, database, or deployment workflow.

The Coordinator's restoration test must leave this backend staging change in
place while undoing only the selected frontend ticket's staging integration.
