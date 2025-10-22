module.exports = {
    // 基本格式设置
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: true,
    quoteProps: 'as-needed',
    
    // JSX设置
    jsxSingleQuote: true,
    
    // 尾随逗号
    trailingComma: 'none',
    
    // 括号间距
    bracketSpacing: true,
    bracketSameLine: false,
    
    // 箭头函数参数
    arrowParens: 'avoid',
    
    // 换行符
    endOfLine: 'lf',
    
    // 嵌入式语言格式化
    embeddedLanguageFormatting: 'auto',
    
    // HTML空白敏感性
    htmlWhitespaceSensitivity: 'css',
    
    // Vue文件中的脚本和样式标签缩进
    vueIndentScriptAndStyle: false,
    
    // 文件覆盖设置
    overrides: [
        {
            files: '*.json',
            options: {
                tabWidth: 2
            }
        },
        {
            files: '*.md',
            options: {
                printWidth: 80,
                proseWrap: 'always'
            }
        },
        {
            files: '*.yml',
            options: {
                tabWidth: 2
            }
        },
        {
            files: '*.yaml',
            options: {
                tabWidth: 2
            }
        }
    ]
};