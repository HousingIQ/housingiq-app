# API Reference

## Overview

The application uses Next.js App Router API routes for backend functionality. All routes are under `src/app/api/`.

## Authentication Endpoints

### GET/POST `/api/auth/[...nextauth]`

NextAuth.js handles all authentication routes:

| Path | Method | Description |
|------|--------|-------------|
| `/api/auth/signin` | GET | Sign-in page |
| `/api/auth/signout` | POST | Sign out |
| `/api/auth/callback/google` | GET | OAuth callback |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/csrf` | GET | Get CSRF token |

### POST `/api/auth/signup`

Create a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "password": "password123"
}
```

**Validation:**
- Email must be valid format
- Password must be 8+ characters
- Email must not already exist

**Response (201):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Error (409):** Email already exists

---

## Market Data Endpoints

### GET `/api/market/all`

Returns all market summary records for a given geography level.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| geographyLevel | string | `State` | Filter by geography level (State/Metro/County/City) |

**Response:**
```json
{
  "data": [
    {
      "regionId": "state_ca",
      "regionName": "California",
      "displayName": "California",
      "stateCode": "CA",
      "stateName": "California",
      "currentHomeValue": 750000,
      "homeValueYoyPct": 5.2,
      "homeValueMomPct": 0.3,
      "marketClassification": "Warm"
    }
  ]
}
```

### GET `/api/market/stats`

Returns platform-wide statistics for the dashboard.

**Response:**
```json
{
  "regionCounts": {
    "State": 51,
    "Metro": 100,
    "County": 100,
    "City": 200
  },
  "latestHomeValueDate": "2025-12-31",
  "latestRentValueDate": "2025-12-31",
  "marketHealth": {
    "Hot": 15,
    "Warm": 25,
    "Cold": 11
  },
  "totalRegions": 451
}
```

### GET `/api/market/[regionId]`

Returns a single market summary record.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| regionId | string | Region identifier (e.g., `state_ca`) |

**Response (200):** Single market summary object with all fields from `app.market_summary`.

**Error (404):** Region not found.

### GET `/api/market/[regionId]/trends`

Returns ZHVI time series for a region.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| homeType | string | `All Homes` | Home type filter |
| tier | string | `Mid-Tier` | Price tier filter |
| months | number | `36` | Time range (12/36/60) |

**Response:**
```json
[
  {
    "date": "2024-01-31",
    "homeValue": 750000,
    "momChangePct": 0.3
  }
]
```

### GET `/api/market/[regionId]/bedrooms`

Returns ZHVI breakdown by bedroom count (1-5+).

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| months | number | `36` | Time range |

**Response:**
```json
{
  "trends": [
    {
      "date": "2024-01-31",
      "1br": 350000,
      "2br": 450000,
      "3br": 550000,
      "4br": 650000,
      "5br": 750000
    }
  ],
  "stats": [
    {
      "bedrooms": 3,
      "currentValue": 550000,
      "yoyChangePct": 4.2,
      "color": "#3b82f6"
    }
  ]
}
```

### GET `/api/market/[regionId]/property-types`

Returns ZHVI breakdown by property type.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| months | number | `36` | Time range |

**Response:**
```json
{
  "trends": [
    {
      "date": "2024-01-31",
      "singleFamily": 600000,
      "condo": 450000,
      "allHomes": 550000
    }
  ],
  "stats": [
    {
      "propertyType": "Single Family",
      "currentValue": 600000,
      "yoyChangePct": 5.1
    }
  ]
}
```

### GET `/api/market/compare`

Multi-region comparison with time series data.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| regions | string | required | Comma-separated region IDs (up to 8) |
| homeType | string | `All Homes` | Home type filter |
| tier | string | `Mid-Tier` | Price tier filter |
| months | number | `36` | Time range (12/36/60/120) |

**Response:**
```json
{
  "regions": [
    {
      "regionId": "state_ca",
      "regionName": "California",
      "currentHomeValue": 750000,
      "homeValueYoyPct": 5.2,
      "currentRentValue": 2800,
      "marketClassification": "Warm",
      "color": "#3b82f6",
      "trends": [
        { "date": "2024-01-31", "value": 740000 }
      ]
    }
  ]
}
```

### GET `/api/market/rankings`

