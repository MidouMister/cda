'use strict'

const tseslint = require('typescript-eslint')

const estImportExterne = (source) => !source.startsWith('.') && !source.startsWith('/')

const regleInterdireImportExterne = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Interdit tout import externe depuis le dossier domaine/.',
    },
    messages: {
      importExterne: 'Import externe interdit dans domaine/ : « {{source}} ».',
    },
    schema: [],
  },
  create(context) {
    const signale = (source) => {
      context.report({
        node: source,
        messageId: 'importExterne',
        data: { source: source.value },
      })
    }

    return {
      ImportDeclaration(noeud) {
        if (noeud.source && estImportExterne(noeud.source.value)) {
          signale(noeud.source)
        }
      },
      ExportNamedDeclaration(noeud) {
        if (noeud.source && estImportExterne(noeud.source.value)) {
          signale(noeud.source)
        }
      },
      ExportAllDeclaration(noeud) {
        if (noeud.source && estImportExterne(noeud.source.value)) {
          signale(noeud.source)
        }
      },
      CallExpression(noeud) {
        const callee = noeud.callee
        const argument = noeud.arguments[0]
        if (
          callee &&
          callee.type === 'Identifier' &&
          callee.name === 'require' &&
          argument &&
          argument.type === 'Literal' &&
          typeof argument.value === 'string' &&
          estImportExterne(argument.value)
        ) {
          signale(argument)
        }
      },
    }
  },
}

module.exports = [
  {
    ignores: ['node_modules/**', 'out/**', 'dist/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        global: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['domaine/**/*.ts'],
    plugins: {
      egto: {
        rules: {
          'pas-d-import-externe': regleInterdireImportExterne,
        },
      },
    },
    rules: {
      'egto/pas-d-import-externe': 'error',
    },
  },
]
