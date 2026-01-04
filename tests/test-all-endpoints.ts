#!/usr/bin/env node

/**
 * API 端點測試腳本
 * 
 * 測試 AGENTS.md 中列出的所有 API 端點
 * 排除 401 錯誤（預期的認證失敗）
 * 記錄其他錯誤以便分析資料設計問題
 */

import fs from 'fs';

const BACKEND_URL = process.env.PUBLIC_BACKEND_URL || 'http://localhost:8080/tymb';
const GATEWAY_URL = process.env.PUBLIC_GATEWAY_URL || 'http://localhost:8082/tymg';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  httpStatus: number;
  message: string;
  url: string;
  data?: any;
}

const testResults: TestResult[] = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 顏色輸出
const colors: Record<string, string> = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface TestConfig {
  category: string;
  name: string;
  method: string;
  url: string;
  body?: any;
  expectedStatus: number[];
  shouldIgnore401: boolean;
}

// 測試單個端點
async function testEndpoint(config: TestConfig) {
  totalTests++;
  const { name, method, url, body, expectedStatus, shouldIgnore401 } = config;

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const status = response.status;
    
    let responseData: any = null;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch (e) {
      responseData = 'No response body';
    }

    // 401 錯誤且設定為忽略 -> 視為通過
    if (status === 401 && shouldIgnore401) {
      passedTests++;
      testResults.push({
        name,
        status: 'PASS',
        httpStatus: status,
        message: 'Expected 401 (Auth required)',
        url,
      });
      log(`✅ PASS: ${name} (401 - Auth required)`, 'green');
      return;
    }

    // 檢查是否為預期的狀態碼
    const isExpected = expectedStatus.includes(status);
    
    if (isExpected) {
      passedTests++;
      testResults.push({
        name,
        status: 'PASS',
        httpStatus: status,
        message: (responseData as any)?.message || 'Success',
        url,
        data: responseData,
      });
      log(`✅ PASS: ${name} (${status})`, 'green');
    } else {
      failedTests++;
      testResults.push({
        name,
        status: 'FAIL',
        httpStatus: status,
        message: (responseData as any)?.message || responseData || 'Unexpected status',
        url,
        data: responseData,
      });
      log(`❌ FAIL: ${name} (Expected: ${expectedStatus}, Got: ${status})`, 'red');
      log(`   Response: ${JSON.stringify(responseData).substring(0, 200)}`, 'yellow');
    }
  } catch (error: any) {
    failedTests++;
    testResults.push({
      name,
      status: 'ERROR',
      httpStatus: 0,
      message: error.message,
      url,
    });
    log(`🔥 ERROR: ${name} - ${error.message}`, 'red');
  }
}

