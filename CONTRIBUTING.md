# Contributing to DID Credential Manager

Thank you for your interest in contributing to the DID Credential Manager! This guide will help you get started with development.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

The DID Credential Manager is an educational toolkit demonstrating decentralized identity (DID) credential management using DID:peer and DIDComm v2. The system showcases the complete lifecycle of verifiable credentials:

- **Issuance**: Creating and distributing credentials
- **Holding**: Storing and managing credentials
- **Verification**: Validating credential presentations

**Academic Context:**
- Texas A&M University Computer Science Senior Capstone Project
- Fall 2025
- Developed in collaboration with Kyndryl

---

## Architecture

### Core Components

The project is organized as a monorepo with the following workspaces:

#### 1. **Common** (`/common`)
Shared utilities and DIDComm implementation used across all services.

- **Purpose**: Provides reusable functionality for DID operations, messaging, and protocols
- **Key modules**:
  - `didcomm/` - DIDComm v2 message handling
  - `messaging/` - Message types and routing
  - `protocols/` - Protocol implementations (credential issuance, presentation)
  - `types/` - Shared TypeScript type definitions
  - `utils/` - Helper utilities

#### 2. **Issuer** (`/issuer`)
Backend service for credential issuance.

- **Port**: 5001
- **Responsibilities**:
  - Creating and signing verifiable credentials
  - Managing DIDComm out-of-band (OOB) invitations
  - Handling credential offer protocols

#### 3. **Holder** (`/holder`)
Backend service for credential storage and presentation.

- **Port**: 5003
- **Responsibilities**:
  - Storing verifiable credentials
  - Creating verifiable presentations
  - Managing holder's DID and keys
  - SQLite database for credential storage

#### 4. **Verifier** (`/verifier`)
Backend service for credential verification.

- **Port**: 5002
- **Responsibilities**:
  - Requesting credential presentations
  - Verifying credential signatures and validity
  - Managing presentation request protocols

#### 5. **Demo Applications** (`/demo`)
Web interfaces demonstrating real-world usage:

- **`issuer-web`** (Port 5171): DMV-style credential issuance interface
- **`holder-wallet`** (Port 5173): Personal credential wallet
- **`verifier-web`** (Port 5172): Credential verification interface

All demo apps are built with:
- **Vite** - Fast build tool and dev server
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

#### 6. **Tests** (`/tests`)
Comprehensive test suite for CI/CD:

- **`e2e/`** - End-to-end workflow tests
- **`integration/`** - Component interaction tests
- **`helpers/`** - Test utilities and fixtures

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker Desktop** (for containerized development)
- **Git** for version control

### Initial Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-org/did-credential-manager.git
cd did-credential-manager
```

2. **Install dependencies**

```bash
npm install
```

This will install dependencies for all workspaces via npm workspaces.

3. **Build shared dependencies**

```bash
npm run build:common
```

The `common` package must be built first as other packages depend on it.

4. **Build all packages**

```bash
npm run build
```

### Running with Docker (Recommended)

The easiest way to run the entire system:

```bash
npm run docker
```

This command:
- Builds all Docker containers
- Starts all backend services
- Starts all web applications
- Sets up networking between services

**Access the services:**
- Issuer API: http://localhost:5001
- Verifier API: http://localhost:5002
- Holder API: http://localhost:5003
- Issuer Web: http://localhost:5171
- Verifier Web: http://localhost:5172
- Holder Wallet: http://localhost:5173

**Docker management commands:**

```bash
npm run docker:up      # Start in background
npm run docker:down    # Stop all services
npm run docker:logs    # View logs
npm run docker:ps      # Check status
npm run docker:restart # Restart all services
npm run docker:clean   # Remove all containers and volumes
```

### Running Locally (Development)

For active development on specific components:

**Backend Services:**

```bash
# Terminal 1 - Issuer
npm run dev:issuer

# Terminal 2 - Holder
npm run dev:holder

# Terminal 3 - Verifier
npm run dev:verifier

# Or run all at once:
npm run dev:all
```

**Web Applications:**

```bash
# Issuer Web
cd demo/issuer-web
npm install
npm run dev

# Holder Wallet
cd demo/holder-wallet
npm install
npm run dev

