const { createCanvas, loadImage } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

/**
 * 從影片提取第一幀
 */
async function extractFirstFrame(videoPath) {
  const framePath = videoPath.replace('.mp4', '_frame.png');
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:00.100'],
        filename: path.basename(framePath),
        folder: path.dirname(framePath),
        size: '480x832'
      })
      .on('end', () => resolve(framePath))
      .on('error', reject);
  });
}

/**
 * 分析圖片找出最常見的顏色
 */
async function analyzeFrame(framePath) {
  try {
    const image = await loadImage(framePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const data = imageData.data;
    
    // 取樣以加快速度
    const colorCount = new Map();
    const stride = 8;
    
    for (let i = 0; i < data.length; i += 4 * stride) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 將相近的顏色歸類（減少精度以聚合相似顏色）
      const rBucket = Math.floor(r / 32) * 32;
      const gBucket = Math.floor(g / 32) * 32;
      const bBucket = Math.floor(b / 32) * 32;
      
      const key = `${rBucket},${gBucket},${bBucket}`;
      colorCount.set(key, (colorCount.get(key) || 0) + 1);
    }
    
    // 找出最常見的顏色
    let dominantColor = '0,0,0';
    let maxCount = 0;
    
    for (const [key, count] of colorCount.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = key;
      }
    }
    
    const [r, g, b] = dominantColor.split(',').map(v => parseInt(v, 10));
    return rgbToHex(r, g, b);
  } catch (error) {
    console.warn('  ⚠️ 顏色偵測失敗，使用預設黑色:', error.message);
    return '0x000000';
  }
}

/**
 * RGB 轉 16 進位
 */
function rgbToHex(r, g, b) {
  const hex = [r, g, b]
    .map(v => {
      const clamped = Math.min(255, Math.max(0, v));
      return clamped.toString(16).padStart(2, '0');
    })
    .join('');
  
  return '0x' + hex;
}

/**
 * 偵測影片的主要背景色
 */
async function detectDominantColor(videoPath) {
  let framePath;
  
  try {
    console.log(`  🎨 分析背景色: ${path.basename(videoPath)}`);
    
    // 提取第一幀
    framePath = await extractFirstFrame(videoPath);
    
    // 分析顏色
    const color = await analyzeFrame(framePath);
    
    console.log(`  ✅ 偵測到顏色: ${color}`);
    
    return color;
  } catch (error) {
    console.warn(`  ⚠️ 背景色偵測失敗: ${error.message}`);
    return '0x000000'; // 預設黑色
  } finally {
    // 清理幀檔案
    if (framePath) {
      try {
        await fs.unlink(framePath);
      } catch (e) {
        // 忽略清理錯誤
      }
    }
  }
}

module.exports = {
  detectDominantColor
};
