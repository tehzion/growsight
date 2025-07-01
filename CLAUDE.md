# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
- `npm run dev` - Start development server (Vite with HMR)
- `npm run build` - Production build with code splitting
- `npm run build:staging` - Staging build with environment config
- `npm run preview` - Preview production build locally
- `docker-compose up -d` - Start self-hosted Supabase stack

### Code Quality
- `npm run lint` - Run ESLint with TypeScript support
- `npm run type-check` - TypeScript type checking (no emit)
- `npm run format` - Format code with Prettier (if configured)

### Testing
- `npm test` - Run Vitest tests with jsdom environment
- `npm run test:ui` - Run tests with Vitest UI interface
- `npm run test:coverage` - Run tests with v8 coverage report (text/JSON/HTML)
- `npm run test:watch` - Run tests in watch mode for development

### Database Management
- `npx supabase db reset` - Reset local database with migrations
- `npx supabase gen types typescript` - Generate TypeScript types from schema
- `npx supabase migration new <name>` - Create new migration file

## Architecture Overview

### Core Technology Stack
- **Frontend Framework**: React 18 + TypeScript + Vite (with HMR)
- **Styling**: Tailwind CSS + PostCSS + Autoprefixer
- **State Management**: Zustand with persistence middleware
- **Routing**: React Router v6 with protected routes
- **Forms**: React Hook Form + Zod validation + @hookform/resolvers
- **Database**: Supabase (PostgreSQL + PostgREST + GoTrue + Realtime)
- **Authentication**: Supabase Auth with OTP support
- **Testing**: Vitest + jsdom + @testing-library/react + v8 coverage
- **Charts/Visualization**: Recharts for analytics dashboards
- **Icons**: Lucide React icon library
- **Date Handling**: date-fns utility library
- **Development**: ESLint + TypeScript + Vite dev server
- **Deployment**: Netlify (frontend) + Docker Compose (backend)

### State Management Architecture
The application uses Zustand stores with slice-based organization:

#### Store Structure
- **`authStore`** - Authentication, user session, OTP flow, login/logout
  - Persisted to localStorage via `zustand/middleware/persist`
  - Manages JWT tokens, user profile, role-based permissions
- **`organizationStore`** - Multi-tenant organization data and management
  - Organization CRUD operations, settings, user assignments
- **`assessmentStore`** - Assessment lifecycle management
  - Draft/Published workflow, template management, section organization
- **`userStore`** - User management and peer relationships
  - User profiles, role assignments, relationship mappings
- **`resultStore`** - Assessment results and analytics processing
  - Response aggregation, comparison analytics, historical trends
- **`assignmentStore`** - Assessment assignment workflow
  - Assignment creation, progress tracking, due date management
- **`dashboardStore`** - Dashboard metrics and real-time data
  - KPI calculations, chart data, notification management

#### State Management Patterns
- **Actions**: Pure functions for state updates, async operations handled with try/catch
- **Selectors**: Memoized derived state calculations for performance
- **Persistence**: Critical state (auth, preferences) persisted across sessions
- **Optimistic Updates**: UI updates immediately, with rollback on API failures

### Key Architectural Patterns

#### Environment Configuration
- Environment detection via `src/config/environment.ts`
- Demo mode fallback when Supabase credentials missing
- Feature flags for progressive enhancement
- Multi-environment support (dev/staging/production)

#### Database Layer
- Supabase client with retry logic and error handling
- Type-safe database operations via generated types
- Row Level Security (RLS) policies for data isolation
- Real-time subscriptions for live updates

#### User Role System
- `super_admin` - System-wide access, organization management
- `org_admin` - Organization-scoped admin with configurable permissions
- `employee` - Self-assessment completion, personal results
- `reviewer` - Assessment completion for assigned employees

#### Assessment Architecture
- Section-based assessment structure
- Multiple question types: rating scales, multiple choice, yes/no, text
- Draft/Published workflow with assignment system
- Progress tracking at section and overall levels
- Results comparison (self vs others, historical trends)

### Component Architecture

#### Component Hierarchy & Patterns
- **Smart/Dumb Components**: Container components manage state/logic, presentational components handle UI
- **Higher-Order Components (HOCs)**: `ProtectedRoute` for role-based route protection
- **Custom Hooks**: Feature-specific hooks (`useAuthStore`, `useAssessmentStore`) for logic reuse
- **Compound Components**: Complex UI patterns broken into composable parts

