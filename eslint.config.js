import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['vendor/**', 'node_modules/**'],
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                THREE: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
    },
    {
        files: ['tests/**/*.js', 'e2e/**/*.js', 'playwright.config.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
];
