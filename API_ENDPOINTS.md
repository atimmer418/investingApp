# Investing App API Endpoints

This file documents all available API endpoints in the Investing App backend. When new endpoints are added, they should be documented here following the same format.

## Base URL
```
http://localhost:8080 (development)
https://your-production-domain.com (production)
```

---

## 1. Authentication & Authorization

### Auth Controller (`/api/auth`)

| Method | Endpoint                | Description                       | Auth Required | Request Body  | Response                |
|--------|-------------------------|-----------------------------------|---------------|---------------|-------------------------|
| `GET`  | `/api/auth/testuser`    | Test endpoint for user authentication | ✅            | None          | User details            |
| `POST` | `/api/auth/login`       | User login with credentials       | ❌            | LoginRequest  | JWT token + user info   |

### WebAuthn/Passkey Controller (`/api/passkey`)

| Method | Endpoint                        | Description                       | Auth Required | Request Body              | Response                |
|--------|---------------------------------|-----------------------------------|---------------|---------------------------|-------------------------|
| `POST` | `/api/passkey/register/start`   | Start passkey registration flow   | ❌            | RegistrationStartRequest  | Registration challenge  |
| `POST` | `/api/passkey/register/finish`  | Complete passkey registration     | ❌            | RegistrationFinishRequest | JWT token + user info   |

### Development Auth Controller (`/api/dev`)

| Method | Endpoint                        | Description                       | Auth Required | Request Body    | Response      |
|--------|---------------------------------|-----------------------------------|---------------|-----------------|---------------|
| `POST` | `/api/dev/authenticate-as-user` | Dev-only: Authenticate as any user | ❌ (Dev only) | User ID/Email   | JWT token     |
| `GET`  | `/api/dev/list-users`           | Dev-only: List all users         | ❌ (Dev only) | None            | User list     |

---

## 2. User Management

### User Controller (`/api/user`)

| Method | Endpoint               | Description                      | Auth Required | Request Body | Response            |
|--------|------------------------|----------------------------------|---------------|--------------|---------------------|
| `GET`  | `/api/user/progress`   | Get user's onboarding progress   | ✅            | None         | UserProgress object |

---

## 3. Investment Schedules

### Investment Schedule Controller (`/api/investment-schedule`)

| Method | Endpoint                                           | Description                           | Auth Required | Request Body                  | Response                        |
|--------|----------------------------------------------------|---------------------------------------|---------------|-------------------------------|---------------------------------|
| `POST` | `/api/investment-schedule/create`                  | Create or update investment schedule (upsert) | ✅            | CreateInvestmentScheduleRequest | InvestmentScheduleResponse      |
| `GET`  | `/api/investment-schedule/current`                 | Get user's current investment schedule | ✅            | None                          | InvestmentScheduleResponse      |
| `GET`  | `/api/investment-schedule/all`                     | Get all user's investment schedules   | ✅            | None                          | List<InvestmentScheduleResponse> |
| `POST` | `/api/investment-schedule/update-ach-request-id`   | Update ACH request ID for schedule    | ✅            | UpdateAchRequestIdRequest     | InvestmentScheduleResponse      |
| `POST` | `/api/investment-schedule/{scheduleId}/pause`      | Pause an investment schedule          | ✅            | None                          | InvestmentScheduleResponse      |
| `POST` | `/api/investment-schedule/{scheduleId}/resume`     | Resume a paused investment schedule   | ✅            | None                          | InvestmentScheduleResponse      |

**DTOs:**
- `CreateInvestmentScheduleRequest`: `{ monthlyAmount, frequency, targetPortfolio?, timeToFI? }`
- `UpdateAchRequestIdRequest`: `{ achRequestId, userEmail }`
- `InvestmentScheduleResponse`: `{ id, monthlyAmount, frequency, targetPortfolio, timeToFI, achRequestId, isPaused, createdAt, updatedAt }`

---

## 4. Banking & Plaid Integration

### Plaid Controller (`/api/plaid`)

