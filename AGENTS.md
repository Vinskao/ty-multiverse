# TY Multiverse Frontend - Agent Guide

## Project Overview

TY Multiverse Frontend is a modern web application built with Astro framework, providing a rich user interface for the TY Multiverse system. It features dynamic content management, interactive components, and seamless integration with the backend services.

### Architecture
- **Framework**: Astro 4.x with React components
- **Language**: TypeScript/JavaScript
- **Styling**: CSS with responsive design
- **Build Tool**: Vite (via Astro)
- **Deployment**: Static generation with SSR support

### Key Features
- **People Management**: Interactive character management interface
- **Weapons System**: Damage calculation and weapon management
- **Gallery System**: Image and content gallery with CKEditor integration
- **Blackjack Game**: Interactive card game implementation
- **Responsive Design**: Mobile-first responsive layout
- **Real-time Updates**: Live data synchronization

## Build and Test Commands

### Prerequisites
```bash
# Node.js 20+ required
node --version

# Install dependencies
npm install

# Verify Astro installation
npx astro --version
```

### Development Commands
```bash
# Start development server
npm run dev

# Start with specific host/port
npm run dev -- --host 0.0.0.0 --port 4321

# Preview production build
npm run preview

# Build for production
npm run build

# Check build output
npm run astro check
```

### Testing Commands
```bash
# Run tests (if implemented)
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run src/components/Component.test.ts

# Check TypeScript types
npx astro check
```

### Build Optimization
```bash
# Build with detailed analysis
npm run build -- --verbose

# Check bundle sizes
npx vite-bundle-analyzer dist/

# Preview build output
npm run preview
```

## Code Style Guidelines

### TypeScript/JavaScript Style
- **Language**: TypeScript with strict mode enabled
- **Formatting**: Prettier configuration with 2-space indentation
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Line Length**: Max 100 characters
- **Semicolons**: Required for consistency

### Astro Component Conventions
```astro
<!-- ✅ Good: Proper Astro component structure -->
---
interface Props {
  title: string;
  description?: string;
}

const { title, description = "Default description" } = Astro.props;
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{title}</title>
    <meta name="description" content={description} />
  </head>
  <body>
    <h1>{title}</h1>
    <slot />
  </body>
</html>

<!-- ❌ Avoid: Poor structure and missing types -->
<html><head><title>title</title></head><body><h1>title</h1></body></html>
```

### React Component Patterns
```tsx
// ✅ Good: Proper React component with TypeScript
interface CardProps {
  id: string;
  name: string;
  onClick?: (id: string) => void;
}

export function Card({ id, name, onClick }: CardProps) {
  return (
    <div className="card" onClick={() => onClick?.(id)}>
      <h3>{name}</h3>
    </div>
  );
}

// ❌ Avoid: Missing types and poor structure
export function Card(props) {
  return <div><h3>{props.name}</h3></div>;
}
```

## Testing Instructions

### Component Testing
- **Framework**: Vitest with React Testing Library
- **Setup**: Test components in isolation with proper mocking
- **Coverage**: Aim for > 80% component coverage
- **Async Testing**: Use proper async/await patterns

### API Integration Testing
- **Mocking**: Mock API calls using MSW or similar
- **Error Handling**: Test error states and loading states
- **User Interactions**: Test user interaction flows

### Test Examples
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';

test('renders card with name', () => {
  render(<Card id="1" name="Test Card" />);

  expect(screen.getByText('Test Card')).toBeInTheDocument();
});

test('calls onClick when clicked', () => {
  const mockOnClick = vi.fn();
  render(<Card id="1" name="Test Card" onClick={mockOnClick} />);

  fireEvent.click(screen.getByText('Test Card'));
  expect(mockOnClick).toHaveBeenCalledWith('1');
});
```

## Security Considerations

### Frontend Security
- **Content Security Policy**: Implement CSP headers
- **XSS Protection**: Sanitize user inputs and outputs
- **CSRF Protection**: Implement anti-CSRF tokens for state-changing operations
- **Input Validation**: Validate all form inputs on both client and server

### Authentication Security
- **Token Storage**: Secure token storage (httpOnly cookies vs localStorage)
- **Token Refresh**: Implement proper token refresh mechanisms
- **Session Management**: Handle session timeout and logout properly
- **Route Protection**: Implement proper route guards

### Data Protection
- **HTTPS Only**: Enforce HTTPS for all communications
- **Secure Headers**: Implement security headers (HSTS, CSP, etc.)
- **Error Handling**: Avoid exposing sensitive information in error messages

## Additional Instructions

### Commit Message Guidelines
```bash
# Format: <type>(<scope>): <description>

feat(people): add new character creation form
fix(weapons): resolve damage calculation bug
docs(readme): update component documentation
test(cards): add tests for blackjack game logic
refactor(layout): improve responsive design
style(css): fix mobile layout issues
```

### Pull Request Process
1. **Branch Strategy**: Use `feature/`, `fix/`, `refactor/` prefixes
2. **Code Review**: Require at least one approval
3. **Testing**: Ensure tests pass and add new tests for features
4. **Browser Testing**: Test across different browsers and devices
5. **Accessibility**: Ensure WCAG compliance

### Deployment Steps

#### Development Deployment
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Access at http://localhost:4321
```

#### Production Deployment
```bash
# 1. Build optimized version
npm run build

# 2. Preview production build
npm run preview

# 3. Deploy dist/ folder to static hosting
```

### Performance Optimization
- **Image Optimization**: Use proper image formats and lazy loading
- **Code Splitting**: Implement route-based code splitting
- **Caching**: Configure proper caching headers
- **Bundle Analysis**: Regular bundle size monitoring

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Support**: iOS Safari, Chrome Mobile
- **Progressive Enhancement**: Ensure core functionality works without JavaScript

### Accessibility Guidelines
- **WCAG 2.1 AA**: Follow Web Content Accessibility Guidelines
- **Semantic HTML**: Use proper HTML5 semantic elements
- **ARIA Labels**: Provide appropriate ARIA labels and roles
- **Keyboard Navigation**: Ensure full keyboard accessibility
- **Screen Reader Support**: Test with screen readers

### Environment Variables
```bash
# API Configuration
PUBLIC_TYMB_URL=http://localhost:8080
PUBLIC_GATEWAY_URL=http://localhost:8082/tymg
PUBLIC_SSO_URL=https://your-keycloak.com

# Feature Flags
PUBLIC_ENABLE_DEBUG=true
PUBLIC_ENABLE_ANALYTICS=false

# Asset URLs
PUBLIC_PEOPLE_IMAGE_URL=https://cdn.example.com/images
PUBLIC_GALLERY_URL=https://cdn.example.com/gallery
```

### Development Workflow
1. **Component Development**: Create components in isolation
2. **Integration**: Integrate with services and APIs
3. **Testing**: Write tests alongside development
4. **Review**: Code review and testing
5. **Deployment**: Build and deploy to staging/production

### Troubleshooting
- **Build Issues**: Clear node_modules and reinstall if dependency issues
- **Runtime Errors**: Check browser console for detailed error messages
- **API Issues**: Verify API endpoints and authentication
- **Styling Issues**: Check CSS specificity and responsive breakpoints

### IDE Setup
```bash
# VS Code extensions recommended
# - Astro
# - TypeScript Importer
# - Prettier
# - ESLint

# Settings
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

## API Reference

### API Architecture Overview

**架构已更新为：纯 Spring Cloud Gateway REST 模式**

All APIs are centrally managed in `src/services/` directory. The frontend communicates with backend services through Spring Cloud Gateway:

```
Frontend
    ↓
Services Layer (src/services/)
    ↓
Spring Cloud Gateway (Port 8082)
    ↓ (HTTP Routes with /tymg prefix)
Backend REST Controllers (Port 8080)
    ↓ (Service Layer)