# Verifier Web
cd demo/verifier-web
npm install
npm run dev
```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### 2. Make Your Changes

- Write clean, well-documented code
- Follow the [Code Style Guidelines](#code-style-guidelines)
- Add or update tests as needed
- Update documentation if applicable

### 3. Build and Test Locally

```bash
# Build all packages
npm run build

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run tests
npm test
```

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add credential expiration validation"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test updates
- `refactor:` - Code refactoring
- `chore:` - Build/tooling changes

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:
- Clear title and description
- Reference to any related issues
- Screenshots/videos for UI changes
- Test results

---

## Code Style Guidelines

### TypeScript

- **Use TypeScript** for all new code
- **Enable strict mode** - follow existing `tsconfig.json` settings
- **Explicit types** - prefer explicit type annotations over inference for public APIs
- **No `any`** - avoid using `any` type; use `unknown` if type is truly unknown

**Example:**

```typescript
// Good
export async function issueCredential(
  holderDid: string,
  credentialData: CredentialSubject
): Promise<VerifiableCredential> {
  // implementation
}

// Avoid
export async function issueCredential(holderDid, credentialData) {
  // implementation
}
```

### Documentation

- **JSDoc comments** for all exported functions, classes, and interfaces
- **Inline comments** for complex logic
- **README files** in each major directory

**Example:**

```typescript
/**
 * Creates a verifiable credential with the given subject data.
 *
 * @param holderDid - The DID of the credential holder
 * @param credentialData - The data to include in the credential
 * @returns A signed verifiable credential
 * @throws {Error} If signing fails or DID is invalid
 */
export async function issueCredential(
  holderDid: string,
  credentialData: CredentialSubject
): Promise<VerifiableCredential> {
  // implementation
}
```

### Code Organization

- **One component per file** for React components
- **Logical grouping** - group related functionality in directories
- **Index files** - use `index.ts` to export public API
- **Avoid circular dependencies**

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `credential-service.ts`)
- **Classes/Interfaces**: `PascalCase` (e.g., `CredentialService`)
- **Functions/Variables**: `camelCase` (e.g., `issueCredential`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)
- **React Components**: `PascalCase` (e.g., `CredentialCard.tsx`)

### Formatting

The project uses Prettier for code formatting:

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

Linting:

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Best Practices

1. **Error Handling**
   - Always handle errors appropriately
   - Use custom error classes for domain-specific errors
   - Log errors with sufficient context

2. **Async/Await**
   - Prefer `async/await` over raw promises
   - Always handle promise rejections

3. **Security**
   - Never commit API keys, private keys, or secrets
   - Validate all inputs
   - Use environment variables for configuration

4. **Performance**
   - Avoid unnecessary re-renders in React
   - Use appropriate data structures
   - Cache expensive computations

5. **Testing**
   - Write tests for new features
   - Maintain or improve test coverage
   - Test edge cases and error conditions

---

## Testing

### Test Structure

```
tests/
├── e2e/              # End-to-end tests
├── integration/      # Integration tests
├── helpers/          # Test utilities
└── fixtures/         # Test data
```

Each component also has its own unit tests:
- `common/src/**/*.test.ts`
- `issuer/src/**/*.test.ts`
- `holder/src/**/*.test.ts`
- `verifier/src/**/*.test.ts`

### Running Tests

**All tests:**

```bash
npm test
```

**Specific test suites:**

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

**Individual workspace tests:**

```bash
# Common package tests
npm test -w common

# Issuer tests
npm test -w issuer

# Holder tests
npm test -w holder

# Verifier tests
npm test -w verifier
```

**With coverage:**

```bash
npm run test:coverage
```

### Writing Tests

**Unit Test Example:**

```typescript
import { describe, it, expect } from '@jest/globals';
import { createDid } from './did-service';

describe('DID Service', () => {
  it('should create a valid DID:peer', async () => {
    const did = await createDid();
    expect(did).toMatch(/^did:peer:2/);
  });

  it('should throw error for invalid input', async () => {
    await expect(createDid('')).rejects.toThrow();
  });
});
```

**Integration Test Example:**

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { startIssuer } from '../issuer/server';
import { startHolder } from '../holder/server';

describe('Credential Issuance Flow', () => {
  beforeAll(async () => {
    await startIssuer();
    await startHolder();
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should issue credential to holder', async () => {
    // Test implementation
  });
});
```

### Test Guidelines

