const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Scans release directory, computes SHA-256 checksums for all installer/release binaries,
 * and generates a standard checksums.sha256 manifest.
 */
function generateChecksums() {
  const distReleaseDir = path.resolve(__dirname, '../apps/desktop/dist-release');
  if (!fs.existsSync(distReleaseDir)) {
    console.log(`[Checksum] Release directory not found at ${distReleaseDir}. Run packaging first.`);
    return;
  }

  const files = fs.readdirSync(distReleaseDir);
  const releaseFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    // Match installer executables, zips, tarballs, blockmaps, and yaml manifests
    return (
      ext === '.exe' ||
      ext === '.zip' ||
      ext === '.blockmap' ||
      ext === '.yml' ||
      ext === '.yaml'
    ) && f !== 'checksums.sha256';
  });

  if (releaseFiles.length === 0) {
    console.log('[Checksum] No release binaries found to hash.');
    return;
  }

  const lines = [];
  console.log('\n--- Quickswap Release SHA-256 Checksums ---');

  for (const filename of releaseFiles) {
    const fullPath = path.join(distReleaseDir, filename);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const fileBuffer = fs.readFileSync(fullPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const entry = `${hash}  ${filename}`;
    lines.push(entry);
    console.log(`  ${filename} (${(stat.size / 1024 / 1024).toFixed(2)} MB):`);
    console.log(`    SHA-256: ${hash}`);
  }

  const manifestContent = lines.join('\n') + '\n';
  const manifestPath = path.join(distReleaseDir, 'checksums.sha256');
  fs.writeFileSync(manifestPath, manifestContent, 'utf8');

  console.log(`\nChecksums written to: ${manifestPath}\n`);
}

generateChecksums();