Database
```

**关键变更：**
- ❌ **移除所有gRPC** - 简化架构，移除复杂性
- ✅ **纯REST API** - 所有业务模块都通过REST Controllers
- ✅ **Spring Cloud Gateway** - WebFlux路由转发，无业务逻辑
- ✅ **统一路径** - 前端请求 `/tymg/**` 自动转发到 `/tymb/**`

### Configuration

**Environment Variables:**
- `PUBLIC_TYMB_URL` - Backend service URL (e.g., http://localhost:8080) - 备用
- `PUBLIC_TYMG_URL` - Gateway service URL (e.g., http://localhost:8082/tymg) - 主要
- `PUBLIC_PEOPLE_IMAGE_URL` - Image CDN URL

**Base URL Priority:**
1. `PUBLIC_TYMG_URL` (Gateway - **主要路由**, WebFlux无context-path)
2. `PUBLIC_TYMB_URL` (Backend - **备用**, 直接访问)

**Context Path Configuration:**
- **Gateway**: 无context-path（WebFlux不支持），通过路由重写实现
- **Backend**: `server.servlet.context-path: /tymb`
- **Frontend**: 自动添加 `/tymg` 前缀到所有API请求

### Authentication APIs

**Service File:** `auth.ts`  
**Target:** Backend (TYMB) - Direct (NO Gateway)  
**Authentication:** Bearer Token

| Frontend Endpoint | Method | Description | Full URL | Backend Endpoint | Auth Required | Tested | Status Code | Test Result | Curl Command |
|-------------------|--------|-------------|----------|------------------|---------------|--------|-------------|-------------|--------------|
| `/auth/admin` | GET | Test admin endpoint | `http://localhost:8080/tymb/auth/admin` | `/auth/admin` | ✅ | ✅ | **200** | ✅ OK - Returns admin info (anonymousUser with ROLE_ANONYMOUS) | `curl -X GET http://localhost:8080/tymb/auth/admin` |
| `/auth/user` | GET | Test user endpoint | `http://localhost:8080/tymb/auth/user` | `/auth/user` | ✅ | ✅ | **200** | ✅ OK - Returns user info (anonymousUser authenticated) | `curl -X GET http://localhost:8080/tymb/auth/user` |
| `/auth/visitor` | GET | Test visitor endpoint | `http://localhost:8080/tymb/auth/visitor` | `/auth/visitor` | ❌ | ✅ | 200 | ✅ OK - Public endpoint accessible | `curl -X GET http://localhost:8080/tymb/auth/visitor` |
| `/auth/test` | POST | Auth integration test | `http://localhost:8080/tymb/auth/test` | `/auth/test` | ✅ | ✅ | **200** | ✅ OK - Returns test result (UNAUTHORIZED status but 200 response) | `curl -X POST http://localhost:8080/tymb/auth/test` |
| `/auth/logout-test` | POST | Logout test | `http://localhost:8080/tymb/auth/logout-test` | `/auth/logout-test` | ✅ | ✅ | **400** | ⚠️ Bad Request - Requires 'refreshToken' parameter | `curl -X POST http://localhost:8080/tymb/auth/logout-test` |
| `/auth/health` | GET | Health check | `http://localhost:8080/tymb/auth/health` | `/auth/health` | ❌ | ✅ | 200 | ✅ OK - Health check passed | `curl -X GET http://localhost:8080/tymb/auth/health` |
| `/keycloak/introspect` | POST | Token validation & refresh | `http://localhost:8080/tymb/keycloak/introspect` | `/keycloak/introspect` | ❌ | ✅ | 400 | ⚠️ Bad Request - Requires 'token' parameter (not JSON body) | `curl -X POST http://localhost:8080/tymb/keycloak/introspect -H "Content-Type: application/json" -d '{"token":"invalid"}'` |

**Request Flow:**
```
Frontend → Backend (/tymb/auth/*, /tymb/keycloak/*) - DIRECT (bypasses Gateway)
```

**Key Features:**
- Auto token refresh every 5 minutes
- Token storage in localStorage
- Cooldown: 7 seconds between verifications
- Uses `config.api.backendUrl` for direct connection

### People Module APIs

**Service File:** `peopleService.ts`
**Target:** Gateway (TYMG) → Backend REST Controllers → Consumer (異步)
**Pattern:** Asynchronous REST API (通過 RabbitMQ)

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Backend Controller | Consumer | Auth | Tested | Status Code | Test Result | Curl Command |
|-------------------|--------|-------------|----------|---------------|-------------------|----------|------|--------|-------------|-------------|--------------|
| `/people/get-all` | POST | Get all people (async) | `http://localhost:8082/tymg/people/get-all` | `/tymg/people/get-all` → `/tymb/people/get-all` | `PeopleController.getAllPeople()` | ✅ `PeopleConsumer.handleGetAllPeople()` | ❌ | ✅ | **404** | ⚠️ **Gateway Route Not Found** - Gateway routing issue | `curl -X POST http://localhost:8082/tymg/people/get-all -H "Content-Type: application/json"`<br/>`# ⚠️ Gateway 路由配置問題：返回 404` |
| `/people/insert` | POST | Insert single person (async if RabbitMQ enabled) | `http://localhost:8082/tymg/people/insert` | `/tymg/people/insert` → `/tymb/people/insert` | `PeopleController.insertPeople()` | ✅ `PeopleConsumer.handleInsertPerson()` (if async) | ❌ | ✅ | **404** | ⚠️ **Gateway Route Not Found** - Gateway routing issue | `curl -X POST http://localhost:8082/tymg/people/insert -H "Content-Type: application/json" -d '{"name":"Test","codeName":"TEST001","race":"Human"}'`<br/>`# ⚠️ Gateway 路由配置問題：返回 404` |
| `/people/update` | POST | Update person (async if RabbitMQ enabled) | `http://localhost:8082/tymg/people/update` | `/tymg/people/update` → `/tymb/people/update` | `PeopleController.updatePeople()` | ✅ `PeopleConsumer.handleUpdatePerson()` (if async) | ❌ | ✅ | **404** | ⚠️ **Gateway Route Not Found** - Gateway routing issue | `curl -X POST http://localhost:8082/tymg/people/update -H "Content-Type: application/json" -d '{"name":"Test","age":25,"level":1}'`<br/>`# ⚠️ Gateway 路由配置問題：返回 404` |
| `/people/insert-multiple` | POST | Insert multiple people | `http://localhost:8082/tymg/api/people/insert-multiple` | `/tymg/api/people/insert-multiple` → `/tymb/people/insert-multiple` | `PeopleController.insertMultiplePeople()` | ⚠️ **未實現** | ✅ | **500** | ⚠️ **應走異步流程但未實現** - Consumer 有隊列但無監聽器，Backend 無發送方法 | `curl -X POST http://localhost:8082/tymg/api/people/insert-multiple -H "Content-Type: application/json" -d '[{"name":"Test1"},{"name":"Test2"}]'`<br/>`# ⚠️ 當前為同步端點，應改為異步流程` |
| `/people/get-by-name` | POST | Get person by name (async) | `http://localhost:8082/tymg/people/get-by-name` | `/tymg/people/get-by-name` → `/tymb/people/get-by-name` | `PeopleController.getPersonByName()` | ✅ `PeopleConsumer.handleGetPeopleByName()` | ❌ | ✅ | **404** | ⚠️ **Gateway Route Not Found** - Gateway routing issue | `curl -X POST http://localhost:8082/tymg/people/get-by-name -H "Content-Type: application/json" -d '{"name":"Test"}'`<br/>`# ⚠️ Gateway 路由配置問題：返回 404` |
| `/people/delete-all` | POST | Delete all people (async) | `http://localhost:8082/tymg/people/delete-all` | `/tymg/people/delete-all` → `/tymb/people/delete-all` | `PeopleController.deleteAllPeople()` | ✅ `PeopleConsumer.handleDeleteAllPeople()` | ❌ | ✅ | **404** | ⚠️ **Gateway Route Not Found** - Gateway routing issue | `curl -X POST http://localhost:8082/tymg/people/delete-all -H "Content-Type: application/json"`<br/>`# ⚠️ Gateway 路由配置問題：返回 404` |
| `/people/names` | GET | Get all person names (async - 強制) | `http://localhost:8082/tymg/people/names` | `/tymg/people/names` → `/tymb/people/names` | `PeopleController.getNames()` | ✅ `PeopleConsumer.handleGetPeopleNames()` | ❌ | ✅ | **404** | ⚠️ **Gateway Route Not Found** - Gateway routing issue | `curl -X GET http://localhost:8082/tymg/people/names`<br/>`# ⚠️ Gateway 路由配置問題：返回 404` |
| `/people/damageWithWeapon` | GET | Calculate damage | `http://localhost:8082/tymg/people/damageWithWeapon?name={name}` | `/tymg/people/damageWithWeapon` → `/tymb/people/damageWithWeapon` | `WeaponDamageController.damageWithWeapon()` | ❌ | ✅ | **404** | ⚠️ **Gateway Route Not Found** - Gateway routing issue | `curl -X GET "http://localhost:8082/tymg/people/damageWithWeapon?name=Test"`<br/>`# ⚠️ Gateway 路由配置問題：返回 404` |
| `/people/batchDamageWithWeapon` | POST | Batch calculate damage | `http://localhost:8082/tymg/people/batchDamageWithWeapon` | `/tymg/people/batchDamageWithWeapon` → `/tymb/people/batchDamageWithWeapon` | `WeaponDamageController.batchDamageWithWeapon()` | ❌ | ✅ | **401** | ⚠️ Unauthorized - Gateway security filter blocking | `curl -X POST http://localhost:8082/tymg/people/batchDamageWithWeapon -H "Content-Type: application/json" -d '{"names":["Test1","Test2"]}'`<br/>`# ⚠️ Gateway 安全過濾器阻擋` |

**Request Flow:**

**異步流程 (People 異步端點):**
```
Frontend → Gateway (/tymg/people/get-all, /get-by-name, /delete-all, /names, /insert, /update) 
         → Backend (/tymb/people/*) [202 Accepted + requestId]
         → RabbitMQ (people-* queue)
         → Consumer (PeopleConsumer) 
         → Database (R2DBC)
         → AsyncResultService.sendCompletedResult()
         → RabbitMQ (async-result queue)
         → Redis (AsyncResult)
         → Backend polls (/api/async/result/{requestId})
         → Frontend receives result
```

**同步流程 (People 同步端點):**
```
Frontend → Gateway (/tymg/people/damageWithWeapon, /batchDamageWithWeapon) 
         → Backend (/tymb/people/*) [直接返回結果]
         → Frontend
```

**⚠️ 待實現異步流程 (`/people/insert-multiple`):**
```
Frontend → Gateway (/tymg/api/people/insert-multiple)
         → Backend (/tymb/people/insert-multiple) [應返回 202 + requestId]
         → RabbitMQ (people-insert-multiple queue) ⚠️ **Backend 未實現發送**
         → Consumer (PeopleConsumer.handleInsertMultiple) ⚠️ **Consumer 未實現監聽器**
         → Database (R2DBC)
         → AsyncResultService.sendCompletedResult()
         → RabbitMQ (async-result queue)
         → Redis (AsyncResult)
         → Backend polls (/api/async/result/{requestId})
         → Frontend receives result
```

**關鍵說明:**
- ✅ **People Module**: `/get-all`, `/get-by-name`, `/delete-all`, `/names` 走 Consumer (異步)
- ✅ **People Module**: `/insert`, `/update` 如果 RabbitMQ 啟用則走 Consumer (異步)，否則同步處理
- ⚠️ **People Module**: `/insert-multiple` **應走 Consumer (異步)但未實現** - Consumer 有 `people-insert-multiple` 隊列配置，但缺少：
  - Backend: `PEOPLE_INSERT_MULTIPLE_QUEUE` 常量和 `sendPeopleInsertMultipleRequest()` 方法
  - Backend: `PeopleController.insertMultiplePeople()` 的異步邏輯
  - Consumer: `PeopleConsumer.handleInsertMultiple()` 監聽器
- ✅ **Weapon Module**: 核心 CRUD 端點 (`GET /`, `GET /{name}`, `GET /owner/{owner}`, `POST /`, `DELETE /{name}`, `DELETE /delete-all`, `GET /exists/{name}`) 走 Consumer (異步)
- ✅ **Weapon Module**: 更新端點 (`PUT /{name}/*`) 和查詢端點 (`GET /damage-range`, `GET /attribute/{attribute}`) 為同步處理
- ✅ **Consumer 監聽隊列**: 13 個隊列全部有對應的 Consumer 處理器 (People: 6, Weapon: 7, 包括 people-get-names, people-insert, people-update)
- ✅ **Backend 發送邏輯**: AsyncMessageService 已實現所有發送方法並正常運作
- ✅ **異步處理鏈**: Frontend → Gateway → Backend → RabbitMQ → Consumer → Redis → Backend → Frontend

### Weapon Module APIs

**Service File:** `weaponService.ts`
**Target:** Gateway (TYMG) → Backend REST Controllers → Consumer (異步)
**Pattern:** Asynchronous REST API (通過 RabbitMQ) + Synchronous (更新/查詢端點)

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Backend Controller | Consumer | Auth | Tested | Status Code | Test Result | Curl Command |
|-------------------|--------|-------------|----------|---------------|-------------------|----------|------|--------|-------------|-------------|--------------|
| `/weapons` | GET | Get all weapons (async) | `http://localhost:8082/tymg/weapons` | `/tymg/weapons` → `/tymb/weapons` | `WeaponController.getAllWeapons()` | ✅ `WeaponConsumer.handleGetAllWeapons()` | ❌ | ✅ | 202 | Accepted - Async request queued | `curl -X GET http://localhost:8082/tymg/weapons`<br/>`# 異步：返回 202 + requestId` |
| `/weapons/{name}` | GET | Get weapon by name (async) | `http://localhost:8082/tymg/weapons/{name}` | `/tymg/weapons/{name}` → `/tymb/weapons/{name}` | `WeaponController.getWeaponById()` | ✅ `WeaponConsumer.handleGetWeaponByName()` | ❌ | ✅ | 202 | Accepted - Async request queued | `curl -X GET http://localhost:8082/tymg/weapons/Sword`<br/>`# 異步：返回 202 + requestId` |
| `/weapons/owner/{ownerName}` | GET | Get weapons by owner (async) | `http://localhost:8082/tymg/weapons/owner/{ownerName}` | `/tymg/weapons/owner/{ownerName}` → `/tymb/weapons/owner/{ownerName}` | `WeaponController.getWeaponsByOwner()` | ✅ `WeaponConsumer.handleGetWeaponsByOwner()` | ❌ | ✅ | 202 | Accepted - Async request queued | `curl -X GET http://localhost:8082/tymg/weapons/owner/Test`<br/>`# 異步：返回 202 + requestId` |
| `/weapons` | POST | Save weapon (async) | `http://localhost:8082/tymg/weapons` | `/tymg/weapons` → `/tymb/weapons` | `WeaponController.saveWeapon()` | ✅ `WeaponConsumer.handleSaveWeapon()` | ❌ | ✅ | 202 | Accepted - Async request queued | `curl -X POST http://localhost:8082/tymg/weapons -H "Content-Type: application/json" -d '{"name":"Sword","owner":"Test","baseDamage":50}'`<br/>`# 異步：返回 202 + requestId` |
| `/weapons/{name}` | DELETE | Delete weapon by name (async) | `http://localhost:8082/tymg/weapons/{name}` | `/tymg/weapons/{name}` → `/tymb/weapons/{name}` | `WeaponController.deleteWeapon()` | ✅ `WeaponConsumer.handleDeleteWeapon()` | ❌ | ❌ | 202 | Accepted - Async request queued | `curl -X DELETE http://localhost:8082/tymg/weapons/Sword`<br/>`# 異步：返回 202 + requestId` |
| `/weapons/delete-all` | DELETE | Delete all weapons (async) | `http://localhost:8082/tymg/weapons/delete-all` | `/tymg/weapons/delete-all` → `/tymb/weapons/delete-all` | `WeaponController.deleteAllWeapons()` | ✅ `WeaponConsumer.handleDeleteAllWeapons()` | ❌ | ❌ | 202 | Accepted - Async request queued | `curl -X DELETE http://localhost:8082/tymg/weapons/delete-all`<br/>`# 異步：返回 202 + requestId` |
| `/weapons/exists/{name}` | GET | Check weapon exists (async) | `http://localhost:8082/tymg/weapons/exists/{name}` | `/tymg/weapons/exists/{name}` → `/tymb/weapons/exists/{name}` | `WeaponController.checkWeaponExists()` | ✅ `WeaponConsumer.handleWeaponExists()` | ❌ | ❌ | 202 | Accepted - Async request queued | `curl -X GET http://localhost:8082/tymg/weapons/exists/Sword`<br/>`# 異步：返回 202 + requestId` |
| `/weapons/{name}/attributes` | PUT | Update weapon attributes | `http://localhost:8082/tymg/weapons/{name}/attributes` | `/tymg/weapons/{name}/attributes` → `/tymb/weapons/{name}/attributes` | `WeaponController.updateWeaponAttributes()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X PUT http://localhost:8082/tymg/weapons/Sword/attributes -H "Content-Type: application/json" -d '{"attributes":"Slashing"}'` |
| `/weapons/{name}/base-damage` | PUT | Update weapon base damage | `http://localhost:8082/tymg/weapons/{name}/base-damage` | `/tymg/weapons/{name}/base-damage` → `/tymb/weapons/{name}/base-damage` | `WeaponController.updateWeaponBaseDamage()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X PUT http://localhost:8082/tymg/weapons/Sword/base-damage -H "Content-Type: application/json" -d '{"baseDamage":60}'` |
| `/weapons/{name}/bonus-damage` | PUT | Update weapon bonus damage | `http://localhost:8082/tymg/weapons/{name}/bonus-damage` | `/tymg/weapons/{name}/bonus-damage` → `/tymb/weapons/{name}/bonus-damage` | `WeaponController.updateWeaponBonusDamage()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X PUT http://localhost:8082/tymg/weapons/Sword/bonus-damage -H "Content-Type: application/json" -d '{"bonusDamage":20}'` |
| `/weapons/{name}/bonus-attributes` | PUT | Update weapon bonus attributes | `http://localhost:8082/tymg/weapons/{name}/bonus-attributes` | `/tymg/weapons/{name}/bonus-attributes` → `/tymb/weapons/{name}/bonus-attributes` | `WeaponController.updateWeaponBonusAttributes()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X PUT http://localhost:8082/tymg/weapons/Sword/bonus-attributes -H "Content-Type: application/json" -d '{"bonusAttributes":["Strength"]}'` |
| `/weapons/{name}/state-attributes` | PUT | Update weapon state attributes | `http://localhost:8082/tymg/weapons/{name}/state-attributes` | `/tymg/weapons/{name}/state-attributes` → `/tymb/weapons/{name}/state-attributes` | `WeaponController.updateWeaponStateAttributes()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X PUT http://localhost:8082/tymg/weapons/Sword/state-attributes -H "Content-Type: application/json" -d '{"stateAttributes":["Normal"]}'` |
| `/weapons/damage-range` | GET | Find weapons by damage range | `http://localhost:8082/tymg/weapons/damage-range?minDamage={min}&maxDamage={max}` | `/tymg/weapons/damage-range` → `/tymb/weapons/damage-range` | `WeaponController.findByBaseDamageRange()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X GET "http://localhost:8082/tymg/weapons/damage-range?minDamage=10&maxDamage=100"` |
| `/weapons/attribute/{attribute}` | GET | Find weapons by attribute | `http://localhost:8082/tymg/weapons/attribute/{attribute}` | `/tymg/weapons/attribute/{attribute}` → `/tymb/weapons/attribute/{attribute}` | `WeaponController.findByAttribute()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X GET http://localhost:8082/tymg/weapons/attribute/Slashing` |

**Request Flow (混合模式):**
```
異步端點 (核心 CRUD):
Frontend → Gateway Route (/tymg/weapons/*)
         → Backend REST Controller (/tymb/weapons/*) [202 Accepted]
         → RabbitMQ Queue → Consumer Listener
         → Database → Redis (AsyncResult)
         → Backend polls result → Frontend receives data

同步端點 (更新/查詢):
Frontend → Gateway Route (/tymg/weapons/*)
         → Backend REST Controller (/tymb/weapons/*) [直接返回結果]
         → Frontend
```

**關鍵說明:**
- ✅ **Weapon 模組核心 CRUD 走 Consumer** - 7 個核心端點都是異步的 (GET /, GET /{name}, GET /owner/{owner}, POST /, DELETE /{name}, DELETE /delete-all, GET /exists/{name})
- ✅ **Weapon 模組更新/查詢端點同步** - 6 個端點為同步處理 (PUT /{name}/*, GET /damage-range, GET /attribute/{attribute})
- ✅ **Backend 通過 AsyncMessageService 發送消息** - RabbitMQ + Redis 完整流程
- ✅ **Consumer 監聽器完全使用** - 7 個 Weapon 核心監聽器全部活躍
- ✅ **異步處理鏈**: Frontend → Gateway → Backend → RabbitMQ → Consumer → Redis → Backend → Frontend

### Character Service APIs

**Service File:** `characterService.ts`  
**Target:** Internal (wraps `peopleService`)  
**Pattern:** Internal with caching

**Features:**
- Uses `peopleService.getAllPeopleAndWait()` internally
- Transforms People data to Character format
- 5-minute cache duration
- No direct API calls

**Methods:**
- `getCharacters()` - Get with cache
- `refreshCharacters()` - Force refresh
- `getCharacterByName(name)` - Find by name
- `getCharactersWithImages()` - Filter with images

### Damage Calculation APIs

**Service File:** `damageService.ts`  
**Target:** Gateway (TYMG) → Backend  
**Pattern:** Synchronous

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Backend Controller | Auth | Tested | Status Code | Test Result | Curl Command |
|-------------------|--------|-------------|----------|---------------|-------------------|------|--------|-------------|-------------|--------------|
| `/people/damageWithWeapon?name={name}` | GET | Calculate damage | `http://localhost:8082/tymg/people/damageWithWeapon?name={name}` | `/tymg/people/damageWithWeapon` → `/tymb/people/damageWithWeapon` | `WeaponDamageController.damageWithWeapon()` | ❌ | ✅ | 200/400 | OK/Bad Request - Person not found | `curl -X GET "http://localhost:8082/tymg/people/damageWithWeapon?name=Test"` |
| `/people/batchDamageWithWeapon` | POST | Batch calculate damage | `http://localhost:8082/tymg/people/batchDamageWithWeapon` | `/tymg/people/batchDamageWithWeapon` → `/tymb/people/batchDamageWithWeapon` | `WeaponDamageController.batchDamageWithWeapon()` | ❌ | ❌ | N/A | Not tested | `curl -X POST http://localhost:8082/tymg/people/batchDamageWithWeapon -H "Content-Type: application/json" -d '{"names":["Test1","Test2"]}'` |

**Features:**
- Returns damage value directly (synchronous)
- 2-minute cache duration for single damage calculation
- Batch calculation optimized for multiple characters
- Integrated with ServiceManager for retry logic

### Gallery Module APIs

**Service File:** `galleryService.ts`
**Target:** Gateway (TYMG) → Backend REST Controllers (同步)
**Pattern:** Synchronous REST API (不走 Consumer)

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Backend Controller | Consumer | Auth | Tested | Status Code | Test Result | Curl Command |
|-------------------|--------|-------------|----------|---------------|-------------------|----------|------|--------|-------------|-------------|--------------|
| `/gallery/getAll` | POST | Get all images | `http://localhost:8082/tymg/gallery/getAll` | `/tymg/gallery/getAll` → `/tymb/gallery/getAll` | `GalleryController.getAllImages()` | ❌ | ❌ | ✅ | 200 | OK - Empty gallery list | `curl -X POST http://localhost:8082/tymg/gallery/getAll -H "Content-Type: application/json"` |
| `/gallery/getById` | POST | Get image by ID | `http://localhost:8082/tymg/gallery/getById` | `/tymg/gallery/getById` → `/tymb/gallery/getById` | `GalleryController.getImageById()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X POST http://localhost:8082/tymg/gallery/getById -H "Content-Type: application/json" -d '1'` |
| `/gallery/save` | POST | Save image | `http://localhost:8082/tymg/gallery/save` | `/tymg/gallery/save` → `/tymb/gallery/save` | `GalleryController.saveImage()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X POST http://localhost:8082/tymg/gallery/save -H "Content-Type: application/json" -d '{"imageBase64":"data:image/png;base64,..."}'` |
| `/gallery/update` | POST | Update image | `http://localhost:8082/tymg/gallery/update` | `/tymg/gallery/update` → `/tymb/gallery/update` | `GalleryController.updateImage()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X POST http://localhost:8082/tymg/gallery/update -H "Content-Type: application/json" -d '{"id":1,"imageBase64":"data:image/png;base64,..."}'` |
| `/gallery/delete` | POST | Delete image | `http://localhost:8082/tymg/gallery/delete` | `/tymg/gallery/delete` → `/tymb/gallery/delete` | `GalleryController.deleteImage()` | ❌ | ❌ | ❌ | N/A | Not tested | `curl -X POST http://localhost:8082/tymg/gallery/delete -H "Content-Type: application/json" -d '{"id":1}'` |

**Request Flow (完全同步):**
```
Frontend → Gateway Route (/tymg/gallery/*) 
         → RewritePath 
         → Backend REST Controller (/tymb/gallery/*) [直接返回結果]
         → Frontend
```

**Data Format:**
- Images stored as Base64 strings
- Includes metadata (id, createdAt, updatedAt)

**關鍵說明:**
- ❌ **Gallery 模組不走 Consumer** - 所有端點都是同步的
- ✅ **Backend 直接返回結果** - 無需 RabbitMQ/Redis
- ℹ️ **無認證要求** - 返回空數組表示正常

### Blackjack Module APIs

**Service File:** `blackjackService.ts` (if exists)  
**Target:** Gateway (TYMG) → Backend REST Controllers  
**Pattern:** Synchronous (Session-based)

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Backend Controller | Auth | Tested | Status Code | Test Result | Curl Command |
|-------------------|--------|-------------|----------|---------------|-------------------|------|--------|-------------|-------------|--------------|
| `/deckofcards/blackjack/status` | GET | Get game status | `http://localhost:8082/tymg/deckofcards/blackjack/status` | `/tymg/deckofcards/blackjack/status` → `/tymb/deckofcards/blackjack/status` | `BlackjackController.getStatus()` | ❌ | ❌ | N/A | Not tested | `curl -X GET http://localhost:8082/tymg/deckofcards/blackjack/status` |
| `/deckofcards/blackjack/start` | POST | Start new game | `http://localhost:8082/tymg/deckofcards/blackjack/start` | `/tymg/deckofcards/blackjack/start` → `/tymb/deckofcards/blackjack/start` | `BlackjackController.startGame()` | ❌ | ❌ | N/A | Not tested | `curl -X POST http://localhost:8082/tymg/deckofcards/blackjack/start -H "Content-Type: application/json" -b cookies.txt -c cookies.txt`<br/>`# Session-based: 需要保存 cookies` |
| `/deckofcards/blackjack/state` | GET | Get game state | `http://localhost:8082/tymg/deckofcards/blackjack/state` | `/tymg/deckofcards/blackjack/state` → `/tymb/deckofcards/blackjack/state` | `BlackjackController.getGameState()` | ❌ | ❌ | N/A | Not tested | `curl -X GET http://localhost:8082/tymg/deckofcards/blackjack/state -b cookies.txt`<br/>`# Session-based: 需要 cookies` |
| `/deckofcards/blackjack/hit` | POST | Player hit | `http://localhost:8082/tymg/deckofcards/blackjack/hit` | `/tymg/deckofcards/blackjack/hit` → `/tymb/deckofcards/blackjack/hit` | `BlackjackController.playerHit()` | ❌ | ❌ | N/A | Not tested | `curl -X POST http://localhost:8082/tymg/deckofcards/blackjack/hit -H "Content-Type: application/json" -b cookies.txt -c cookies.txt`<br/>`# Session-based: 需要 cookies` |
| `/deckofcards/blackjack/stand` | POST | Player stand | `http://localhost:8082/tymg/deckofcards/blackjack/stand` | `/tymg/deckofcards/blackjack/stand` → `/tymb/deckofcards/blackjack/stand` | `BlackjackController.playerStand()` | ❌ | ❌ | N/A | Not tested | `curl -X POST http://localhost:8082/tymg/deckofcards/blackjack/stand -H "Content-Type: application/json" -b cookies.txt -c cookies.txt`<br/>`# Session-based: 需要 cookies` |
| `/deckofcards/blackjack/end` | POST | End game | `http://localhost:8082/tymg/deckofcards/blackjack/end` | `/tymg/deckofcards/blackjack/end` → `/tymb/deckofcards/blackjack/end` | `BlackjackController.endGame()` | ❌ | ❌ | N/A | Not tested | `curl -X POST http://localhost:8082/tymg/deckofcards/blackjack/end -H "Content-Type: application/json" -b cookies.txt`<br/>`# Session-based: 需要 cookies` |

**Features:**
- Session-based game state management
- HTTP session required for all operations
- Returns game state as JSON

### Sync Service APIs

**Service File:** `syncService.ts`
**Target:** Gateway (TYMG) → External (Google Apps Script)
**Pattern:** Synchronous with long timeout

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Target | Auth | Tested | Status Code | Test Result | Curl Command |
|-------------------|--------|-------------|----------|--------------|--------|------|--------|-------------|-------------|--------------|
| `/api/sync-characters` | POST | Sync to Google Apps Script | `http://localhost:8082/tymg/api/sync-characters` | `/tymg/api/sync-characters` → `/tymb/api/sync-characters` | External | ❌ | ❌ | N/A | Not tested in this session | `curl -X POST http://localhost:8082/tymg/api/sync-characters -H "Content-Type: application/json" -d '[{"name":"Test"}]'`<br/>`# 外部服務：需要 Google Apps Script URL` |

### Monitor Service APIs

**Service File:** `monitorService.ts`
**Target:** Gateway (TYMG) → Backend Health Checks
**Pattern:** Synchronous health checks

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Backend Target | Auth | Tested | Status Code | Test Result | Curl Command |
|-------------------|--------|-------------|----------|--------------|---------------|------|--------|-------------|-------------|--------------|
| `/health` | GET | API health check | `http://localhost:8082/tymg/health` | `/tymg/health` → `/tymb/health` | Backend Health | ❌ | ❌ | 404 | Not Found - Route config issue | `curl -X GET http://localhost:8082/tymg/health`<br/>`# ⚠️ 路由配置需要修复` |
| `/health/consumer` | GET | Consumer status check | `http://localhost:8082/tymg/health/consumer` | `/tymg/health/consumer` → `/tymb/health/consumer` | Consumer Health | ❌ | ❌ | 404 | Not Found - Route config issue | `curl -X GET http://localhost:8082/tymg/health/consumer`<br/>`# ⚠️ 路由配置需要修复` |

**Features:**
- Auto health check every 30 seconds
- Tracks API metrics (response time, success rate)
- Consumer connection monitoring
- Memory usage tracking

### API Summary Statistics

**架構更新：全異步模式 (Gateway REST + RabbitMQ Async)**

| Category | Endpoints | Frontend Prefix | Gateway Route Pattern | Backend Context-Path | Consumer | Pattern | Status |
|----------|-----------|----------------|----------------------|------------------|----------|---------|--------|
| Authentication | 7 | N/A (Direct) | N/A | `/tymb` | ❌ | Sync (Direct Backend) | ✅ 正常運作 |
| People Module | 9 | `/people/*` | `/tymg/people/*` → `/tymb/people/*` | `/tymb` | ✅ (get-all, get-by-name, delete-all, names, insert, update) | **Async (6/9)** | ✅ **異步正常運作** |
| Weapon Module | 14 | `/weapons/*` | `/tymg/weapons/*` → `/tymb/weapons/*` | `/tymb` | ✅ (核心 CRUD: 7 個) | **Async (7/14)** | ✅ **異步正常運作** |
| Gallery | 5 | `/gallery/*` | `/tymg/gallery/*` → `/tymb/gallery/*` | `/tymb` | ❌ | Sync | ✅ 完全同步 |
| Blackjack | 6 | `/deckofcards/blackjack/*` | `/tymg/deckofcards/blackjack/*` → `/tymb/deckofcards/blackjack/*` | `/tymb` | ❌ | Sync (Session) | ✅ 完全同步 |
| Character Service | 0 | Internal only | N/A | N/A | ❌ | Cached (via peopleService) | ✅ 內部服務 |
| Damage Calculation | 2 | `/people/*` | `/tymg/people/damageWithWeapon` → `/tymb/people/damageWithWeapon` | `/tymb` | ❌ | Sync | ✅ 正常運作 |
| Sync | 1 | `/api/sync-characters` | `/tymg/api/sync-characters` → `/tymb/api/sync-characters` | `/tymb` | ❌ | Sync (External) | ⚠️ 未測試 |
| Monitor | 2 | `/health/*` | `/tymg/health/*` → `/tymb/health/*` | `/tymb` | ❌ | Sync | ⚠️ 路由需修復 |
| **Total** | **46** | **`/tymg` Auto** | **RewritePath** | **`/tymb`** | **13 Async** | **混合模式** | **核心功能正常** |

**流量分佈統計:**
- **Gateway → Backend (同步)**: 33 個端點 (72%) - Gallery (5), Blackjack (6), Weapon 更新/查詢 (6), Damage (2), Auth (7), Monitor (2), Sync (1), People 同步 (3), Weapon 同步 (1)
- **Backend → Consumer (異步)**: 13 個端點 (28%) - People (6: get-all, get-by-name, delete-all, names, insert, update), Weapon (7: 核心 CRUD)
- **Consumer 監聽器使用率**: 100% (13/13 個隊列都有對應處理器)
- **Backend AsyncMessageService**: ✅ **正常運作** - 已成功發送消息到 RabbitMQ
- **異步處理鏈**: Frontend → Gateway → Backend → RabbitMQ → Consumer → Redis → Backend → Frontend

### Backend → Consumer Integration (RabbitMQ + Redis)

**Connection Status: ✅ ENABLED - WORKING**

| Component | Status | Configuration | Notes |
|-----------|--------|---------------|-------|
| **RabbitMQ** | ✅ Connected | `RABBITMQ_ENABLED=true` | Backend + Consumer 都連接正常 |
| **AsyncMessageService** | ✅ **Bean 創建成功** | `async-message-service.enabled=true` | 已成功發送消息到 RabbitMQ |
| **Consumer Listeners** | ✅ Active | `RABBITMQ_LEGACY_ENABLED=true` | 10 個監聽器已準備就緒 |
| **Redis** | ✅ Connected | Backend + Consumer | 用於 AsyncResult 存儲 |
| **Traffic Flow** | ✅ **WORKING** | AsyncMessageService 正常運行 | 異步端點正常運作 |

**Current Message Flow (Working):**
```
Frontend → Gateway → Backend REST Controllers
                            ↓ (異步處理)
                    AsyncMessageService.sendXxxRequest() - 成功
                            ↓ (消息發送到 RabbitMQ)
                    RabbitMQ Queue → Consumer Listener
                            ↓ (處理業務邏輯)
                    Database → Redis (AsyncResult)
                            ↓ (Backend 輪詢結果)
                    Frontend 收到異步響應 (200 OK + data)
```

**Implemented Queues & Status:**

| Queue Name | Backend Sender | Consumer Listener | Status | Implementation |
|------------|----------------|-------------------|--------|----------------|
| `people-get-all` | ✅ (實現) | ✅ PeopleConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `people-get-by-name` | ✅ (實現) | ✅ PeopleConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `people-delete-all` | ✅ (實現) | ✅ PeopleConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `people-get-names` | ✅ (實現) | ✅ PeopleConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `people-insert` | ✅ (實現) | ✅ PeopleConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 (如果 RabbitMQ 啟用) |
| `people-update` | ✅ (實現) | ✅ PeopleConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 (如果 RabbitMQ 啟用) |
| `people-insert-multiple` | ❌ **未實現** | ❌ **未實現** | ⚠️ **待實現** | Consumer 有隊列配置，但 Backend 無發送方法，Consumer 無監聽器 |
| `weapon-get-all` | ✅ (實現) | ✅ WeaponConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `weapon-get-by-name` | ✅ (實現) | ✅ WeaponConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `weapon-get-by-owner` | ✅ (實現) | ✅ WeaponConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `weapon-save` | ✅ (實現) | ✅ WeaponConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `weapon-delete` | ✅ (實現) | ✅ WeaponConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `weapon-delete-all` | ✅ (實現) | ✅ WeaponConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `weapon-exists` | ✅ (實現) | ✅ WeaponConsumer | ✅ **正常運作** | 已實現發送邏法並成功運行 |
| `async-result` | ✅ Consumer | ✅ AsyncResultConsumer | ✅ Working | 結果存儲正常 |

**Configuration (Fixed):**
```yaml
# Backend application.yml - 已修復配置
spring:
  rabbitmq:
    enabled: true

# AsyncMessageService 使用的屬性
async-message-service:
  enabled: true

# 環境變數配置
RABBITMQ_ENABLED=true
spring.rabbitmq.enabled=true
RABBITMQ_LEGACY_ENABLED=true
```

**✅ Fix Completed:**
1. ✅ 修復 AsyncMessageService Bean 創建條件 - 使用 `async-message-service.enabled`
2. ✅ 確保 `spring.rabbitmq.enabled` 正確設置
3. ✅ 重新啟動 Backend 並確認異步端點正常運作

**Test Commands:**
```bash
# 1. Send async request
curl -X POST http://localhost:8080/tymb/people/get-all
# Response: {"success":true,"code":202,"requestId":"xxx"}

# 2. Check result (wait 3-5 seconds)
curl http://localhost:8080/tymb/api/async/result/{requestId}
# Response: {"success":true,"code":200,"data":{...}}
```

### Retry Configuration (Common Resilience)

**新增功能：統一重試機制**

| 組件 | 位置 | 功能 |
|------|------|------|
| `@Retryable` | `common/resilience/annotation/` | 重試註解 |
| `RetryConfiguration` | `common/resilience/` | 重試配置 Bean |
| `RetryAspect` | `common/resilience/` | 重試切面實現 |

**使用方式：**
```java
import tw.com.ty.common.resilience.annotation.Retryable;

@Service
public class MyService {

    @Retryable(
        value = {DataAccessException.class, ConnectException.class},
        maxAttempts = 5,
        initialDelay = 2000,
        maxDelay = 10000,
        multiplier = 2.0
    )
    public String databaseOperation(String data) {
        // 會在遇到指定異常時自動重試
        return performDatabaseCall(data);
    }

    @Retryable(maxAttempts = 3) // 使用預設配置
    public String networkCall(String url) {
        // 使用預設重試配置
        return makeHttpCall(url);
    }
}
```

**內建重試模板：**
- `defaultRetryTemplate`: 通用重試 (3 次)
- `databaseRetryTemplate`: 數據庫重試 (10 次，專用於 DB 異常)
- `networkRetryTemplate`: 網路重試 (5 次，專用於網路異常)

**Key Points - 架構核對結果：**
- ✅ **Gateway → Backend 路由正確** - 所有 `/tymg/*` 正確轉發到 `/tymb/*`
- ✅ **Backend → Consumer 異步流程** - 僅 `/people/get-all` 走 RabbitMQ
- ✅ **RabbitMQ + Redis 正常運作** - 異步消息處理和結果存儲正常
- ⚠️ **大部分端點是同步的** - Weapon、Gallery 完全不走 Consumer
- ⚠️ **Consumer 有未使用的監聽器** - 9 個隊列監聽器未被 Backend 使用
- ℹ️ **混合架構** - 1 個異步端點 + 25 個同步端點

---

## 🔍 端點流程核對總結

### ✅ 正確的流程

#### 1. Gateway → Backend (REST 路由)
所有 Gateway 路由配置正確，成功轉發請求到 Backend：
- **People**: `/tymg/people/*` → `/tymb/people/*` ✅
- **Weapon**: `/tymg/weapons/*` → `/tymb/weapons/*` ✅
- **Gallery**: `/tymg/gallery/*` → `/tymb/gallery/*` ✅
- **其他**: Health, Sync, Actuator 等路由正確 ✅

#### 2. Backend → Consumer (RabbitMQ 異步)
**10 個端點走異步流程：**
- **People Module (3 個端點)**:
  - `POST /people/get-all` → `people-get-all` queue
  - `POST /people/get-by-name` → `people-get-by-name` queue
  - `POST /people/delete-all` → `people-delete-all` queue

- **Weapon Module (7 個端點)**:
  - `GET /weapons` → `weapon-get-all` queue
  - `GET /weapons/{name}` → `weapon-get-by-name` queue
  - `GET /weapons/owner/{owner}` → `weapon-get-by-owner` queue
  - `POST /weapons` → `weapon-save` queue
  - `DELETE /weapons/{name}` → `weapon-delete` queue
  - `DELETE /weapons` → `weapon-delete-all` queue
  - `GET /weapons/exists/{name}` → `weapon-exists` queue

**異步流程：**
```
Backend Controller → AsyncMessageService.sendXxxRequest()
                  → RabbitMQ Queue → Consumer Listener
                  → Database (R2DBC) → Redis (AsyncResult)
                  → Backend polls result → Frontend receives data
```
✅ **全部異步端點正常運作** - 返回 202 Accepted，AsyncMessageService 成功發送消息

#### 3. Consumer → Redis (結果存儲)
Consumer 處理完成後，透過 `AsyncResultService` 將結果發送回 Backend：
- **成功**: `sendCompletedResult(requestId, data)` → Redis
- **失敗**: `sendFailedResult(requestId, errorMessage)` → Redis
- Backend 透過 `/api/async/result/{requestId}` 輪詢結果

### ✅ 架構驗證完成

#### 1. 所有 Consumer 監聽器都已使用
所有 10 個 Consumer 監聽器現在都活躍運作：

| 隊列名稱 | Consumer 監聽器 | Backend 發送者 | 狀態 |
|---------|----------------|---------------|------|
| `people-get-all` | ✅ PeopleConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |
| `people-get-by-name` | ✅ PeopleConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |
| `people-delete-all` | ✅ PeopleConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |
| `weapon-get-all` | ✅ WeaponConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |
| `weapon-get-by-name` | ✅ WeaponConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |
| `weapon-get-by-owner` | ✅ WeaponConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |
| `weapon-save` | ✅ WeaponConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |
| `weapon-delete` | ✅ WeaponConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |
| `weapon-delete-all` | ✅ WeaponConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |
| `weapon-exists` | ✅ WeaponConsumer | ✅ AsyncMessageService | ✅ **活躍運作** |

**成果**: 100% 的 Consumer 監聽器使用率，實現了完整的異步架構。

#### 2. 異步端點覆蓋率大幅提升
- **People Module**: 6 個端點中，3 個異步 (50% 異步覆蓋)
- **Weapon Module**: 7 個端點全部異步 (100% 異步覆蓋)
- **總計**: 29 個端點中，10 個異步 (34% 異步覆蓋)

**結論**: 系統成功實現了異步優先架構，核心業務邏輯通過 RabbitMQ + Redis 進行異步處理。

### 📊 流量分佈

```
總端點數: 29

Gateway → Backend (同步): 19 個 (66%)
├── Authentication: 7 個 (直接訪問 Backend，不經過 Gateway)
├── People (同步): 3 個 (insert, update, names)
├── Gallery: 5 個
├── Damage Calculation: 1 個
├── Sync: 1 個
└── Monitor: 2 個

Backend → Consumer (異步): 10 個 (34%)
├── People Module: 3 個 (get-all, get-by-name, delete-all)
└── Weapon Module: 7 個 (全部端點)

Consumer 監聽器使用率: 100% (10/10)
└── 所有監聽器都活躍運作
```

### 🎯 結論

## 📋 **專案版本總結**

### **當前版本資訊**

| 模組 | Repository | 版本 | 狀態 | 主要更改 |
|------|------------|------|------|----------|
| **ty-multiverse-backend** | `https://github.com/Vinskao/ty-multiverse-backend.git` | `1.0` | ✅ 已推送 | Async 處理、RabbitMQ 整合、安全性 toggle |
| **ty-multiverse-common** | `https://github.com/Vinskao/ty-multiverse-common.git` | `1.9` | ✅ 已推送 | Resilience 框架、統一響應系統、v1.9 |
| **ty-multiverse-consumer** | `https://github.com/Vinskao/ty-multiverse-consumer.git` | `1.0.0` | ✅ 已推送 | Common 函式庫整合、移除重複異常處理 |
| **ty-multiverse-frontend** | `https://github.com/Vinskao/ty-multiverse.git` | `0.0.1` | ✅ 已推送 | 服務層重構、API 整合、測試腳本 |
| **ty-multiverse-gateway** | `https://github.com/Vinskao/ty-multiverse-gateway.git` | `1.0` | ✅ 已推送 | 純 REST 路由、移除 gRPC、安全配置 |

### **架構狀態總結**
**架構狀態**: ✅ **全異步優先模式 - 完全運作**

1. **Gateway 路由**: ✅ 完全正確，所有 `/tymg/*` 正確轉發到 `/tymb/*`
2. **Backend REST**: ✅ 正常運作，異步端點返回 202 Accepted
3. **RabbitMQ 異步**: ✅ 完全正常運作，10 個異步端點全部活躍
4. **Redis 存儲**: ✅ 正常運作，AsyncResult 存儲和輪詢正常
5. **Consumer 監聽**: ✅ 100% 使用率，所有 10 個監聽器活躍運作
6. **AsyncMessageService**: ✅ Bean 創建成功，消息發送正常

**成果**:
- 成功實現了完整的異步架構
- 34% 的端點實現異步處理 (10/29)
- 100% 的 Consumer 資源得到充分利用
- 完整的異步處理鏈: Frontend → Gateway → Backend → RabbitMQ → Consumer → Redis → Backend → Frontend

**架構優勢**:
- 高並發處理能力 (通過 RabbitMQ 消息隊列)
- 負載均衡 (Consumer 可以水平擴展)
- 故障隔離 (異步處理不會阻塞主線程)
- 可擴展性 (容易添加新的異步端點)

---

### API Usage Examples

**架構說明：混合模式 - 大部分同步，少量異步**

#### Example 1: Get All People (REST Pattern)

```typescript
import { peopleService } from '@/services/peopleService';

// 直接REST调用 - Gateway自动添加 /tymg 前缀并转发到 /tymb
const people = await peopleService.getAllPeople(); // POST /tymg/people/get-all → Backend REST

// 返回: 202 Accepted (异步处理) 或 直接数据 (同步处理)
```

#### Example 2: Get Weapons (REST Pattern)

```typescript
import { weaponService } from '@/services/weaponService';

// 直接REST调用 - Gateway路由转发
const weapons = await weaponService.getAllWeapons(); // GET /tymg/weapons → /tymb/weapons

// 返回: Weapon[] 数组
```

#### Example 3: Authentication (Direct Backend)

```typescript
import { verifyToken } from '@/services/auth';

// 直接访问Backend认证端点（绕过Gateway）
const result = await verifyToken(accessToken, refreshToken);
if (result.valid) {
  // Token验证成功
  // URL: http://localhost:8080/tymb/keycloak/introspect
  if (result.tokenRefreshed) {
    // 获取新token
    const newToken = result.accessToken;
    const newRefreshToken = result.refreshToken;
  }
}
```

#### Example 4: With Caching

```typescript
import CharacterService from '@/services/characterService';

const characterService = CharacterService.getInstance();

// First call: Fetches from API and caches for 5 minutes
const characters = await characterService.getCharacters();

// Force refresh (bypass cache)
const freshCharacters = await characterService.refreshCharacters();
```

### Error Handling

**架构更新：移除异步轮询，简化错误处理**

All services integrate with `ServiceManager` for unified error handling:

```typescript
import ServiceManager from '@/services/serviceManager';

const manager = ServiceManager.getInstance();

try {
  // 直接REST调用，无需轮询
  const result = await manager.executeAPI(
    () => peopleService.getAllPeople(), // 同步调用
    'GetAllPeople'
  );
} catch (error) {
  // Error automatically logged and categorized
  console.error('Operation failed:', error);
}
```

**Error Types:**
- `NETWORK` - Network connection issues
- `AUTHENTICATION` - Auth failures (401 responses)
- `VALIDATION` - Invalid input data (400 responses)
- `SERVER` - Backend errors (500 responses)
- `NOT_FOUND` - Resource not found (404 responses)
- `UNKNOWN` - Unexpected errors

### Retry Mechanism

**架构更新：移除异步重试，改为简单网络重试**

**Configuration:**
- Max Attempts: 3 (仅网络错误重试)
- Base Delay: 1000ms
- Backoff Multiplier: 2x (exponential)
- Max Delay: 5000ms

**适用场景：**
- 网络超时
- 连接失败
- 5xx服务器错误

**不适用场景：**
- 4xx客户端错误 (不会重试)
- 认证失败 (不会重试)

### Monitoring & Diagnostics

```typescript
import ServiceManager from '@/services/serviceManager';

const manager = ServiceManager.getInstance();

// Get system health
const health = await manager.getSystemHealth();

// Get API metrics
const metrics = manager.getAPIMetrics();

// Get Consumer status
const consumerStatus = manager.getConsumerStatus();

// Export full diagnostics
const diagnostics = manager.exportDiagnostics();
console.log(diagnostics);
```

### Best Practices

**架构更新：REST模式最佳实践**

1. **直接调用REST API**: 所有操作都是同步的，无需`*AndWait()`方法
2. **Handle errors gracefully**: 所有HTTP状态码都会正确转发（400, 401, 404, 500等）
3. **Use TypeScript types**: Import and use provided interfaces
4. **Check cache first**: CharacterService仍然使用缓存优化性能
5. **Monitor HTTP status**: 直接处理HTTP响应状态码，无需轮询
6. **Test error paths**: 测试各种HTTP错误场景（网络错误、认证失败等）

**关键变更：**
- ✅ **移除异步轮询** - 所有API都是同步REST调用
- ✅ **HTTP状态码直接响应** - 无需通过轮询获取结果
- ✅ **简化错误处理** - 直接处理HTTP状态码和响应体
- ✅ **标准REST约定** - 遵循HTTP状态码和RESTful设计原则

### Related Documentation

- **Detailed API Documentation**: See `API-INVENTORY.md`
- **Quick Reference**: See `API-SUMMARY.md`
- **Architecture Details**: See `API-ARCHITECTURE.md`

---

## 📊 API 測試結果總結

**最後測試日期**: 2025-11-18  
**測試範圍**: AGENTS.md 中所有 curl 命令

### ✅ 測試通過的端點

#### Authentication APIs (直接訪問 Backend)
- ✅ `/auth/admin` - 200 OK (返回 admin 資訊)
- ✅ `/auth/user` - 200 OK (返回 user 資訊)
- ✅ `/auth/visitor` - 200 OK (公開端點)
- ✅ `/auth/test` - 200 OK (返回測試結果)
- ✅ `/auth/health` - 200 OK (健康檢查通過)

### ⚠️ 需要修正的端點

#### Authentication APIs
- ⚠️ `/auth/logout-test` - 400 Bad Request (需要 `refreshToken` 參數)
- ⚠️ `/keycloak/introspect` - 400 Bad Request (需要 `token` 參數，不是 JSON body)

#### Gateway 路由問題 (嚴重)
**所有通過 Gateway (`/tymg/*`) 的端點都返回 404**，錯誤訊息：`No static resource tymg/...`

**受影響的端點：**
- ❌ `/tymg/people/*` - 所有端點返回 404
- ❌ `/tymg/weapons` - 返回 404
- ❌ `/tymg/gallery/*` - 返回 404
- ❌ `/tymg/health` - 返回 404

**問題分析：**
1. Gateway 路由配置可能未正確設置
2. Gateway 可能將請求視為靜態資源請求
3. 需要檢查 Gateway 的 `application.yml` 路由配置

**建議修復步驟：**
1. 檢查 Gateway 服務是否正常運行
2. 驗證 Gateway 路由配置 (`spring.cloud.gateway.routes`)
3. 確認路由的 `predicates` 和 `filters` 配置正確
4. 檢查 Gateway 的 RewritePath 過濾器是否正確設置

### 📈 測試統計

| 類別 | 總數 | 通過 | 失敗 | 需要修正 |
|------|------|------|------|----------|
| Authentication APIs | 7 | 5 | 0 | 2 |
| People Module APIs | 9 | 0 | 9 | 0 |
| Weapon Module APIs | 14 | 0 | 14 | 0 |
| Gallery Module APIs | 5 | 0 | 5 | 0 |
| Monitor APIs | 2 | 0 | 2 | 0 |
| **總計** | **37** | **5** | **30** | **2** |

### 🔍 關鍵發現

1. **Backend 直接訪問正常** - 所有直接訪問 Backend (`/tymb/*`) 的端點都能正常響應
2. **Gateway 路由完全失效** - 所有通過 Gateway (`/tymg/*`) 的請求都返回 404
3. **認證配置變更** - Authentication 端點現在允許匿名訪問並返回 200，而不是之前的 401
4. **參數格式問題** - 部分端點需要查詢參數而不是 JSON body

### 🎯 優先修復項目

1. **🔴 高優先級**: 修復 Gateway 路由配置，恢復所有 `/tymg/*` 端點的正常運作
2. **🟡 中優先級**: 更新 Authentication API 文檔，反映實際的響應狀態碼
3. **🟢 低優先級**: 修正參數格式問題（`/auth/logout-test`, `/keycloak/introspect`）
