import type { APIRoute } from 'astro';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';

interface ArticleData {
  file_path: string;
  content: string;
  file_date: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}

interface ExistingArticle {
  id: number;
  file_path: string;
  content: string;
  file_date: string;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = 'https://peoplesystem.tatdvsonorth.com/paprika/articles/sync';

// 獲取所有markdown文件
async function getAllMarkdownFiles(): Promise<string[]> {
  const workDir = join(process.cwd(), 'src', 'content', 'work');
  const pattern = join(workDir, '**', '*.md');
  
  console.log('Debug: Current working directory:', process.cwd());
  console.log('Debug: Looking for files in:', workDir);
  console.log('Debug: Pattern:', pattern);
  
  try {
    const files = await glob(pattern, { windowsPathsNoEscape: true });
    console.log('Debug: Found files:', files.length);
    console.log('Debug: First few files:', files.slice(0, 3));
    return files;
  } catch (error) {
    console.error('Error finding markdown files:', error);
    return [];
  }
}

// 讀取文件內容
function readFileContent(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return '';
  }
}

// 獲取文件修改時間
function getFileDate(filePath: string): string {
  try {
    const stats = statSync(filePath);
    // 確保日期格式為 "YYYY-MM-DD HH:mm:ss"
    const date = stats.mtime;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error(`Error getting file date for ${filePath}:`, error);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00`;
  }
}

// 將絕對路徑轉換為相對路徑
function getRelativePath(filePath: string): string {
  const workDir = join(process.cwd(), 'src', 'content', 'work');
  const relativePath = filePath.replace(workDir, '').replace(/^[\\\/]/, '');
  return relativePath.replace(/\\/g, '/'); // 統一使用正斜線
}

// 獲取現有文章列表
async function getExistingArticles(): Promise<ExistingArticle[]> {
  try {
    const response = await fetch(API_BASE_URL);
    const result: ApiResponse = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching existing articles:', error);
    return [];
  }
}

// 創建或更新文章
async function createOrUpdateArticle(articleData: ArticleData): Promise<ApiResponse> {
  try {
    console.log('Debug: Sending data to external API:', JSON.stringify(articleData, null, 2));
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        articles: [articleData] // 包裝成陣列格式
      }),
    });
    
    const result = await response.json();
    console.log('Debug: External API response:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Error creating/updating article:', error);
    return { success: false, message: 'Failed to create/update article' };
  }
}

// 檢查文件是否有差異
function hasContentChanged(localContent: string, remoteContent: string): boolean {
  return localContent.trim() !== remoteContent.trim();
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { action = 'sync' } = await request.json();
    
    if (action === 'sync') {
      // 獲取所有本地markdown文件
      const markdownFiles = await getAllMarkdownFiles();
      
      // 獲取現有文章列表
      const existingArticles = await getExistingArticles();
      const existingArticlesMap = new Map(
        existingArticles.map(article => [article.file_path, article])
      );
      
      const results = {
        created: 0,
        updated: 0,
        unchanged: 0,
        errors: 0,
        details: [] as any[]
      };
      
      // 處理每個markdown文件
      for (const filePath of markdownFiles) {
        const relativePath = getRelativePath(filePath);
        const content = readFileContent(filePath);
        const fileDate = getFileDate(filePath);
        
        if (!content) {
          results.errors++;
          results.details.push({
            file_path: relativePath,
            status: 'error',
            message: 'Failed to read file content'
          });
          continue;
        }
        
        const articleData: ArticleData = {
          file_path: relativePath,
          content,
          file_date: fileDate
        };
        
        const existingArticle = existingArticlesMap.get(relativePath);
        
        if (!existingArticle) {
          // 新文件，創建
          const result = await createOrUpdateArticle(articleData);
          if (result.success) {
            results.created++;
            results.details.push({
              file_path: relativePath,
              status: 'created',
              message: 'Article created successfully'
            });
          } else {
            results.errors++;
            results.details.push({
              file_path: relativePath,
              status: 'error',
              message: result.message || 'Failed to create article'
            });
          }
        } else if (hasContentChanged(content, existingArticle.content)) {
          // 內容有變化，更新
          const result = await createOrUpdateArticle(articleData);
          if (result.success) {
            results.updated++;
            results.details.push({
              file_path: relativePath,
              status: 'updated',
              message: 'Article updated successfully'
            });
          } else {
            results.errors++;
            results.details.push({
              file_path: relativePath,
              status: 'error',
              message: result.message || 'Failed to update article'
            });
          }
        } else {
          // 內容無變化
          results.unchanged++;
          results.details.push({
            file_path: relativePath,
            status: 'unchanged',
            message: 'No changes detected'
          });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Sync completed',
        data: results
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Invalid action'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const GET: APIRoute = async () => {
  try {
    const markdownFiles = await getAllMarkdownFiles();
    const existingArticles = await getExistingArticles();
    
    const fileStatus = markdownFiles.map(filePath => {
      const relativePath = getRelativePath(filePath);
      const content = readFileContent(filePath);
      const fileDate = getFileDate(filePath);
      const existingArticle = existingArticles.find(article => article.file_path === relativePath);
      
      return {
        file_path: relativePath,
        local_content_length: content.length,
        local_file_date: fileDate,
        exists_remotely: !!existingArticle,
        remote_content_length: existingArticle?.content.length || 0,
        has_changes: existingArticle ? hasContentChanged(content, existingArticle.content) : true
      };
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        total_files: markdownFiles.length,
        existing_articles: existingArticles.length,
        file_status: fileStatus
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 