- **Descriptive names** - test names should clearly describe what is being tested
- **Arrange-Act-Assert** - organize tests with clear setup, execution, and verification
- **Isolated tests** - tests should not depend on each other
- **Mock external dependencies** - use mocks for external APIs and services
- **Test edge cases** - include tests for error conditions and boundary cases

---

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**

```bash
npm test
```

2. **Run linting and type checking**

```bash
npm run lint
npm run typecheck
```

3. **Build successfully**

```bash
npm run build
```

4. **Update documentation** if needed

5. **Rebase on latest main**

```bash
git checkout main
git pull origin main
git checkout your-feature-branch
git rebase main
```

### Pull Request Template

When creating a pull request, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All existing tests pass
- [ ] New tests added for changes
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **Code review** by at least one maintainer
3. **Address feedback** and make requested changes
4. **Approval** from maintainer
5. **Merge** to main branch

### After Merge

- Delete your feature branch
- Close related issues
- Update project board if applicable

---

## Documentation

### Types of Documentation

1. **Code Documentation**
   - JSDoc comments for functions/classes
   - Inline comments for complex logic

2. **API Documentation**
   - Located in `docs/api/`
   - Generate with TypeDoc:
   ```bash
   npx typedoc
   ```

3. **User Documentation**
   - Setup guide: `docs/SETUP.md`
   - End-to-end flow: `docs/END_TO_END_FLOW.md`
   - Project specs: `docs/FULL_PROJECT_SPECS.md`

4. **Component README**
   - Each major directory should have a `README.md`
   - Explain purpose, usage, and architecture

### Updating Documentation

When making changes:

- **API changes**: Update JSDoc and regenerate TypeDoc
- **User-facing changes**: Update relevant guides in `docs/`
- **New features**: Add examples and usage instructions
- **Breaking changes**: Clearly document migration path

---

## Common Tasks

### Adding a New Dependency

```bash
# To root package
npm install <package-name> -D

# To specific workspace
npm install <package-name> -w <workspace-name>

# Example: Add a package to holder
npm install express -w holder
```

### Creating a New Component

1. Create directory structure
2. Add TypeScript files
3. Create `index.ts` to export public API
4. Add tests
5. Update documentation

### Working on Common Package

The `common` package is shared by all services:

1. Make changes in `common/src/`
2. Rebuild the package:
   ```bash
   npm run build:common
   ```
3. Changes will be reflected in dependent packages

### Debugging

**Backend Services:**

Use Node.js debugger:

```bash
# Add to package.json scripts
"debug": "node --inspect dist/server.js"
```

**Frontend Applications:**

Use browser DevTools and React DevTools extension.

**Docker Containers:**

```bash
# View logs
docker-compose logs -f <service-name>

# Access container shell
docker-compose exec <service-name> sh

# Example
docker-compose exec issuer sh
```

### Database Management

The holder service uses SQLite:

```bash
# Access holder database
cd holder
sqlite3 holder-credentials.db

# View tables
.tables

# Query credentials
SELECT * FROM credentials;

# Exit
.quit
```

---

## Troubleshooting

### Common Issues

#### "Cannot find module '@did-edu/common'"

**Solution:**
```bash
npm run build:common
```

The common package must be built before dependent packages can import it.

#### Port Already in Use

**Solution:**
```bash
# Find process using port
lsof -i :5001

# Kill process
kill -9 <PID>

# Or use different ports in .env files
```

#### TypeScript Errors After Updating Dependencies

**Solution:**
```bash
# Clean build artifacts
npm run clean

# Rebuild everything
npm install
npm run build
```

#### Docker Build Failures

**Solution:**
```bash
# Clean Docker cache
npm run docker:clean

# Rebuild from scratch
npm run docker:rebuild
```

#### Tests Failing

**Solution:**
1. Ensure all services are running
2. Check service health endpoints
3. Review test logs for specific errors
4. Verify test data and fixtures are correct

### Getting Help

- **Check documentation** in `docs/` directory
- **Review existing issues** on GitHub
- **Ask questions** in pull requests or issues
- **Contact maintainers** for guidance

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Expected Behavior

- Be respectful and professional
- Accept constructive criticism gracefully
- Focus on what's best for the project
- Show empathy towards other contributors

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

---

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

---

## Questions?

If you have questions not covered in this guide, please:

1. Check the documentation in `docs/`
2. Review existing issues and discussions
3. Create a new issue with the `question` label

Thank you for contributing to the DID Credential Manager! 🎉
