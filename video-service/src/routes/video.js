const express = require('express');
const path = require('path');
const ffmpegService = require('../services/ffmpeg');

const router = express.Router();

/**
 * POST /api/videos/merge
 * 合併 4 個影片並去背
 */
router.post('/merge', async (req, res) => {
  try {
    const { videoUrls, outputFormat = 'webm', removeBackground = true } = req.body;
    
    // 驗證輸入
    if (!Array.isArray(videoUrls) || videoUrls.length !== 4) {
      return res.status(400).json({
        status: 'error',
        message: '必須提供恰好 4 個影片 URL'
      });
    }
    
    console.log('📥 收到合併請求:', { videoUrls: videoUrls.length, outputFormat, removeBackground });
    
    const result = await ffmpegService.mergeVideos(videoUrls, outputFormat, removeBackground);
    
    console.log('✅ 合併完成:', result.filename);
    
    res.json({
      status: 'success',
      outputUrl: `/api/videos/download/${result.filename}`,
      duration: result.duration,
      fileSize: result.fileSize
    });
  } catch (error) {
    console.error('❌ 合併失敗:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/videos/download/:filename
 * 下載合併後的影片
 */
router.get('/download/:filename', (req, res) => {
  try {
    const filepath = path.join(__dirname, '../../output', req.params.filename);
    console.log('📤 下載影片:', req.params.filename);
    res.download(filepath, (err) => {
      if (err) {
        console.error('下載失敗:', err);
        if (!res.headersSent) {
          res.status(404).json({ status: 'error', message: '檔案不存在' });
        }
      }
    });
  } catch (error) {
    console.error('下載錯誤:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * DELETE /api/videos/cleanup/:filename
 * 清理已下載的影片
 */
router.delete('/cleanup/:filename', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const filepath = path.join(__dirname, '../../output', req.params.filename);
    await fs.unlink(filepath);
    console.log('🗑️ 已清理:', req.params.filename);
    res.json({ status: 'success', message: '檔案已刪除' });
  } catch (error) {
    console.error('清理失敗:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