| Method | Endpoint | Description | Authentication Required | Request Body | Response |
|--------|----------|-------------|------------------------|--------------|----------|
| `POST` | `/api/plaid/create_link_token` | Create Plaid link token for authenticated user | ✅ | None | LinkTokenResponse |
| `POST` | `/api/plaid/exchange_public_token` | Exchange public token for access token | ✅ | `{ public_token }` | Success/Error message |
| `GET` | `/api/plaid/user-data` | Get user's Plaid data | ✅ | None | User bank data |
| `GET` | `/api/plaid/access-token` | Get stored access token | ✅ | None | Access token info |
| `GET` | `/api/plaid/primary-bank-account` | Get user's primary bank account | ✅ | None | Bank account details |

---

## 5. Alpaca Trading Integration

### Alpaca Controller (`/api/alpaca`)

| Method | Endpoint | Description | Authentication Required | Request Body | Response |
|--------|----------|-------------|------------------------|--------------|----------|
| `GET` | `/api/alpaca/account` | Get Alpaca account details | ✅ | None | Account information |
| `POST` | `/api/alpaca/create-account` | Create new Alpaca account | ✅ | Account creation data | Account details |
| `GET` | `/api/alpaca/assets` | Get available trading assets | ✅ | None | List of assets |
| `POST` | `/api/alpaca/accounts/{accountId}/ach-relationships` | Create ACH relationship | ✅ | ACH relationship data | ACH relationship |
| `POST` | `/api/alpaca/accounts/{accountId}/ach-relationships/plaid` | Create ACH relationship via Plaid | ✅ | Plaid ACH data | ACH relationship |
| `GET` | `/api/alpaca/accounts/{accountId}/ach-relationships` | Get ACH relationships | ✅ | None | List of ACH relationships |
| `GET` | `/api/alpaca/account/{accountId}/status` | Get account status | ✅ | None | Account status |

---

## 6. System & Health

### Health Check Controller

| Method | Endpoint | Description | Authentication Required | Request Body | Response |
|--------|----------|-------------|------------------------|--------------|----------|
| `GET` | `/hello` | Basic health check endpoint | ❌ | None | "Hello World" |

### Apple App Site Association

| Method | Endpoint | Description | Authentication Required | Request Body | Response |
|--------|----------|-------------|------------------------|--------------|----------|
| `GET` | `/.well-known/apple-app-site-association` | Apple App Site Association for iOS | ❌ | None | JSON configuration |

---

## Authentication Notes

### JWT Token Usage
- Include JWT token in Authorization header: `Authorization: Bearer <token>`
- Tokens are obtained through login (`/api/auth/login`) or passkey registration completion
- Tokens are required for all endpoints marked with ✅

### Development Authentication
- Development endpoints (`/api/dev/*`) are only available in development environment
- Production environments should have these endpoints disabled

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "message": "Error description",
  "timestamp": "2025-09-22T10:30:00Z",
  "status": 400/401/403/404/500
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Adding New Endpoints

When adding new endpoints to this API:

1. **Update this documentation** with the new endpoint details
2. **Follow RESTful conventions**:
   - `GET` for retrieving data
   - `POST` for creating new resources
   - `PUT` for updating existing resources
   - `DELETE` for removing resources
3. **Include appropriate authentication** requirements
4. **Document request/response DTOs** with example JSON
5. **Add error handling** following the standard format
6. **Update frontend service methods** in `auth.service.ts` or create new service files

### Documentation Template for New Endpoints:

```markdown
| Method | Endpoint | Description | Authentication Required | Request Body | Response |
|--------|----------|-------------|------------------------|--------------|----------|
| `POST` | `/api/new-feature/action` | Description of what it does | ✅/❌ | RequestDTO | ResponseDTO |
```

**Example DTOs:**
- `RequestDTO`: `{ field1, field2, field3? }` (? indicates optional)
- `ResponseDTO`: `{ id, field1, field2, createdAt }`

---

*Last Updated: September 22, 2025*
*Total Endpoints: 25*