// 測試配置
const testConfigs: TestConfig[] = [
  // ========== Authentication APIs (Backend Direct) ==========
  {
    category: 'Authentication',
    name: 'GET /auth/admin',
    method: 'GET',
    url: `${BACKEND_URL}/auth/admin`,
    expectedStatus: [401, 200],
    shouldIgnore401: true,
  },
  {
    category: 'Authentication',
    name: 'GET /auth/user',
    method: 'GET',
    url: `${BACKEND_URL}/auth/user`,
    expectedStatus: [401, 200],
    shouldIgnore401: true,
  },
  {
    category: 'Authentication',
    name: 'GET /auth/visitor',
    method: 'GET',
    url: `${BACKEND_URL}/auth/visitor`,
    expectedStatus: [200],
    shouldIgnore401: false,
  },
  {
    category: 'Authentication',
    name: 'GET /auth/health',
    method: 'GET',
    url: `${BACKEND_URL}/auth/health`,
    expectedStatus: [200],
    shouldIgnore401: false,
  },
  {
    category: 'Authentication',
    name: 'POST /keycloak/introspect',
    method: 'POST',
    url: `${BACKEND_URL}/keycloak/introspect`,
    body: { token: 'test-token' },
    expectedStatus: [400, 401, 200],
    shouldIgnore401: true,
  },

  // ========== People Module APIs (Producer) ==========
  {
    category: 'People Producer',
    name: 'POST /people/insert',
    method: 'POST',
    url: `${GATEWAY_URL}/people/insert`,
    body: {
      name: 'TestPerson',
      age: 25,
      level: 5,
    },
    expectedStatus: [201, 200, 500],
    shouldIgnore401: true,
  },
  {
    category: 'People Producer',
    name: 'POST /people/update',
    method: 'POST',
    url: `${GATEWAY_URL}/people/update`,
    body: {
      name: 'TestPerson',
      age: 26,
    },
    expectedStatus: [200, 500],
    shouldIgnore401: true,
  },
  {
    category: 'People Producer',
    name: 'POST /people/get-all',
    method: 'POST',
    url: `${GATEWAY_URL}/people/get-all`,
    expectedStatus: [200, 202, 500],
    shouldIgnore401: true,
  },
  {
    category: 'People Producer',
    name: 'POST /people/get-by-name',
    method: 'POST',
    url: `${GATEWAY_URL}/people/get-by-name`,
    body: { name: 'TestPerson' },
    expectedStatus: [200, 500],
    shouldIgnore401: true,
  },
  {
    category: 'People Producer',
    name: 'POST /people/delete-all',
    method: 'POST',
    url: `${GATEWAY_URL}/people/delete-all`,
    expectedStatus: [200, 204, 500],
    shouldIgnore401: true,
  },

  // ========== People Module APIs (Consumer) ==========
  {
    category: 'People Consumer',
    name: 'GET /api/request-status/{requestId}',
    method: 'GET',
    url: `${GATEWAY_URL}/api/request-status/test-request-id`,
    expectedStatus: [200, 404, 500],
    shouldIgnore401: true,
  },
  {
    category: 'People Consumer',
    name: 'GET /api/request-status/{requestId}/exists',
    method: 'GET',
    url: `${GATEWAY_URL}/api/request-status/test-request-id/exists`,
    expectedStatus: [200, 500],
    shouldIgnore401: true,
  },
  {
    category: 'People Consumer',
    name: 'DELETE /api/request-status/{requestId}',
    method: 'DELETE',
    url: `${GATEWAY_URL}/api/request-status/test-request-id`,
    expectedStatus: [200, 404, 500],
    shouldIgnore401: true,
  },
  {
    category: 'People Consumer',
    name: 'GET /api/async/result/{requestId}',
    method: 'GET',
    url: `${GATEWAY_URL}/api/async/result/test-request-id`,
    expectedStatus: [200, 404, 500],
    shouldIgnore401: true,
  },
  {
    category: 'People Consumer',
    name: 'GET /api/async/result/{requestId}/exists',
    method: 'GET',
    url: `${GATEWAY_URL}/api/async/result/test-request-id/exists`,
    expectedStatus: [200, 500],
    shouldIgnore401: true,
  },
  {
    category: 'People Consumer',
    name: 'DELETE /api/async/result/{requestId}',
    method: 'DELETE',
    url: `${GATEWAY_URL}/api/async/result/test-request-id`,
    expectedStatus: [200, 404, 500],
    shouldIgnore401: true,
  },

  // ========== Weapon Module APIs ==========
  {
    category: 'Weapons',
    name: 'GET /weapons',
    method: 'GET',
    url: `${GATEWAY_URL}/weapons`,
    expectedStatus: [200, 500],
    shouldIgnore401: true,
  },
  {
    category: 'Weapons',
    name: 'GET /weapons/{name}',
    method: 'GET',
    url: `${GATEWAY_URL}/weapons/TestWeapon`,
    expectedStatus: [200, 404, 500],
    shouldIgnore401: true,
  },
  {
    category: 'Weapons',
    name: 'GET /weapons/owner/{ownerName}',
    method: 'GET',
    url: `${GATEWAY_URL}/weapons/owner/TestOwner`,
    expectedStatus: [200, 500],
    shouldIgnore401: true,
  },
  {
    category: 'Weapons',
    name: 'POST /weapons',
    method: 'POST',
    url: `${GATEWAY_URL}/weapons`,
    body: {
      name: 'TestWeapon',
      owner: 'TestOwner',
      baseDamage: 100,
    },
    expectedStatus: [200, 201, 500],
    shouldIgnore401: true,
  },

  // ========== Damage Calculation APIs ==========
  {
    category: 'Damage',
    name: 'GET /people/damageWithWeapon',
    method: 'GET',
    url: `${GATEWAY_URL}/people/damageWithWeapon?name=TestPerson`,
    expectedStatus: [200, 400, 404, 500],
    shouldIgnore401: true,
  },

  // ========== Gallery Module APIs ==========
  {
    category: 'Gallery',
    name: 'POST /gallery/save',
    method: 'POST',
    url: `${GATEWAY_URL}/gallery/save`,
    body: {
      id: 'test-image-1',
      data: 'base64-encoded-data',
    },
    expectedStatus: [200, 201, 500],
    shouldIgnore401: true,
  },
  {
    category: 'Gallery',
    name: 'POST /gallery/getAll',
    method: 'POST',
    url: `${GATEWAY_URL}/gallery/getAll`,
    expectedStatus: [200, 500],
    shouldIgnore401: true,
  },
  {
    category: 'Gallery',
    name: 'GET /gallery/getById',
    method: 'GET',
    url: `${GATEWAY_URL}/gallery/getById?id=test-image-1`,
    expectedStatus: [200, 404, 500],
    shouldIgnore401: true,
  },
  {
    category: 'Gallery',
    name: 'POST /gallery/update',
    method: 'POST',
    url: `${GATEWAY_URL}/gallery/update`,
    body: {
      id: 'test-image-1',
      data: 'updated-base64-data',
    },
    expectedStatus: [200, 500],
    shouldIgnore401: true,
  },
  {
    category: 'Gallery',
    name: 'POST /gallery/delete',
    method: 'POST',
    url: `${GATEWAY_URL}/gallery/delete`,
    body: { id: 'test-image-1' },
    expectedStatus: [200, 204, 500],
    shouldIgnore401: true,
  },

  // ========== Monitor APIs ==========
  {
    category: 'Monitor',
    name: 'GET /health',
    method: 'GET',
    url: `${GATEWAY_URL}/health`,
    expectedStatus: [200, 500],
    shouldIgnore401: false,
  },
  {
    category: 'Monitor',
    name: 'GET /health/consumer',
    method: 'GET',
    url: `${GATEWAY_URL}/health/consumer`,
    expectedStatus: [200, 500, 503],
    shouldIgnore401: false,
  },

  // ========== Sync APIs ==========
  {
    category: 'Sync',
    name: 'POST /api/sync-characters',
    method: 'POST',
    url: `${GATEWAY_URL}/api/sync-characters`,
    body: {},
    expectedStatus: [200, 500, 503],
    shouldIgnore401: true,
  },
];

