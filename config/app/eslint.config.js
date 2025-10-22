import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Node.js globals
                global: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                console: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                // Web Workers
                self: 'readonly',
                importScripts: 'readonly',
                postMessage: 'readonly'
            }
        },
        rules: {
            // 代码风格规则
            'indent': ['error', 4, { 
                'SwitchCase': 1,
                'VariableDeclarator': 1,
                'outerIIFEBody': 1,
                'MemberExpression': 1,
                'FunctionDeclaration': { 'parameters': 1, 'body': 1 },
                'FunctionExpression': { 'parameters': 1, 'body': 1 },
                'CallExpression': { 'arguments': 1 },
                'ArrayExpression': 1,
                'ObjectExpression': 1,
                'ImportDeclaration': 1,
                'flatTernaryExpressions': false,
                'ignoreComments': false
            }],
            'quotes': ['error', 'single', { 
                'avoidEscape': true, 
                'allowTemplateLiterals': true 
            }],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'never'],
            'comma-spacing': ['error', { 'before': false, 'after': true }],
            'comma-style': ['error', 'last'],
            'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],
            'space-before-blocks': ['error', 'always'],
            'space-before-function-paren': ['error', {
                'anonymous': 'always',
                'named': 'never',
                'asyncArrow': 'always'
            }],
            'space-in-parens': ['error', 'never'],
            'space-infix-ops': 'error',
            'space-unary-ops': ['error', { 'words': true, 'nonwords': false }],
            'keyword-spacing': ['error', { 'before': true, 'after': true }],
            'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
            'curly': ['error', 'multi-line'],
            'eol-last': ['error', 'always'],
            'no-trailing-spaces': 'error',
            'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
            'padded-blocks': ['error', 'never'],
            'padding-line-between-statements': [
                'error',
                { 'blankLine': 'always', 'prev': ['const', 'let', 'var'], 'next': '*' },
                { 'blankLine': 'any', 'prev': ['const', 'let', 'var'], 'next': ['const', 'let', 'var'] },
                { 'blankLine': 'always', 'prev': '*', 'next': 'return' },
                { 'blankLine': 'always', 'prev': '*', 'next': 'function' },
                { 'blankLine': 'always', 'prev': 'function', 'next': '*' },
                { 'blankLine': 'always', 'prev': '*', 'next': 'class' },
                { 'blankLine': 'always', 'prev': 'class', 'next': '*' }
            ],

            // 命名规范
            'camelcase': ['error', { 
                'properties': 'always',
                'ignoreDestructuring': false,
                'ignoreImports': false,
                'ignoreGlobals': false
            }],
            'new-cap': ['error', { 
                'newIsCap': true, 
                'capIsNew': false,
                'properties': true
            }],

            // 函数规则
            'func-names': ['error', 'as-needed'],
            'func-style': ['error', 'declaration', { 'allowArrowFunctions': true }],
            'max-params': ['warn', 5],
            'max-lines-per-function': ['warn', { 'max': 100, 'skipBlankLines': true, 'skipComments': true }],
            'prefer-arrow-callback': ['error', { 'allowNamedFunctions': true }],
            'arrow-spacing': ['error', { 'before': true, 'after': true }],
            'arrow-parens': ['error', 'as-needed'],

            // 对象和数组规则
            'object-shorthand': ['error', 'always'],
            'prefer-destructuring': ['error', {
                'array': true,
                'object': true
            }, {
                'enforceForRenamedProperties': false
            }],
            'dot-notation': ['error', { 'allowKeywords': true }],
            'quote-props': ['error', 'as-needed'],

            // 控制流规则
            'no-else-return': ['error', { 'allowElseIf': false }],
            'no-lonely-if': 'error',
            'no-unneeded-ternary': ['error', { 'defaultAssignment': false }],
            'prefer-const': ['error', { 'destructuring': 'any', 'ignoreReadBeforeAssign': true }],
            'no-var': 'error',

            // 错误处理规则
            'no-console': ['warn', { 'allow': ['warn', 'error', 'info'] }],
            'no-debugger': 'error',
            'no-alert': 'error',
            'no-unused-vars': ['error', { 
                'vars': 'all', 
                'args': 'after-used', 
                'ignoreRestSiblings': true,
                'argsIgnorePattern': '^_'
            }],
            'no-undef': 'error',
            'no-implicit-globals': 'error',
            'no-global-assign': 'error',

            // 安全规则
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-script-url': 'error',
            'no-proto': 'error',
            'no-iterator': 'error',
            'no-with': 'error',

            // 最佳实践
            'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
            'no-eq-null': 'off', // 与eqeqeq冲突
            'strict': ['error', 'global'],
            'no-magic-numbers': ['warn', { 
                'ignore': [-1, 0, 1, 2, 10, 100, 1000],
                'ignoreArrayIndexes': true,
                'enforceConst': true,
                'detectObjects': false
            }],
            'complexity': ['warn', 10],
            'max-depth': ['warn', 4],
            'max-nested-callbacks': ['warn', 3],

            // 注释规则
            'spaced-comment': ['error', 'always', {
                'line': { 'markers': ['/'], 'exceptions': ['-', '+'] },
                'block': { 'markers': ['*'], 'exceptions': ['*'], 'balanced': true }
            }],
            'multiline-comment-style': ['error', 'starred-block'],

            // 文件规则
            'max-lines': ['warn', { 'max': 1000, 'skipBlankLines': true, 'skipComments': true }],
            'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1, 'maxBOF': 0 }]
        }
    },
    {
        // CommonJS文件特殊配置
        files: ['**/*.cjs'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: {
                module: 'writable',
                exports: 'writable',
                require: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly'
            }
        },
        rules: {
            'strict': ['error', 'global']
        }
    },
    {
        // 脚本文件特殊配置
        files: ['scripts/**/*.js', 'scripts/**/*.cjs'],
        languageOptions: {
            globals: {
                process: 'readonly',
                console: 'readonly'
            }
        },
        rules: {
            'no-console': 'off',
            'no-process-exit': 'off'
        }
    },
    {
        // 测试文件特殊配置
        files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                jest: 'readonly'
            }
        },
        rules: {
            'no-magic-numbers': 'off',
            'max-lines-per-function': 'off',
            'max-lines': 'off'
        }
    }
];