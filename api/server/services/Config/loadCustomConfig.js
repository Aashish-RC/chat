const fs = require('fs');
const path = require('path');
const { loadYaml, redactConfigSecretMaps, createCustomConfigLoader } = require('@librechat/api');

const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const ra1ConfigPath = path.resolve(projectRoot, 'ra1.yaml');
const legacyConfigPath = path.resolve(projectRoot, 'librechat.yaml');

// Prioritize RA1_CONFIG_PATH, CONFIG_PATH, ra1.yaml, or fallback to librechat.yaml
const explicitPath = process.env.RA1_CONFIG_PATH || process.env.CONFIG_PATH;
const defaultConfigPath = explicitPath
  ? path.resolve(explicitPath)
  : (fs.existsSync(ra1ConfigPath) ? ra1ConfigPath : legacyConfigPath);

module.exports = createCustomConfigLoader({
  loadLocal: loadYaml,
  defaultConfigPath,
  redactConfig: redactConfigSecretMaps,
});
