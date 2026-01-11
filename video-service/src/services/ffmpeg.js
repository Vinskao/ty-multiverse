const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const downloadService = require('./download');
const colorService = require('../utils/color');

/**
 * 合併 4 個影片並去背
 */
async function mergeVideos(videoUrls, outputFormat, removeBackground) {
  const sessionId = Date.now().toString();
  const tempDir = path.join(__dirname, '../../temp', sessionId);
  const outputDir = path.join(__dirname, '../../output');
  
  try {
    // 建立目錄
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    
    console.log(`🎬 開始處理 Session: ${sessionId}`);
    
    // 1. 下載影片
    const files = await downloadService.downloadAll(videoUrls, tempDir);
    
    // 2. 偵測背景色
    let colors = ['0x000000', '0x000000', '0x000000', '0x000000'];
    
    if (removeBackground) {
      console.log('🎨 開始分析背景色...');
      colors = await Promise.all(
        files.map(file => colorService.detectDominantColor(file))
      );
      console.log('✅ 背景色分析完成:', colors);
    }
    
    // 3. 建立 FFmpeg filter
    const filterParts = files.map((file, idx) => {
      const color = colors[idx];
      return `[${idx}:v]scale=480:832:force_original_aspect_ratio=decrease,pad=480:832:(ow-iw)/2:(oh-ih)/2:color=0x00000000,chromakey=${color}:0.15:0,setsar=1[v${idx}]`;
    });
    
    const stackFilter = `[v0][v1][v2][v3]hstack=inputs=4[stacked];[stacked]pad=1920:1080:0:124:color=0x00000000[outv]`;
    const fullFilter = `${filterParts.join(';')};${stackFilter}`;
    
    // 4. 執行 FFmpeg
    const outputFilename = `${sessionId}.${outputFormat}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    console.log('⚙️ 開始 FFmpeg 處理...');
    
    await new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      // 加入所有輸入檔案
      files.forEach(file => command.input(file));
      
      command
        .complexFilter(fullFilter, ['outv'])
        .outputOptions([
          '-c:v libvpx-vp9',
          '-pix_fmt yuva420p',
          '-b:v 2M',
          '-preset fast'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('  🎬 FFmpeg 指令:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`  ⏳ 處理進度: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('  ✅ FFmpeg 處理完成');
          resolve();
        })
        .on('error', (err) => {
          console.error('  ❌ FFmpeg 錯誤:', err.message);
          reject(err);
        })
        .run();
    });
    
    // 5. 取得檔案資訊
    const stats = await fs.stat(outputPath);
    
    console.log(`✅ 影片合併完成: ${outputFilename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    return {
      filename: outputFilename,
      duration: 0, // TODO: 可用 ffprobe 取得實際長度
      fileSize: stats.size
    };
    
  } finally {
    // 清理暫存目錄
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`🗑️ 已清理暫存目錄: ${sessionId}`);
    } catch (error) {
      console.warn('清理暫存目錄失敗:', error.message);
    }
  }
}

module.exports = {
  mergeVideos
};