#### Directory Structure
```
src/components/
├── auth/                    # Authentication flow components
│   ├── LoginForm.tsx       # Email/password and OTP login
│   ├── SignupForm.tsx      # User registration with validation
│   └── ProtectedRoute.tsx  # Role-based route protection
├── layout/                  # Application shell components
│   ├── Layout.tsx          # Main app layout with sidebar/header
│   ├── AuthLayout.tsx      # Centered layout for auth pages
│   ├── Header.tsx          # Navigation header with user menu
│   ├── Sidebar.tsx         # Role-based navigation sidebar
│   └── Breadcrumbs.tsx     # Dynamic breadcrumb navigation
├── assessments/             # Assessment workflow components
│   ├── AssessmentCard.tsx  # Assessment preview/summary card
│   ├── QuestionTypes/      # Different question type renderers
│   ├── AssessmentForm.tsx  # Assessment creation/editing
│   └── ProgressTracker.tsx # Section completion tracking
├── assignments/             # Assignment management components
│   ├── AssignmentList.tsx  # Assignment dashboard view
│   ├── AssignmentCard.tsx  # Individual assignment card
│   └── DueDateManager.tsx  # Due date setting and reminders
├── results/                 # Results and analytics components
│   ├── ResultsDashboard.tsx # Analytics overview
│   ├── ComparisonChart.tsx  # Self vs others comparison
│   └── TrendsAnalysis.tsx   # Historical trend visualization
├── ui/                      # Reusable UI primitives
│   ├── Button.tsx          # Styled button with variants
│   ├── Card.tsx            # Container component
│   ├── FormInput.tsx       # Form input with validation
│   ├── Modal.tsx           # Modal dialog system
│   ├── LoadingSpinner.tsx  # Loading states
│   └── DataTable.tsx       # Sortable/filterable tables
└── shared/                  # Cross-feature shared components
    ├── ErrorBoundary.tsx   # React error boundary
    ├── NotificationToast.tsx # Toast notification system
    └── ConfirmDialog.tsx   # Confirmation dialogs

src/pages/                   # Route-level page components
├── admin/                   # Super admin and org admin pages
│   ├── Dashboard.tsx       # Admin dashboard with metrics
│   ├── Organizations.tsx   # Organization management
│   ├── Users.tsx          # User management interface
│   └── Settings.tsx       # System settings
├── auth/                    # Authentication pages
│   ├── Login.tsx          # Login page with OTP support
│   ├── Signup.tsx         # Registration page
│   └── ResetPassword.tsx  # Password reset flow
└── user/                    # End-user pages
    ├── Dashboard.tsx      # User dashboard
    ├── Assessments.tsx    # Available assessments
    ├── MyResults.tsx      # Personal results view
    └── Profile.tsx        # User profile management
```

#### Component Design Patterns
- **Render Props**: For complex state sharing between components
- **Context Providers**: Feature-specific contexts for deep prop drilling avoidance
- **Error Boundaries**: Graceful error handling with fallback UI
- **Lazy Loading**: Route-based code splitting for performance
- **Memoization**: React.memo and useMemo for expensive re-renders

### Database Schema
The application uses Supabase migrations in `/supabase/migrations/` with comprehensive RLS policies:

#### Core Tables
- **`organizations`** - Multi-tenant organization data with settings
- **`users`** - User profiles with role-based access (`super_admin`, `org_admin`, `employee`, `reviewer`)
- **`assessments`** - Assessment templates with draft/published states
- **`assessment_sections`** - Logical grouping of questions within assessments
- **`assessment_questions`** - Individual questions with type definitions
- **`question_options`** - Multiple choice options for questions

#### Assignment & Response Tables
- **`assessment_assignments`** - Links users to assessments with due dates and status
- **`assessment_responses`** - Stores user answers (ratings, text, selections)
- **`assessment_progress`** - Tracks section-level completion progress
- **`assessment_organization_assignments`** - Cross-organization assessment sharing

#### Relationship & Security Tables
- **`user_relationships`** - Peer/supervisor/team member relationships
- **`access_requests`** - Platform access request workflow
- **`user_sessions`** - Session management and OTP tracking
- **`user_preferences`** - User-specific settings (notifications, theme)
- **`user_activity_log`** - Comprehensive audit trail

#### Database Relationships
- Organizations → Users (1:many) with RLS isolation
- Assessments → Sections → Questions → Options (hierarchical)
- Users → Assignments → Responses → Progress (assessment workflow)
- Users → Relationships (many:many self-referencing)

#### Security Model
- **Row Level Security (RLS)** enabled on all tables
- **Role-based policies** enforce data access boundaries
- **Organization isolation** prevents cross-tenant data access
- **Audit logging** tracks all user actions and data changes

### Self-Hosted Supabase Stack
This project includes complete self-hosted Supabase configuration:

#### Docker Services
- **`docker-compose.yml`** - Full Supabase stack orchestration
- **Kong API Gateway** - Request routing and rate limiting
- **PostgreSQL** - Primary database with extensions
- **PostgREST** - Auto-generated REST API from database schema
- **GoTrue** - Authentication and user management service
- **Realtime** - WebSocket connections for live updates
- **Storage** - File storage service
- **Functions** - Edge functions runtime
- **Analytics** - Usage analytics and monitoring

#### Configuration
- **`volumes/`** - Service configuration files
  - `api/kong.yml` - Kong gateway configuration
  - `db/` - PostgreSQL initialization scripts
  - `logs/` - Centralized logging configuration
- **Environment variables** in `.env` files for each service
- **Network isolation** between services with internal communication
- **Health checks** and restart policies for all services

