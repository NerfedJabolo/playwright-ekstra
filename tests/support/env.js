'use strict';

// Väike .env-lugeja, et mitte lisada sõltuvust dotenv-ile.
// Väärtused võetakse järjekorras: päris keskkonnamuutuja > .env fail > vaikeväärtus.
const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '..', '.env');

function loadEnvFile(file = ENV_FILE) {
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

const fileEnv = loadEnvFile();

function env(name, fallback = '') {
  if (process.env[name] !== undefined && process.env[name] !== '') return process.env[name];
  if (fileEnv[name] !== undefined) return fileEnv[name];
  return fallback;
}

function getCredentials() {
  return { username: env('SISEVEEB_USER'), password: env('SISEVEEB_PASS') };
}

function hasCredentials() {
  const { username, password } = getCredentials();
  return Boolean(username && password);
}

module.exports = { env, getCredentials, hasCredentials, loadEnvFile, ENV_FILE };
