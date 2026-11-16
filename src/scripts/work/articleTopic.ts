const topicSignals = [
  ['系統架構', /^(系統架構|(?:system |software )?architecture|microservices?|distributed systems?|event.driven architecture)$/i],
  ['部署與維運', /^(部署與維運|deployment|devops|ci[/-]cd|docker|kubernetes|k8s|openshift|jenkins|terraform|ansible|linux|oci|infrastructure|monitoring|observability|nginx)$/i],
  ['AI 與資料科學', /^(AI 與資料科學|ai|llms?|rag|machine learning|deep learning|data (science|engineering|analysis|visualization)|artificial intelligence|langchain|pandas|clustering)$/i],
  ['資安與身分驗證', /^(資安與身分驗證|security|authentication|authorization|oauth2?|jwt|keycloak|spring security|sso)$/i],
  ['資料庫與快取', /^(資料庫與快取|databases?|sql|postgresql|mysql|redis|mongodb|caching)$/i],
  ['前端開發', /^(前端開發|front.end(?: development)?|react(?:\.js)?|angular(?:js)?|vue(?:\.js)?|astro|svelte|javascript|typescript|css|html|ssr|flutter)$/i],
  ['後端開發', /^(後端開發|back.end(?: development)?|java|spring(?: boot)?|fastapi|api|rest|rabbitmq|kafka|concurrency|java ee|jboss|node\.js)$/i],
  ['測試與品質', /^(測試與品質|testing|tdd|junit|vitest|playwright|quality assurance)$/i],
] as const;

export function articleTopic({ category, tags }: { category?: string; tags: readonly string[] }): string {
  const primary = category?.trim() ?? '';
  const explicit = topicSignals.find(([, signal]) => signal.test(primary));
  if (explicit) return explicit[0];

  const inferred = topicSignals.find(([, signal]) => tags.some((tag) => signal.test(tag.trim())));
  return inferred?.[0] ?? '軟體工程';
}
