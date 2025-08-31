const fs = require('fs');
const path = require('path');

// 讀取所有 MD 文件並修改 publishDate
const workDir = './src/content/work';

fs.readdirSync(workDir).forEach(file => {
  if (file.endsWith('.md')) {
    const filePath = path.join(workDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // 替換 publishDate: 2024-03-04 17:00:00 為 publishDate: "2024-03-04 17:00:00"
    const updatedContent = content.replace(
      /publishDate: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/g,
      'publishDate: "$1"'
    );

    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('All publishDate fields have been updated to string format.');