Returns sorted market rankings.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| sortBy | string | `homeValueYoyPct` | Sort field (homeValueYoyPct/rentYoyPct/grossRentYieldPct/priceToRentRatio/currentHomeValue/currentRentValue) |
| order | string | `desc` | Sort order (asc/desc) |
| geographyLevel | string | `State` | Geography level (State/Metro/City) |
| limit | number | `50` | Max results (max 100) |

**Response:**
```json
{
  "data": [
    {
      "regionId": "state_nv",
      "regionName": "Nevada",
      "displayName": "Nevada",
      "currentHomeValue": 420000,
      "homeValueYoyPct": 12.5,
      "currentRentValue": 1800,
      "rentYoyPct": 6.1,
      "grossRentYieldPct": 5.1,
      "priceToRentRatio": 19.4,
      "marketClassification": "Hot"
    }
  ]
}
```

---

## Region Endpoints

### GET `/api/regions/search`

Region search with typeahead support.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| q | string | - | Search query (min 2 chars) |
| level | string | - | Geography level filter |
| limit | number | `15` | Max results (max 50) |

**Behavior:**
- When query provided: searches by region name (ILIKE)
- When no query but level specified: returns top regions by size_rank
- Default search scope: State, Metro, National only
- Results ordered by geography level priority, then size rank

**Response:**
```json
{
  "regions": [
    {
      "regionId": "metro_12420",
      "regionName": "Austin-Round Rock-Georgetown, TX",
      "displayName": "Austin-Round Rock-Georgetown, TX",
      "geographyLevel": "Metro",
      "state": "TX",
      "sizeRank": 29
    }
  ]
}
```

---

## AI Chat Endpoints

### POST `/api/chat`

Streaming AI chat endpoint. **Requires authentication.**

Rate limited to 20 requests per hour per user (Upstash sliding window).

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "What are the hottest housing markets?" }
  ],
  "selectedChatModel": "openai/gpt-5.2"
}
```

**Available Models:**
| Model ID | Label |
|----------|-------|
| `openai/gpt-5.2` | GPT 5.2 (default) |
| `anthropic/claude-haiku-4.5` | Claude Haiku 4.5 |
| `google/gemini-3-flash` | Gemini 3 Flash |
| `anthropic/claude-3.7-sonnet-thinking` | Claude 3.7 Sonnet (with reasoning) |

**Response:** Server-Sent Events (SSE) stream with text chunks and token usage metadata.

**Error (429):** Rate limit exceeded (includes reset time).

**System Prompt:** The AI is configured as a housing analytics assistant for HousingIQ, helping users understand housing market trends, home values (ZHVI), and market data.

### GET `/api/chat/usage`

Returns rate limit status for the current user. **Requires authentication.**

**Response:**
```json
{
  "remaining": 17,
  "limit": 20,
  "resetAt": "2025-01-15T15:30:00.000Z"
}
```

---

## Data Types

### MarketSummary

```typescript
interface MarketSummary {
  regionId: string;
  regionName: string;
  displayName: string;
  geographyLevel: string;
  stateCode: string | null;
  stateName: string | null;
  metro: string | null;
  sizeRank: number | null;
  currentHomeValue: number | null;
  homeValueYoyPct: number | null;
  homeValueMomPct: number | null;
  homeValueDate: string | null;
  currentRentValue: number | null;
  rentYoyPct: number | null;
  rentMomPct: number | null;
  rentValueDate: string | null;
  priceToRentRatio: number | null;
  grossRentYieldPct: number | null;
  marketClassification: string | null;  // 'Hot' | 'Warm' | 'Cold'
}
```

### Region

```typescript
interface Region {
  regionId: string;
  regionName: string;
  displayName: string | null;
  geographyLevel: string;
  state: string | null;
  stateName: string | null;
  city: string | null;
  county: string | null;
  metro: string | null;
  sizeRank: number | null;
}
```

### Session

```typescript
interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
  };
  expires: string;
}
```

## Error Responses

```typescript
interface ErrorResponse {
  error: string;
  message?: string;
}
```

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Not authenticated (chat endpoints) |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded (chat) |
| 500 | Internal Server Error |

## Rate Limiting

The AI chat endpoint (`/api/chat`) uses Upstash Redis with a sliding window rate limiter:
- **Limit**: 20 requests per hour per authenticated user
- **Key prefix**: `housingiq:chat`
- **Backend**: Upstash Redis (serverless)

Market data endpoints do not have rate limiting.

## CORS

API routes are same-origin only (Next.js default). All API calls are made from the same Next.js application.
