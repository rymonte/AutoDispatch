# Windows release readiness

No binaries or release pipeline exist. Before implementation, resolve or explicitly agree baseline risks under PRE-01?PRE-10. Before distribution, approve licensing and verify dependency/SDK rights, third-party notices and replaceability obligations. Installer versus portable packaging, update mechanism and supported Windows versions remain design decisions.

When executable code exists, add reproducible lockfile builds, type/lint/test/security gates and Windows Electron packaging smoke tests. Validate packaged utility/preload/renderer boundaries, credentials, recovery, install/uninstall and upgrade behaviour on clean Windows environments. Publish an explicit simulator/aircraft compatibility matrix backed by live evidence, resource measurements and known limitations.

Use versioned release notes, checksums, source revision and dependency inventory/notices. Assess Windows signing and timestamping, protect signing credentials in restricted release environments and require maintainer approval for publishing. PR workflows must never receive signing or vendor credentials. Choose build provenance and artifact retention/update rollback policies during delivery design. Release assets/download links appear only after actual releases exist; bootstrap adds no pretend packaging jobs.
