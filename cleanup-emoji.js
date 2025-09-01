const fs = require('fs');
const path = require('path');

// 需要移除的 emoji 列表
const emojisToRemove = [
    '🏗️', '🔧', '✅', '🎯', '📱', '🎊', '✨', '📋', '🔍', '📊', '⚡', '🚀', '🛠️', '💡', '🔥', '🌟', '⭐', '🎉', '💻', '🖥️',
    '📚', '📖', '📝', '✏️', '🗂️', '📂', '📁', '📄', '🗃️', '🗄️', '🗑️', '🗒️', '📌', '📍', '📎', '📏', '📐', '🔒', '🔓',
    '🔏', '🔐', '🗝️', '🔑', '🛡️', '⚔️', '🔫', '🗡️', '🔪', '💣', '🔨', '⛏️', '⚒️', '🔩', '⚙️', '🗜️', '⚖️', '🔗', '⛓️',
    '🧰', '🧲', '🧪', '🧬', '🧫', '🧹', '🧺', '🧴', '🧽', '🧼', '🔄', '🔹', '🧑‍💻'
];

// 目錄路徑
const workDir = path.join(__dirname, 'src', 'content', 'work');

// 清理 emoji 的函數
function removeEmojis(content) {
    let cleanedContent = content;
    emojisToRemove.forEach(emoji => {
        // 移除 emoji 及其前後的空白字符
        const regex = new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'g');
        cleanedContent = cleanedContent.replace(regex, '');
    });
    return cleanedContent;
}

// 處理單個文件的函數
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const cleanedContent = removeEmojis(content);

        if (content !== cleanedContent) {
            fs.writeFileSync(filePath, cleanedContent, 'utf8');
            console.log(`✅ 已清理: ${path.basename(filePath)}`);
            return true;
        } else {
            console.log(`ℹ️  無需清理: ${path.basename(filePath)}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 處理失敗: ${path.basename(filePath)} - ${error.message}`);
        return false;
    }
}

// 主函數
function main() {
    console.log('🚀 開始清理 markdown 文件中的 emoji...\n');

    // 獲取所有 md 文件
    const files = fs.readdirSync(workDir)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(workDir, file));

    let cleanedCount = 0;
    let totalCount = files.length;

    files.forEach(filePath => {
        if (processFile(filePath)) {
            cleanedCount++;
        }
    });

    console.log(`\n🎉 清理完成！`);
    console.log(`📊 總共處理了 ${totalCount} 個文件`);
    console.log(`🧹 清理了 ${cleanedCount} 個文件中的 emoji`);
}

// 運行主函數
if (require.main === module) {
    main();
}

module.exports = { removeEmojis, processFile };
