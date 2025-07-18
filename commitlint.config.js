module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting, missing semicolons, etc.
        'refactor', // Code refactoring
        'test',     // Adding tests
        'chore',    // Maintenance
        'perf',     // Performance improvements
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert',   // Revert changes
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      [
        'api',        // API routes
        'auth',       // Authentication
        'chat',       // Chat interface
        'claude',     // Claude Code integration
        'components', // React components
        'database',   // Database related
        'docker',     // Docker configuration
        'docs',       // Documentation
        'hooks',      // React hooks
        'lib',        // Library utilities
        'mcp',        // MCP integration
        'security',   // Security related
        'tests',      // Testing
        'types',      // TypeScript types
        'ui',         // UI components
        'utils',      // Utilities
        'deps',       // Dependencies
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },
};