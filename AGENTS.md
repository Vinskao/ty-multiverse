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

All APIs are centrally managed in `src/services/` directory. The frontend communicates with backend services through two main routes:

```
Frontend
    ↓
Services Layer (src/services/)
    ↓
    ├─→ Backend (TYMB) - Direct auth & read operations
    └─→ Gateway (TYMG) - Async operations & writes
```

### Configuration

**Environment Variables:**
- `PUBLIC_TYMB_URL` - Backend service URL (e.g., http://localhost:8080)
- `PUBLIC_TYMG_URL` - Gateway service URL (e.g., http://localhost:8082/tymg)
- `PUBLIC_PEOPLE_IMAGE_URL` - Image CDN URL

**Base URL Priority:**
1. `PUBLIC_TYMG_URL` (Gateway - Preferred, context-path: /tymg)
2. `PUBLIC_TYMB_URL` (Backend - Fallback, context-path: /tymb)

**Context Path Configuration:**
- **Gateway**: `server.servlet.context-path: /tymg`
- **Backend**: `server.servlet.context-path: /tymb`
- **Frontend**: No prefix needed - automatically added by services

### Authentication APIs

**Service File:** `auth.ts`  
**Target:** Backend (TYMB) - Direct (NO Gateway)  
**Authentication:** Bearer Token

| Frontend Endpoint | Method | Description | Full URL | Backend Endpoint | Auth Required | Tested | Status Code | Test Result |
|-------------------|--------|-------------|----------|------------------|---------------|--------|-------------|-------------|
| `/auth/admin` | GET | Test admin endpoint | `http://localhost:8080/tymb/auth/admin` | `/auth/admin` | ✅ | ✅ | 401 | Unauthorized - No token provided |
| `/auth/user` | GET | Test user endpoint | `http://localhost:8080/tymb/auth/user` | `/auth/user` | ✅ | ✅ | 401 | Unauthorized - No token provided |
| `/auth/visitor` | GET | Test visitor endpoint | `http://localhost:8080/tymb/auth/visitor` | `/auth/visitor` | ❌ | ✅ | 200 | OK - Public endpoint accessible |
| `/auth/test` | POST | Auth integration test | `http://localhost:8080/tymb/auth/test` | `/auth/test` | ✅ | ✅ | 401 | Unauthorized - No token provided |
| `/auth/logout-test` | POST | Logout test | `http://localhost:8080/tymb/auth/logout-test` | `/auth/logout-test` | ✅ | ✅ | 401 | Unauthorized - No token provided |
| `/auth/health` | GET | Health check | `http://localhost:8080/tymb/auth/health` | `/auth/health` | ❌ | ✅ | 200 | OK - Health check passed |
| `/keycloak/introspect` | POST | Token validation & refresh | `http://localhost:8080/tymb/keycloak/introspect` | `/keycloak/introspect` | ❌ | ✅ | 400 | Bad Request - Invalid token format |

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
**Target:** Gateway (TYMG) → Backend  
**Pattern:** Producer-Consumer (Async)

#### Producer APIs (Initiate Request)

| Frontend Endpoint | Method | Description | Full URL | Gateway Controller | Backend Endpoint | Returns | Auth | Tested | Status Code | Test Result |
|-------------------|--------|-------------|----------|-------------------|------------------|---------|------|--------|-------------|-------------|
| `/people/insert` | POST | Insert single person | `http://localhost:8082/tymg/people/insert` | `/people/insert` | gRPC: `InsertPerson(data)` | RequestId | ✅ | ✅ | 201 | Created - Request queued successfully |
| `/people/update` | POST | Update person | `http://localhost:8082/tymg/people/update` | `/people/update` | gRPC: `UpdatePerson(data)` | RequestId | ✅ | ✅ | 200 | OK - Update request accepted |
| `/people/insert-multiple` | POST | Batch insert people | `http://localhost:8082/tymg/people/insert-multiple` | `/people/insert-multiple` | gRPC: `InsertMultiplePeople(data)` | RequestId | ✅ | ✅ | 201 | Created - Batch request queued |
| `/people/get-all` | POST | Get all people | `http://localhost:8082/tymg/people/get-all` | `/people/get-all` | gRPC: `GetAllPeople()` | RequestId | ✅ | ✅ | 202 | Accepted - Async request initiated |
| `/people/get-by-name` | POST | Get person by name | `http://localhost:8082/tymg/people/get-by-name` | `/people/get-by-name` | gRPC: `GetPersonByName(name)` | RequestId | ✅ | ✅ | 200 | OK - Query request accepted |
| `/people/delete-all` | POST | Delete all people | `http://localhost:8082/tymg/people/delete-all` | `/people/delete-all` | gRPC: `DeleteAllPeople()` | RequestId | ✅ | ✅ | 204 | No Content - Delete request queued |
| `/people/damageWithWeapon` | GET | Calculate damage | `http://localhost:8082/tymg/people/damageWithWeapon` | `/people/damageWithWeapon` | `/people/damageWithWeapon` | RequestId | ✅ | ✅ | 500 | Internal Error - Missing person data |

#### Consumer APIs (Fetch Results)

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Backend Endpoint | Auth | Tested | Status Code | Test Result |
|-------------------|--------|-------------|----------|---------------|------------------|------|--------|-------------|-------------|
| `/api/request-status/{requestId}` | GET | Get request status | `http://localhost:8082/tymg/api/request-status/{requestId}` | `/api/request-status/{requestId}` | `/api/request-status/{requestId}` | ✅ | ✅ | 500 | Internal Error - RequestId not found in Redis |
| `/api/request-status/{requestId}/exists` | GET | Check if request exists | `http://localhost:8082/tymg/api/request-status/{requestId}/exists` | `/api/request-status/{requestId}/exists` | `/api/request-status/{requestId}/exists` | ✅ | ✅ | 200 | OK - Exists check completed |
| `/api/request-status/{requestId}` | DELETE | Remove request status | `http://localhost:8082/tymg/api/request-status/{requestId}` | `/api/request-status/{requestId}` | `/api/request-status/{requestId}` | ✅ | ✅ | 405 | Method Not Allowed - Route not configured |
| `/people/result/{requestId}` | GET | Get result data | `http://localhost:8082/tymg/people/result/{requestId}` | `/people/result/{requestId}` | `/api/people/result/{requestId}` | ✅ | ✅ | 500 | Internal Error - Result not found in Redis |
| `/people/result/{requestId}/exists` | GET | Check if result exists | `http://localhost:8082/tymg/people/result/{requestId}/exists` | `/people/result/{requestId}/exists` | `/api/people/result/{requestId}/exists` | ✅ | ✅ | 500 | Internal Error - Redis connection issue |
| `/people/result/{requestId}` | DELETE | Cleanup result | `http://localhost:8082/tymg/people/result/{requestId}` | `/people/result/{requestId}` | `/api/people/result/{requestId}` | ✅ | ✅ | 405 | Method Not Allowed - Route not configured |

**Request Flow:**
```
Frontend → Gateway (/tymg/people/* via context-path) → Message Queue (RabbitMQ) → Backend Worker → Redis Result Storage
```

**Polling Configuration:**
- Max Attempts: 30
- Interval: 2000ms (2 seconds)
- Timeout: ~60 seconds

**Helper Methods (with auto-polling):**
- `insertPersonAndWait(person)` - Insert and wait for result
- `getAllPeopleAndWait()` - Get all and wait for result
- `getPersonByNameAndWait(name)` - Query and wait for result
- `getAllWeaponsAndWait()` - Get weapons and wait for result
- `calculateDamageAndWait(name)` - Calculate and wait for result
- `insertMultiplePeopleAndWait(people)` - Batch insert and wait
- `deleteAllPeopleAndWait()` - Delete all and wait

### Weapon Module APIs

**Service File:** `weaponService.ts`  
**Target:** Gateway (TYMG) → Backend  
**Pattern:** Synchronous (gRPC)

| Frontend Endpoint | Method | Description | Full URL | Gateway Controller | Backend Endpoint | Auth | Tested | Status Code | Test Result |
|-------------------|--------|-------------|----------|-------------------|------------------|------|--------|-------------|-------------|
| `/weapons` | GET | Get all weapons | `http://localhost:8082/tymg/weapons` | `/weapons` | gRPC: `GetAllWeapons()` | ✅ | ✅ | 200 | OK - Empty weapon list returned |
| `/weapons/{name}` | GET | Get weapon by name | `http://localhost:8082/tymg/weapons/{name}` | `/weapons/{name}` | gRPC: `GetWeaponById(name)` | ✅ | ✅ | 500 | Internal Error - Weapon not found |
| `/weapons/owner/{ownerName}` | GET | Get weapons by owner | `http://localhost:8082/tymg/weapons/owner/{ownerName}` | `/weapons/owner/{ownerName}` | gRPC: `GetWeaponsByOwner(owner)` | ✅ | ✅ | 200 | OK - Empty owner weapon list |
| `/weapons` | POST | Save weapon | `http://localhost:8082/tymg/weapons` | `/weapons` | gRPC: `CreateWeapon(data)` | ✅ | ✅ | 500 | Internal Error - Invalid weapon data |

**Request Flow:**
```
Frontend → Gateway (/tymg/weapons/* via context-path) → gRPC Client → Backend (WeaponService)
```

**Note:** All weapon operations go through Gateway's gRPC client, which forwards to Backend's gRPC service.

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
**Pattern:** Synchronous (recently changed from async)

| Frontend Endpoint | Method | Description | Full URL | Gateway Controller | Backend Endpoint | Auth | Tested | Status Code | Test Result |
|-------------------|--------|-------------|----------|-------------------|------------------|------|--------|-------------|-------------|
| `/people/damageWithWeapon?name={name}` | GET | Calculate damage | `http://localhost:8082/tymg/people/damageWithWeapon` | `/people/damageWithWeapon` | `/people/damageWithWeapon` | ✅ | ✅ | 500 | Internal Error - Person not found |

**Features:**
- Now returns damage value directly (synchronous)
- 2-minute cache duration
- Integrated with ServiceManager for retry logic

### Gallery Module APIs

**Service File:** `galleryService.ts`  
**Target:** Gateway (TYMG) → Backend  
**Pattern:** Synchronous (gRPC)

| Frontend Endpoint | Method | Description | Full URL | Gateway Controller | Backend Endpoint | Auth | Tested | Status Code | Test Result |
|-------------------|--------|-------------|----------|-------------------|------------------|------|--------|-------------|-------------|
| `/gallery/save` | POST | Save image | `http://localhost:8082/tymg/gallery/save` | `/gallery/save` | gRPC: `SaveImage(data)` | ✅ | ✅ | 500 | Internal Error - Missing required fields |
| `/gallery/getAll` | POST | Get all images | `http://localhost:8082/tymg/gallery/getAll` | `/gallery/getAll` | gRPC: `GetAllImages()` | ✅ | ✅ | 200 | OK - Empty gallery list returned |
| `/gallery/getById?id={id}` | GET | Get image by ID | `http://localhost:8082/tymg/gallery/getById` | `/gallery/getById` | gRPC: `GetImageById(id)` | ✅ | ✅ | 500 | Internal Error - Image not found |
| `/gallery/update` | POST | Update image | `http://localhost:8082/tymg/gallery/update` | `/gallery/update` | gRPC: `UpdateImage(data)` | ✅ | ✅ | 500 | Internal Error - Invalid update data |
| `/gallery/delete` | POST | Delete image | `http://localhost:8082/tymg/gallery/delete` | `/gallery/delete` | gRPC: `DeleteImage(id)` | ✅ | ✅ | 204 | No Content - Delete request accepted |

**Request Flow:**
```
Frontend → Gateway (/tymg/gallery/* via context-path) → gRPC Client → Backend (GalleryService)
```

**Data Format:**
- Images stored as Base64 strings
- Includes metadata (id, createdAt, updatedAt)

### Sync Service APIs

**Service File:** `syncService.ts`  
**Target:** Gateway (TYMG) → External (Google Apps Script)  
**Pattern:** Synchronous with long timeout

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Target | Auth | Tested | Status Code | Test Result |
|-------------------|--------|-------------|----------|--------------|--------|------|--------|-------------|-------------|
| `/api/sync-characters` | POST | Sync to Google Apps Script | `http://localhost:8082/tymg/api/sync-characters` | `/api/sync-characters` | External | ❌ | ✅ | 500 | Internal Error - External service unreachable |

### Monitor Service APIs

**Service File:** `monitorService.ts`  
**Target:** Gateway (TYMG)  
**Pattern:** Synchronous health checks

| Frontend Endpoint | Method | Description | Full URL | Gateway Route | Auth | Tested | Status Code | Test Result |
|-------------------|--------|-------------|----------|--------------|------|--------|-------------|-------------|
| `/health` | GET | API health check | `http://localhost:8082/tymg/health` | `/health` | ❌ | ✅ | 500 | Internal Error - Backend health check failed |
| `/health/consumer` | GET | Consumer status check | `http://localhost:8082/tymg/health/consumer` | `/health/consumer` | ❌ | ✅ | 500 | Internal Error - RabbitMQ consumer not connected |

**Features:**
- Auto health check every 30 seconds
- Tracks API metrics (response time, success rate)
- Consumer connection monitoring
- Memory usage tracking

### API Summary Statistics

| Category | Endpoints | Frontend Prefix | Gateway Context-Path | Backend Context-Path | Target | Pattern |
|----------|-----------|----------------|------------------|------------------|--------|---------|
| Authentication | 7 | N/A (Direct) | N/A | `/tymb` | `/auth/*`, `/keycloak/*` | Sync |
| People Module | 13 | `/people/*` | `/tymg` | `/tymb` | gRPC: PeopleService | Async |
| Weapon Module | 4 | `/weapons/*` | `/tymg` | `/tymb` | gRPC: WeaponService | Sync |
| Gallery | 5 | `/gallery/*` | `/tymg` | `/tymb` | gRPC: GalleryService | Sync |
| Character Service | 0 | Internal only | N/A | N/A | (via peopleService) | Cached |
| Damage Calculation | 1 | `/people/*` | `/tymg` | `/tymb` | `/people/damageWithWeapon` | Sync |
| Sync | 1 | `/api/sync-characters` | `/tymg` | N/A | External (Google) | Sync |
| Monitor | 2 | `/health/*` | `/tymg` | N/A | Gateway health | Sync |
| **Total** | **33** | **Context-Path Auto** | **`/tymg`** | **`/tymb`** | **Mixed** | **Mixed** |

**Key Points:**
- ✅ **Context Path Configuration**: Gateway (`/tymg`), Backend (`/tymb`)
- ✅ **Clean Frontend Code**: No prefix in services - auto-added by Spring context-path
- ✅ **Unified Routing**: All Gateway Controllers use context-path `/tymg`
- ✅ **Direct Backend Access**: Auth endpoints bypass Gateway for security
- ✅ **gRPC Forwarding**: Most Gateway endpoints forward via gRPC to Backend services
- ✅ **Spring Boot Best Practice**: Using `server.servlet.context-path` for unified prefixing

### API Usage Examples

#### Example 1: Get All People (Async Pattern)

```typescript
import { peopleService } from '@/services/peopleService';

// Recommended: Use helper method with auto-polling
const people = await peopleService.getAllPeopleAndWait();

// Manual: Handle polling yourself
const response = await peopleService.getAllPeople(); // POST /tymg/people/get-all (context-path auto-added)
const status = await peopleService.pollUntilComplete(response.requestId);
const result = await peopleService.getPeopleResult(response.requestId);
```

#### Example 2: Get Weapons (Sync Pattern)

```typescript
import { weaponService } from '@/services/weaponService';

// Direct synchronous call - Gateway context-path auto-adds /tymg prefix
const weapons = await weaponService.getAllWeapons(); // GET /tymg/weapons
```

#### Example 3: Authentication

```typescript
import { verifyToken } from '@/services/auth';

const result = await verifyToken(accessToken, refreshToken);
if (result.valid) {
  // Token is valid - Backend context-path auto-adds /tymb prefix
  // Actual URL: http://localhost:8080/tymb/keycloak/introspect
  if (result.tokenRefreshed) {
    // New tokens available
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

All services integrate with `ServiceManager` for unified error handling:

```typescript
import ServiceManager from '@/services/serviceManager';

const manager = ServiceManager.getInstance();

try {
  const result = await manager.executeAPI(
    () => peopleService.getAllPeopleAndWait(),
    'GetAllPeople'
  );
} catch (error) {
  // Error automatically logged and categorized
  console.error('Operation failed:', error);
}
```

**Error Types:**
- `NETWORK` - Network connection issues
- `AUTHENTICATION` - Auth failures
- `RATE_LIMIT` - Too many requests
- `VALIDATION` - Invalid input data
- `SERVER` - Backend errors
- `UNKNOWN` - Unexpected errors

### Retry Mechanism

**Configuration:**
- Max Attempts: 3
- Base Delay: 1000ms
- Backoff Multiplier: 2x (exponential)
- Max Delay: 10000ms

**Example:**
- Attempt 1: Immediate
- Attempt 2: After 1000ms
- Attempt 3: After 2000ms
- Attempt 4: After 4000ms

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

1. **Always use service helpers**: Use `*AndWait()` methods for async operations
2. **Handle errors gracefully**: Wrap calls in try-catch blocks
3. **Use TypeScript types**: Import and use provided interfaces
4. **Check cache first**: Use cached services when appropriate
5. **Monitor performance**: Review API metrics regularly
6. **Test error paths**: Test both success and failure scenarios

### Related Documentation

- **Detailed API Documentation**: See `API-INVENTORY.md`
- **Quick Reference**: See `API-SUMMARY.md`
- **Architecture Details**: See `API-ARCHITECTURE.md`
