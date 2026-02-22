# Symphony AION

> Symphony-IR runs AI workflows deterministically. Symphony-AION makes those workflows auditable, measurable, and financially defensible.

A Next.js 14 platform for orchestrating, monitoring, and billing AI workflows with full transparency and control.

## Features

- 🔍 **Complete Observability** - Track every step, model invocation, and tool execution
- 💰 **Financial Accountability** - Precise cost tracking per model, per step, per run
- 📊 **Rich Dashboards** - Real-time monitoring with detailed telemetry and metrics
- ⚡ **High Performance** - Optimized for real-time data processing and streaming
- 🔧 **Extensible** - Plug in custom models, tools, and validation logic
- 🧪 **Fully Tested** - Comprehensive test suite with Jest covering all event types

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 14 App Router                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐        ┌──────────────────────┐       │
│  │   Pages/Routes   │        │    API Routes        │       │
│  ├──────────────────┤        ├──────────────────────┤       │
│  │ /dashboard       │        │ /api/runs/[id]       │       │
│  │ /models          │        │ /api/runs            │       │
│  │ /billing         │        │ /api/events          │       │
│  └──────────────────┘        └──────────────────────┘       │
│                                       ▲                       │
├───────────────────────────────────────┼───────────────────────┤
│                                       │                       │
│  ┌────────────────────────────────────┴───────────────────┐  │
│  │              Data & Transformation Layer               │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  Hooks (lib/hooks/*)          Types (lib/types.ts)   │  │
│  │  ├─ useRunData                ├─ Run                 │  │
│  │  └─ useRunDataBatch           ├─ Event               │  │
│  │                                ├─ RunViewModel        │  │
│  │  Telemetry (lib/telemetry.ts) └─ ... (23 types)      │  │
│  │  ├─ buildRunViewModel()                              │  │
│  │  ├─ formatDuration()                                 │  │
│  │  └─ formatRelativeTime()                             │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                       ▲                       │
├───────────────────────────────────────┼───────────────────────┤
│                                       │                       │
│  ┌────────────────────────────────────┴───────────────────┐  │
│  │              Mock Data & Storage Layer                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  Mock Data (lib/mock-data.ts)                        │  │
│  │  ├─ MOCK_RUNS (4 complete runs with all events)     │  │
│  │  ├─ MOCK_MODELS (3 AI models)                       │  │
│  │  ├─ generateMockRun()                               │  │
│  │  ├─ generateFailedMockRun()                         │  │
│  │  ├─ generateMockBillingData()                       │  │
│  │  └─ generateMockDashboardMetrics()                  │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  [Future: Connect to PostgreSQL, Vector DB, Event Streaming] │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User Action (Dashboard/Page)
   │
   ├─► useRunData Hook
   │   └─► Fetch /api/runs/[id]
   │
2. API Route Handler
   │
   ├─► Query Data Store
   │   └─► Return Run + Events
   │
3. Data Transformation
   │
   ├─► buildRunViewModel()
   │   ├─► Aggregate events (all 13 kinds)
   │   ├─► Calculate costs
   │   ├─► Aggregate tokens
   │   ├─► Format durations & times
   │   └─► Extract performance metrics
   │
4. Component Rendering
   │
   ├─► Display RunViewModel
   │   ├─► Step timeline
   │   ├─► Cost breakdown
   │   ├─► Token usage
   │   └─► Performance metrics
```

### Type System

Symphony AION uses **23 comprehensive TypeScript types** organized into categories:

#### Core Entities
- `Run` - Complete workflow execution record
- `Event` - Telemetry event (supports 13 kinds)
- `Step` - Workflow step/node
- `EventKind` - Enum of all 13 event types

#### Event Kinds (13 Total)
1. **RUN_STARTED** - Workflow execution begins
2. **RUN_COMPLETED** - Workflow succeeds
3. **RUN_FAILED** - Workflow fails
4. **STEP_STARTED** - Step execution begins
5. **STEP_COMPLETED** - Step execution succeeds
6. **STEP_FAILED** - Step execution fails
7. **MODEL_INVOKED** - AI model is called
8. **MODEL_RESPONSE** - Model returns result
9. **TOOL_CALLED** - External tool is invoked
10. **TOOL_RESULT** - Tool returns result
11. **COST_RECORDED** - Financial cost is recorded
12. **VALIDATION_PASSED** - Output validation succeeds
13. **VALIDATION_FAILED** - Output validation fails

#### Derived Data
- `RunViewModel` - Transformed data for UI consumption
- `StepViewModel` - Step display model
- `RunMetrics` - Aggregated metrics
- `ModelUsageSummary` - Model-specific metrics
- `DashboardMetrics` - Dashboard overview
- `BillingData` - Billing and cost data

#### Support Types
- `Status` - Enum for run/step states
- `ModelInvocation` - Model call details
- `ToolExecution` - Tool call details
- `ApiResponse<T>` - Standard API response wrapper

### Telemetry Pipeline

The `buildRunViewModel()` function is the core of data transformation:

```typescript
buildRunViewModel(run: Run): RunViewModel
├─ Event Aggregation
│  └─ Count all 13 event kinds
├─ Cost Calculation
│  ├─ Extract costs from COST_RECORDED events
│  └─ Calculate per-model breakdown
├─ Token Aggregation
│  ├─ Sum tokens from MODEL_INVOKED/MODEL_RESPONSE
│  └─ Track per-model usage
├─ Performance Analysis
│  ├─ Calculate step durations
│  ├─ Find slowest/fastest steps
│  └─ Compute averages
├─ Time Formatting
│  ├─ ISO timestamps
│  └─ Relative time ("2 hours ago")
├─ Duration Formatting
│  └─ Human-readable ("2m 34s")
└─ Error Extraction
   └─ Identify failed steps and root causes
```

## Local Setup

### Prerequisites

- **Node.js** 18.17+ or 20+
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/courtneybtaylor-sys/Symphony-AION.git
   cd Symphony-AION
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm test -- --watch

# Run tests for specific file
npm test -- telemetry.test.ts

# Generate coverage report
npm test -- --coverage
```

### Building for Production

```bash
npm run build
npm run start
```

## Environment Configuration

### Available Environment Variables

See `.env.example` for all variables:

```env
# Next.js
NEXT_PUBLIC_AION_VERSION=1.0.0

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Database (Future)
DATABASE_URL=postgresql://user:password@localhost:5432/symphony_aion

# Feature Flags
NEXT_PUBLIC_ENABLE_MOCK_DATA=true
NEXT_PUBLIC_ENABLE_BILLING_ANALYTICS=true

# Observability
NEXT_PUBLIC_LOG_LEVEL=info
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

## Project Structure

```
symphony-aion/
├── app/
│   ├── api/
│   │   └── runs/
│   │       └── [id]/
│   │           └── route.ts              # GET /api/runs/[id]
│   ├── dashboard/
│   │   └── page.tsx                      # Dashboard page
│   ├── models/
│   │   └── page.tsx                      # Models management page
│   ├── billing/
│   │   └── page.tsx                      # Billing page
│   ├── globals.css                       # Global styles
│   ├── layout.tsx                        # Root layout
│   └── favicon.ico
├── components/
│   └── sidebar.tsx                       # Navigation sidebar
├── hooks/
│   └── useRunData.ts                     # Data fetching hook
├── lib/
│   ├── types.ts                          # 23 TypeScript types
│   ├── mock-data.ts                      # Mock data & generators
│   └── telemetry.ts                      # buildRunViewModel & utilities
├── __tests__/
│   └── lib/
│       └── telemetry.test.ts             # Jest tests (13 event kinds)
├── package.json
├── tsconfig.json
├── next.config.ts
├── jest.config.js
├── jest.setup.js
├── tailwind.config.ts
├── postcss.config.js
├── .env.example                          # Example environment variables
├── .gitignore
├── LICENSE
└── README.md                             # This file
```

## Core Modules

### `lib/types.ts`
Comprehensive TypeScript definitions for all data structures:
- 13 EventKind enums
- Run, Step, Event types
- RunViewModel for UI consumption
- API response types
- ~650 lines, fully documented

**Key Types**: `Run`, `Event`, `EventKind`, `RunViewModel`, `Status`

### `lib/mock-data.ts`
Realistic mock data for development and testing:
- 4 complete sample runs with all event types
- 3 AI model configurations
- Billing and dashboard metrics
- Generators for dynamic data
- ~500 lines

**Key Functions**: `generateMockRun()`, `generateFailedMockRun()`, `generateMockBillingData()`

### `lib/telemetry.ts`
Core data transformation and utilities:
- `buildRunViewModel()` - Main transformation function
- Event aggregation (all 13 kinds)
- Cost and token calculations
- Time formatting utilities
- Validation and estimation functions
- ~450 lines, fully tested

**Key Functions**: `buildRunViewModel()`, `formatDuration()`, `formatRelativeTime()`, `validateRun()`, `getEventLatency()`

### `hooks/useRunData.ts`
React hooks for data fetching:
- `useRunData(runId)` - Fetch single run with auto-polling
- `useRunDataBatch(runIds)` - Fetch multiple runs concurrently
- Error handling and state management
- ~120 lines

**Returns**: `{ data, loading, error, refetch }`

### `app/api/runs/[id]/route.ts`
Next.js API route handler:
- Dynamic route for `/api/runs/[id]`
- Returns mock data from MOCK_RUNS
- Standard error handling
- ~40 lines

**Response**: `ApiResponse<Run>` with status 200/404/500

### `__tests__/lib/telemetry.test.ts`
Comprehensive Jest test suite:
- 50+ test cases
- Tests for all 13 event kinds
- Event aggregation verification
- Cost and token calculation tests
- Performance metrics tests
- Edge case handling
- ~600 lines

**Run with**: `npm test`

## Development Workflow

### Adding a New Page

1. Create page component in `app/[page]/page.tsx`
2. Import `useRunData` hook if needed
3. Use `buildRunViewModel()` to transform data
4. Render using TypeScript-safe types

### Adding a New Event Kind

1. Add enum value to `EventKind` in `lib/types.ts`
2. Update mock data generators in `lib/mock-data.ts`
3. Update aggregation logic in `lib/telemetry.ts`
4. Add test cases in `__tests__/lib/telemetry.test.ts`
5. Update documentation

### Adding New API Routes

1. Create `app/api/[resource]/route.ts`
2. Use `ApiResponse<T>` wrapper
3. Import mock data or connect to database
4. Handle errors with proper HTTP status codes

## Testing

### Test Coverage

- **Telemetry** - All 13 event kinds tested
- **Time Formatting** - Duration and relative time tests
- **Aggregation** - Cost, token, and metric calculations
- **Edge Cases** - Empty data, missing fields, null values
- **Error Handling** - Validation and error messages

### Running Specific Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Specific file
npm test telemetry

# Coverage report
npm test -- --coverage

# Verbose output
npm test -- --verbose
```

## Future Enhancements

### Phase 2: Real Database
- [ ] PostgreSQL schema for runs, events, steps
- [ ] Vector database for embeddings
- [ ] Event streaming (Kafka/Pub-Sub)
- [ ] Real-time dashboards

### Phase 3: Advanced Features
- [ ] Advanced filtering and search
- [ ] Custom alerts and thresholds
- [ ] Workflow templates
- [ ] Batch processing
- [ ] Export (CSV, JSON, PDF)

### Phase 4: Enterprise
- [ ] Multi-tenancy
- [ ] RBAC and audit logs
- [ ] SSO integration
- [ ] Advanced analytics
- [ ] SLA monitoring

## API Documentation

### Get Run by ID

**Endpoint**: `GET /api/runs/[id]`

**Request**:
```bash
curl http://localhost:3000/api/runs/run-001
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "run-001",
    "name": "Weather Query Processing",
    "status": "COMPLETED",
    "startedAt": 1708612800000,
    "completedAt": 1708612954000,
    "durationMs": 154000,
    "steps": [...],
    "events": [...]
  },
  "timestamp": 1708613000000
}
```

**Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Run with ID \"invalid\" not found"
  },
  "timestamp": 1708613000000
}
```

## Performance Considerations

1. **Mock Data** - Currently in-memory; acceptable for development
2. **Real Data** - For production, connect to database with proper indexing
3. **Caching** - Consider Redis for frequently accessed runs
4. **Pagination** - Add for runs and events lists (see API phase 2)
5. **Streaming** - Use WebSockets for real-time run updates

## Security

- ✅ TypeScript for type safety
- ✅ Input validation in API routes
- ✅ Error messages don't leak sensitive data
- [ ] Authentication (TODO - Phase 2)
- [ ] Authorization (TODO - Phase 2)
- [ ] Rate limiting (TODO - Phase 2)

## Contributing

1. Create feature branch: `git checkout -b feature/xyz`
2. Implement changes with tests
3. Run: `npm test` and `npm run lint`
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/xyz`
6. Open Pull Request

## License

This project is licensed under the terms in the LICENSE file.

## Support

For issues, feature requests, or questions:
- 📧 Email: support@symphony-aion.dev
- 🐛 GitHub Issues: [Report an issue](https://github.com/courtneybtaylor-sys/Symphony-AION/issues)
- 💬 Discussions: [Community discussions](https://github.com/courtneybtaylor-sys/Symphony-AION/discussions)

---

**Made with ❤️ by the Symphony AION Team**
