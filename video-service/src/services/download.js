const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * 下載單個影片
 */
async function downloadVideo(url, outputPath) {
  console.log(`  📥 下載: ${url}`);
  
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
    timeout: 60000 // 60 秒超時
  });
  
  const writer = require('fs').createWriteStream(outputPath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log(`  ✅ 下載完成: ${path.basename(outputPath)}`);
      resolve(outputPath);
    });
    writer.on('error', reject);
  });
}

/**
 * 並行下載所有影片
 */
async function downloadAll(videoUrls, tempDir) {
  console.log('📥 開始下載 4 個影片...');
  
  const downloads = videoUrls.map((url, index) => {
    const filename = `input${index}.mp4`;
    const outputPath = path.join(tempDir, filename);
    return downloadVideo(url, outputPath);
  });
  
  const files = await Promise.all(downloads);
  console.log('✅ 所有影片下載完成');
  
  return files;
}

module.exports = {
  downloadVideo,
  downloadAll
};
