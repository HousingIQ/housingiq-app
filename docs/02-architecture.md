# Architecture Documentation

## Full System Architecture

```mermaid
flowchart TB
    subgraph Sources["External Data Sources"]
        ZILLOW[Zillow Research API]
        REDFIN[Redfin - Future]
        CENSUS[Census - Future]
    end

    subgraph DataPlatform["Data Platform"]
        subgraph Orchestration["Dagster (localhost:3000)"]
            ASSETS[Software-Defined Assets]
        end

        subgraph Ingestion["Python Ingestion"]
            DL[Download Raw Files]
            GX[Great Expectations]
        end

        subgraph Transform["dbt Transformations"]
            STG[staging/]
            MART[marts/]
        end
    end

    subgraph Storage["PostgreSQL (localhost:5432)"]
        RAW[(raw schema)]
        ANALYTICS[(analytics schema)]
        APP[(app schema)]
    end

    subgraph Webapp["Next.js Application (localhost:3001)"]
        API[API Routes]
        AUTH[NextAuth.js]
        UI[React Dashboard]
    end

    subgraph External["External Services"]
        GOOGLE[Google OAuth]
    end

    ZILLOW --> DL
    REDFIN --> DL
    CENSUS --> DL

    DL --> GX --> RAW
    RAW --> STG --> MART --> ANALYTICS
    ASSETS --> DL
    ASSETS --> Transform

    ANALYTICS --> API
    APP --> API
    API --> UI
    AUTH --> GOOGLE
    AUTH --> APP
```

## Component Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Data Platform** | Dagster + dbt + GX | ETL, transformations, data quality |
| **Web Application** | Next.js + Drizzle | User interface, API |
| **Database** | PostgreSQL | Shared data store |
| **Authentication** | NextAuth.js | Google OAuth |

For detailed data platform architecture, see [09-data-platform.md](./09-data-platform.md).

---

## Web Application Architecture

```mermaid
flowchart TB
    subgraph Client["Client Browser"]
        UI[React UI]
        RC[Recharts]
    end

    subgraph NextJS["Next.js Application"]
        subgraph Pages["App Router"]
            LP[Landing Page<br/>/]
            LG[Login Page<br/>/login]
            DB[Dashboard<br/>/dashboard]
            CP[Compare<br/>/dashboard/compare]
        end

        subgraph API["API Routes"]
            AR[/api/auth/*]
            ZR[/api/zhvi/*]
        end

        MW[Middleware]
        AUTH[NextAuth.js]
    end

    subgraph Database["Database Layer"]
        DZ[Drizzle ORM]
        PG[(PostgreSQL)]
    end

    subgraph External["External Services"]
        GO[Google OAuth]
    end

    UI --> Pages
    UI --> RC
    Pages --> API
    MW --> AUTH
    AUTH --> GO
    API --> DZ
    DZ --> PG
```

## Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant M as Middleware
    participant P as Page/API
    participant A as NextAuth
    participant D as Database
    participant G as Google

    U->>B: Visit /dashboard
    B->>M: Request
    M->>M: Check session cookie
    alt No session
        M->>B: Redirect to /login
        B->>U: Show login page
        U->>B: Click "Sign in with Google"
        B->>A: Initiate OAuth
        A->>G: Redirect to Google
        G->>U: Show consent screen
        U->>G: Approve
        G->>A: Return with code
        A->>A: Create session
        A->>B: Set cookie, redirect
    end
    M->>P: Allow request
    P->>D: Fetch data
    D->>P: Return data
    P->>B: Render page
    B->>U: Display dashboard
```

## Component Architecture

```mermaid
graph TD
    subgraph Layout["Root Layout"]
        HTML[html]
        BODY[body]
    end

    subgraph Pages["Pages"]
        subgraph Public["Public Routes"]
            LAND[Landing Page]
            LOGIN[Login Page]
        end

        subgraph Protected["Protected Routes /dashboard"]
            DLAYOUT[Dashboard Layout]
            DHOME[Home Values Page]
            DCOMP[Compare Page]
        end
    end

    subgraph Components["Shared Components"]
        BTN[Button]
        CARD[Card]
        CHART[LineChart]
    end

    HTML --> BODY
    BODY --> LAND
    BODY --> LOGIN
    BODY --> DLAYOUT
    DLAYOUT --> DHOME
    DLAYOUT --> DCOMP
    DHOME --> CARD
    DHOME --> CHART
    DCOMP --> CARD
    DCOMP --> CHART
    LAND --> BTN
    LAND --> CARD
```

## File Structure Details

```
src/
├── app/
│   ├── layout.tsx              # Root layout with Inter font
│   ├── page.tsx                # Landing page (server component)
│   ├── globals.css             # Tailwind CSS imports
│   ├── login/
│   │   └── page.tsx            # Login page (client component)
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── page.tsx            # Home values chart
│   │   └── compare/
│   │       └── page.tsx        # State comparison
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts    # NextAuth API handler
├── components/
│   └── ui/
│       ├── button.tsx          # Button with variants
│       └── card.tsx            # Card components
├── lib/
│   ├── utils.ts                # cn(), formatCurrency(), etc.
│   ├── auth/
│   │   ├── config.ts           # NextAuth configuration
│   │   └── index.ts            # Auth exports
│   └── db/
│       ├── schema.ts           # Drizzle schema
│       └── index.ts            # Database connection
└── middleware.ts               # Route protection
```

## State Management

The application uses minimal state management:

```mermaid
graph LR
    subgraph Server["Server State"]
        SS[Session - NextAuth]
        DB[Database - Drizzle]
    end

    subgraph Client["Client State"]
        RS[React useState]
        URL[URL State]
    end

    SS --> |"auth()"| RS
    DB --> |"API fetch"| RS
    RS --> |"Button clicks"| URL
```

| State Type | Location | Purpose |
|------------|----------|---------|
| Authentication | NextAuth Session | User identity, tokens |
| Selected State | useState | Currently selected state for chart |
| Comparison List | useState | States being compared |
| Chart Data | Static/API | ZHVI time series data |

## Error Handling

```mermaid
flowchart TD
    REQ[Request] --> MW{Middleware}
    MW -->|Unauthorized| R1[Redirect to /login]
    MW -->|Authorized| PAGE[Page Component]

    PAGE --> TRY{Try render}
    TRY -->|Success| RENDER[Render UI]
    TRY -->|Error| EB[Error Boundary]

    EB --> ERR[Error Page]

    API[API Call] --> APITRY{Try}
    APITRY -->|Success| JSON[Return JSON]
    APITRY -->|Error| APIERR[Return Error Response]
```

## Security Considerations

1. **Authentication**: Google OAuth via NextAuth.js
2. **Session**: HTTP-only cookies, signed with NEXTAUTH_SECRET
3. **Route Protection**: Middleware checks session before allowing access
4. **Environment Variables**: Secrets stored in `.env.local` (not committed)
5. **CSRF**: Built-in NextAuth CSRF protection
