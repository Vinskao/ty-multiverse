import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// 文章同步到後端的 batch API
const BATCH_API_URL =
  import.meta.env.ARTICLES_BATCH_API_URL ||
  'http://localhost:8000/maya-sawa/paprika/articles/batch';

// 文章轉向量 API
const VECTOR_API_URL =
  import.meta.env.ARTICLES_VECTOR_API_URL ||
  'http://localhost:8000/maya-sawa/paprika/articles/vectorize';

// 清理軟刪除文章的 API
const PURGE_API_URL =
  import.meta.env.ARTICLES_PURGE_API_URL ||
  'http://localhost:8000/maya-sawa/paprika/articles/purge-deleted';

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
    const targetVectorUrl = body.targetVectorUrl || VECTOR_API_URL;

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

    // 文章同步完成後，呼叫向量化端點
    console.log(`🧠 開始向量化 ${articlesPayload.length} 篇文章到 ${targetVectorUrl}`);
    const vectorResponse = await fetch(targetVectorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        articles: articlesPayload.map(({ file_path, content }) => ({
          file_path,
          content,
        })),
        overwrite: true,
      }),
    });

    if (!vectorResponse.ok) {
      const errorText = await vectorResponse.text();
      throw new Error(`Vectorize API 回應錯誤: ${vectorResponse.status} - ${errorText}`);
    }

    const vectorResult = await vectorResponse.json().catch(() => vectorResponse.text());
    console.log('✅ 文章向量化成功:', vectorResult);

    // 向量化完成後，執行軟刪除清理（硬刪除已標記的文章）
    console.log('🧹 開始清理已軟刪除的文章...');
    const purgeResponse = await fetch(PURGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!purgeResponse.ok) {
      const errorText = await purgeResponse.text();
      throw new Error(`Purge API 回應錯誤: ${purgeResponse.status} - ${errorText}`);
    }

    const purgeResult = await purgeResponse.json().catch(() => purgeResponse.text());
    console.log('✅ 軟刪除清理完成:', purgeResult);

    return new Response(JSON.stringify({
      success: true,
      message: '文章同步、向量化並清理完成',
      articleCount: articlesPayload.length,
      result: result,
      vectorizedCount: vectorResult?.data?.vectorized ?? 0,
      vectorResult,
      purgedCount: purgeResult?.deleted ?? 0,
      purgeResult,
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