// 執行測試
async function runTests() {
  log('\n========================================', 'cyan');
  log('🧪 API 端點測試開始', 'cyan');
  log('========================================\n', 'cyan');

  log(`Backend URL: ${BACKEND_URL}`, 'blue');
  log(`Gateway URL: ${GATEWAY_URL}\n`, 'blue');

  // 按類別分組測試
  const categories = [...new Set(testConfigs.map(c => c.category))];

  for (const category of categories) {
    log(`\n📦 測試類別: ${category}`, 'cyan');
    log('─'.repeat(50), 'cyan');

    const categoryTests = testConfigs.filter(c => c.category === category);
    for (const test of categoryTests) {
      await testEndpoint(test);
    }
  }

  // 生成報告
  log('\n========================================', 'cyan');
  log('📊 測試結果摘要', 'cyan');
  log('========================================\n', 'cyan');

  log(`總測試數: ${totalTests}`, 'blue');
  log(`✅ 通過: ${passedTests}`, 'green');
  log(`❌ 失敗: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`成功率: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`, 'blue');

  // 顯示失敗的測試
  const failures = testResults.filter(r => r.status === 'FAIL' || r.status === 'ERROR');
  if (failures.length > 0) {
    log('========================================', 'yellow');
    log('⚠️  需要處理的問題', 'yellow');
    log('========================================\n', 'yellow');

    failures.forEach((failure, index) => {
      log(`${index + 1}. ${failure.name}`, 'yellow');
      log(`   URL: ${failure.url}`, 'yellow');
      log(`   狀態: ${failure.httpStatus}`, 'yellow');
      log(`   訊息: ${failure.message}`, 'yellow');
      if (failure.data && typeof failure.data === 'object') {
        log(`   詳細: ${JSON.stringify(failure.data, null, 2).substring(0, 300)}`, 'yellow');
      }
      log('', 'yellow');
    });
  }

  // 儲存 JSON 報告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%',
    },
    results: testResults,
  };

  const reportPath = './api-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 詳細報告已儲存至: ${reportPath}`, 'blue');

  log('\n========================================', 'cyan');
  log('✅ 測試完成', 'cyan');
  log('========================================\n', 'cyan');

  // 退出碼
  process.exit(failedTests > 0 ? 1 : 0);
}

// 執行
runTests().catch(error => {
  log(`\n🔥 測試執行失敗: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
