import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// 文章同步到後端的 batch API
const BATCH_API_URL = import.meta.env.ARTICLES_BATCH_API_URL || 'http://localhost:8000/maya-sawa/paprika/articles/batch';

interface ArticlePayload {
  file_path: string;
  content: string;
  file_date: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // 從 request 取得可選的配置
    const body = await request.json().catch(() => ({}));
    const targetUrl = body.targetUrl || BATCH_API_URL;

    console.log('🔄 開始同步文章到後端...');

    // 取得所有 work collection 的文章
    const articles = await getCollection('work');
    
    console.log(`📚 找到 ${articles.length} 篇文章`);

    // 轉換成 batch API 需要的格式
    const articlesPayload: ArticlePayload[] = articles.map((article) => ({
      file_path: `${article.slug}.md`,
      content: article.body,
      file_date: article.data.publishDate instanceof Date 
        ? article.data.publishDate.toISOString()
        : new Date(article.data.publishDate).toISOString(),
      title: article.data.title,
      description: article.data.description,
      tags: article.data.tags || [],
    }));

    console.log(`📤 正在發送 ${articlesPayload.length} 篇文章到 ${targetUrl}`);

    // 發送到 batch API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(articlesPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Batch API 回應錯誤: ${response.status} - ${errorText}`);
    }

    const result = await response.json().catch(() => response.text());
    console.log('✅ 文章同步成功:', result);

    return new Response(JSON.stringify({
      success: true,
      message: '文章同步成功',
      articleCount: articlesPayload.length,
      result: result,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ 文章同步失敗:', error);

    return new Response(JSON.stringify({
      success: false,
      message: `文章同步失敗: ${error instanceof Error ? error.message : String(error)}`,
      error: String(error),
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// GET 方法用於預覽要同步的文章（不實際發送）
export const GET: APIRoute = async () => {
  try {
    const articles = await getCollection('work');

    const preview = articles.map((article) => ({
      file_path: `${article.slug}.md`,
      title: article.data.title,
      file_date: article.data.publishDate instanceof Date 
        ? article.data.publishDate.toISOString()
        : new Date(article.data.publishDate).toISOString(),
      tags: article.data.tags || [],
      content_length: article.body.length,
    }));

    return new Response(JSON.stringify({
      success: true,
      articleCount: preview.length,
      articles: preview,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: `預覽失敗: ${error instanceof Error ? error.message : String(error)}`,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
