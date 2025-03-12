'use strict'
const path = require('node:path')

/**
 * @type {import('mocha').MochaOptions}
 */
module.exports = {
  extension: ['ts', 'js'],
  package: path.join(__dirname, './package.json'),
  ui: 'bdd',
  require: ['tsx'],
  spec: ['./test/**/*.test.*'],
  exit: true,
}