#### Management Commands
- `docker-compose up -d` - Start all services in background
- `docker-compose logs -f [service]` - View service logs
- `docker-compose exec db psql -U postgres` - Direct database access
- `docker-compose down -v` - Stop and remove all data

## Important Development Notes

### Demo Mode
The application automatically enters demo mode when Supabase credentials are missing, providing:
- Mock authentication with preset users
- In-memory data stores
- Full feature simulation for development/testing

### Environment Variables
Required for production (see `DEPLOYMENT.md` for complete list):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Testing Strategy & Setup

#### Testing Framework Configuration
- **Vitest** - Fast unit testing with native ESM support
- **jsdom** - Browser environment simulation for React component testing
- **@testing-library/react** - Component testing utilities with user-centric queries
- **@testing-library/jest-dom** - Extended matchers for DOM assertions
- **v8** - Native code coverage with text/JSON/HTML reporting

#### Test Organization
- **Unit Tests**: `src/components/ui/__tests__/` - UI component behavior testing
- **Integration Tests**: Feature-level testing with multiple components
- **Store Tests**: Zustand store logic and state management testing
- **API Tests**: Supabase client integration and error handling
- **E2E Tests**: Critical user journeys (authentication, assessment completion)

#### Coverage Configuration
- **Minimum thresholds**: 80% statements, 75% branches, 80% functions
- **Excluded files**: Config files, type definitions, build artifacts
- **Reports**: Generated in `coverage/` directory with HTML visualization

#### Testing Patterns
- **Arrange-Act-Assert**: Clear test structure with setup, action, verification
- **Mock Strategy**: Mock external dependencies (Supabase client, APIs)
- **User-Centric Testing**: Focus on user interactions rather than implementation
- **Snapshot Testing**: For complex UI components with stable markup

### Migration Management
Database changes should be made via Supabase migrations:
1. Create new migration file in `/supabase/migrations/`
2. Follow naming convention: `YYYYMMDDHHMMSS_description.sql`
3. Test migrations in development before deployment

### Type Safety & Code Quality

#### TypeScript Configuration
- **Database types**: Auto-generated in `src/types/supabase.ts` from schema
- **Application types**: Custom types in `src/types/index.ts`
- **Strict mode**: `noEmit` checking with comprehensive compiler flags
- **Path mapping**: Absolute imports with `@/` prefix for cleaner imports

#### Code Quality Tools
- **ESLint**: TypeScript-aware linting with React hooks plugin
- **Prettier**: Automated code formatting (if configured)
- **Husky**: Git hooks for pre-commit quality checks
- **Type checking**: Continuous type validation during development

## Performance Optimization

### Build Optimization
- **Code Splitting**: Manual chunks configuration in `vite.config.ts`
  - Vendor libraries separated into dedicated chunks
  - Route-based lazy loading for page components
  - Dynamic imports for heavy features (charts, analytics)
- **Tree Shaking**: Unused code elimination with ESM modules
- **Bundle Analysis**: Vite bundle analyzer for size optimization
- **Asset Optimization**: Image compression and format conversion

### Runtime Performance
- **React Optimization**:
  - `React.memo` for expensive component re-renders
  - `useMemo` and `useCallback` for computed values and functions
  - Virtual scrolling for large data lists
  - Debounced search and form inputs
- **State Management**:
  - Zustand store slicing to prevent unnecessary re-renders
  - Selective subscriptions to specific store slices
  - Optimistic UI updates with rollback on errors
- **Database Performance**:
  - Indexed queries for common search patterns
  - Pagination for large datasets
  - Real-time subscriptions with smart connection management

### Caching Strategy
- **Browser Caching**: Service worker for offline functionality
- **API Caching**: Supabase client with intelligent retry logic
- **State Persistence**: Selective state persistence to localStorage
- **Image Caching**: CDN integration for static assets

## Development Workflow

### Local Development Setup
1. **Clone repository** and install dependencies with `npm install`
2. **Environment setup**: Copy `.env.example` to `.env.local` with credentials
3. **Database setup**: Run `docker-compose up -d` for local Supabase stack
4. **Run migrations**: Apply schema changes with `npx supabase db reset`
5. **Start development**: `npm run dev` for Vite dev server with HMR

### Code Development Patterns
- **Feature Branch Workflow**: Create branches for each feature/bugfix
- **Conventional Commits**: Structured commit messages for automated versioning
- **Pull Request Reviews**: Code review process with quality checks
- **Testing Requirements**: All new features must include appropriate tests

### Debugging & Monitoring
- **Browser DevTools**: React DevTools and Vite HMR debugging
- **Supabase Dashboard**: Database queries and real-time monitoring
- **Error Tracking**: Console logging with structured error reporting
- **Performance Monitoring**: Vite bundle analysis and runtime metrics

### Deployment Process
- **Staging Environment**: `npm run build:staging` for pre-production testing
- **Production Build**: `npm run build` with optimizations enabled
- **Netlify Deployment**: Automated deployment from main branch
- **Database Migrations**: Applied automatically via Supabase CLI integration