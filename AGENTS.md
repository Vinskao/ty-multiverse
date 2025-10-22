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
