// Match the existing /qa/query fallback in either language across backend deployments.
export function isMayaBusyAnswer(answer: unknown): boolean {
  return answer === 'Maya 目前還沒上班，今天的額度暫時用完了。先去逛逛站上的文章與市場頁，晚點或明天再來找我聊，我會在的。'
    || answer === "Maya is not on shift yet: today's AI allowance has run out for now. Look around the articles and market pages, and come back a little later or tomorrow.";
}
