# API Reference

## Overview

The application uses Next.js App Router API routes for backend functionality.

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

## Planned API Routes

### GET `/api/regions`

Get list of regions (to be implemented).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| level | string | Geography level filter |
| state | string | State abbreviation |
| limit | number | Max results (default 100) |

**Response:**
```json
{
  "regions": [
    {
      "regionId": "state_ca",
      "regionName": "California",
      "state": "CA",
      "geographyLevel": "State"
    }
  ]
}
```

### GET `/api/zhvi`

Get ZHVI time series data (to be implemented).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| regionId | string | Region identifier |
| startDate | string | Start date (YYYY-MM-DD) |
| endDate | string | End date (YYYY-MM-DD) |
| homeType | string | All Homes, Single Family, Condo |

**Response:**
```json
{
  "regionId": "state_ca",
  "regionName": "California",
  "data": [
    {
      "date": "2024-01-31",
      "value": 750000
    }
  ]
}
```

### GET `/api/zhvi/compare`

Compare multiple regions (to be implemented).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| regions | string[] | Array of region IDs |
| startDate | string | Start date |
| endDate | string | End date |

**Response:**
```json
{
  "regions": [
    {
      "regionId": "state_ca",
      "regionName": "California",
      "data": [...]
    },
    {
      "regionId": "state_tx",
      "regionName": "Texas",
      "data": [...]
    }
  ]
}
```

## Data Types

### Region

```typescript
interface Region {
  id: number;
  regionId: string;
  regionName: string;
  state: string | null;
  stateName: string | null;
  city: string | null;
  county: string | null;
  metro: string | null;
  geographyLevel: string;
  regionType: string | null;
  sizeRank: number | null;
}
```

### ZhviValue

```typescript
interface ZhviValue {
  id: number;
  regionId: string;
  date: string;  // ISO date
  value: number | null;
  geographyLevel: string;
  homeType: string;
  tier: string | null;
  bedrooms: number | null;
  smoothed: boolean;
  seasonallyAdjusted: boolean;
  frequency: string;
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
  message: string;
  statusCode: number;
}
```

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Not authorized |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

## Rate Limiting

Currently no rate limiting implemented. For production:

```typescript
// Recommended: Use Vercel's built-in rate limiting
// Or implement with upstash/ratelimit
```

## CORS

API routes are same-origin only (Next.js default). For external access, configure in `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
      ],
    },
  ];
}
```
