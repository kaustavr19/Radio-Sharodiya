#!/usr/bin/env node
// Generates a BETA_ADMIN_PASSWORD_HASH value for the beta admin desk.
// Run locally so the plaintext password never leaves your machine:
//
//   node scripts/hash-admin-password.mjs "your chosen password"
//
// Paste the printed value into the BETA_ADMIN_PASSWORD_HASH environment
// variable (e.g. in Vercel project settings). Re-run to rotate the password.

import { hashPassword } from '../server/beta/security.js';

const password = process.argv.slice(2).join(' ');

if (!password) {
  console.error('Usage: node scripts/hash-admin-password.mjs "your password"');
  process.exit(1);
}

if (password.length < 12) {
  console.error('Choose a password with at least 12 characters.');
  process.exit(1);
}

console.log(hashPassword(password));
