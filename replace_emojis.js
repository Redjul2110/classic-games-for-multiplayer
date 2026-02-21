const fs = require('fs');
const path = require('path');

const REPLACEMENTS = {
    '🤖': '[AI]',
    '🏆': '★',
    '🎉': '!',
    '⚠️': '[!]',
    '❌': '[X]',
    '✨': '[*]',
    '❓': '?',
    '💬': 'Chat',

};

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

walkDir(path.join(__dirname, 'src'), function (filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;
        for (const [emoji, replacement] of Object.entries(REPLACEMENTS)) {
            content = content.split(emoji).join(replacement);
        }
        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated: ' + filePath);
        }
    }
});
