# FRED — Project Context

## What This App Does
FRED is an iOS app (built with Ionic + Angular) that helps everyday people
get into long-term investing so they can leave the corporate world behind earlier.
The philosophy is simple: long-term investing, financial freedom, as early as possible.

## Stack
- **Backend:** Java Spring Boot
- **Frontend:** Angular + Ionic (deployed as iOS app)
- **Database:** MySQL
- **Auth:** Yubico passkeys + JWT
- **Hosting:** Dev backend on Railway (Railway MCP integration coming soon)

## Project Structure
```
/backend    — Spring Boot API
/frontend   — Angular + Ionic iOS app
/FREDdocs   — Internal documentation
```

## Key Domain Concepts
- **FRED** is the product name, not an acronym — refer to it as FRED
- Core philosophy: long-term investing + financial freedom as early as possible
- Keep language simple and human — this app is for people who aren't finance experts

---

## API Rules (from FREDdocs/API_ENDPOINTS)
- Base URL dev: `http://localhost:8080` / Cloudflare tunnel: `https://local.fredvested.com`
- All authenticated endpoints require `Authorization: Bearer <token>` header
- Do not invent new endpoints — check the full table in `FREDdocs/API_ENDPOINTS.md` first
- `/api/dev/*` endpoints are dev-only and must not be called in production code
- Key endpoint groups: `/api/auth`, `/api/passkey`, `/api/user`, `/api/investment-schedule`, `/api/investments`, `/api/portfolio`, `/api/plaid`, `/api/alpaca`, `/api/trading`, `/api/beneficiaries`, `/api/user/pin`, `/api/chat`, `/api/documents`, `/api/monthly-freedom-update`

## Auth Rules (from FREDdocs/AUTHENTICATION_AND_JWT)
- Primary auth is passkey (WebAuthn/biometric) — usernameless, no email needed to log in
- JWT tokens: 1-hour expiry, HS512-signed. Frontend refreshes proactively (every 60s check, refresh if active + ≤30 min left)
- Token storage: 4 localStorage keys — `jwtToken`, `jwtExpiration`, `userId`, `userEmail`
- Use `JwtTokenUtils` for all token operations — never read/write localStorage keys directly
- Lock screen appears on token expiry; passkey re-auth (no JWT required) issues a fresh token
- Step-up auth (disabled by default, users have option to enable which prompts them to make a 4-digit pin) used for: withdrawals, lump-sum trades, account settings, tax documents
- Passkey auth is required for changing email
- Do NOT modify auth or JWT logic without explicitly being asked

---

## Running Locally (from .claude/launch.json)
- **Frontend:** `servlocal` on port 8100
- **Backend:** `./gradlew bootRun` with `SPRING_PROFILES_ACTIVE=local` on port 8080

---

## Backend Conventions

### Package Structure
```
backend/src/main/java/com/investingapp/backend/
├── controller/     — REST endpoints (@RestController)
├── service/        — Business logic (@Service)
├── repository/     — JPA interfaces (@Repository)
├── dto/            — Request/Response DTOs
├── model/          — JPA entities
├── scheduler/      — Scheduled tasks
├── security/       — Auth, JWT filter, UserDetailsImpl
└── util/           — Utilities
```

### DTOs
- Naming: `{Domain}{Action}Request` / `{Domain}{Action}Response` / `{Domain}DTO`
- Use Lombok: `@Data`, `@AllArgsConstructor`, `@NoArgsConstructor`
- Use Jakarta validation: `@NotBlank`, `@Email`, `@Valid`, `@DecimalMin`, etc.
- Response DTOs may have a constructor that accepts the entity (e.g., `new PortfolioResponse(portfolio)`)

### Controllers
- `@CrossOrigin(origins = "*", maxAge = 3600)` on every controller
- `@RestController` + `@RequestMapping("/api/{domain}")`
- Constructor injection via `@Autowired`
- Return `ResponseEntity<?>` with appropriate HTTP status
- Use `MessageResponse` for generic success/error messages
- Get current user via `SecurityContextHolder`:
  ```java
  Authentication auth = SecurityContextHolder.getContext().getAuthentication();
  UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
  User user = userRepository.findById(userDetails.getId()).orElse(null);
  ```
- Error handling: `try/catch` with logging via SLF4J `Logger`

### Services
- `@Service` annotation
- `@Transactional` for writes, `@Transactional(readOnly = true)` for reads
- `Logger logger = LoggerFactory.getLogger(XxxService.class)` for logging
- Receive `User` object from controller rather than resolving it again

### Repositories
- Extend `JpaRepository<Entity, Long>`
- Spring Data naming conventions for finders (`findByEmail`, `existsByEmail`)
- `@Query` + `@Param` for complex queries
- Return `Optional<T>` for single entities, `List<T>` for multiple

---

## Frontend Conventions

### File/Folder Structure
```
frontend/src/app/
├── services/          — HTTP + state services (singleton, providedIn: 'root')
├── pages/             — Full-screen routed pages (*.page.ts)
├── components/        — Reusable sub-components (*.component.ts)
├── models/            — TypeScript interfaces
├── utils/             — Standalone utilities (e.g., jwt-token.utils.ts)
├── tab1/, tab2/, tab3/ — Tab pages
└── tabs/              — Tab container
```

### Services
- `@Injectable({ providedIn: 'root' })` — app-wide singletons
- Return `Observable<T>` from HttpClient calls
- Auth headers pattern:
  ```typescript
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${JwtTokenUtils.getValidJwtToken()}`,
      'Content-Type': 'application/json'
    });
  }
  ```
- State shared via `BehaviorSubject` + exposed as `.asObservable()`
- Error handling via `catchError()` RxJS operator

### Components & Pages
- Standalone components: `standalone: true` + explicit `imports: [IonXxx, ...]`
- Ionic components from `@ionic/angular/standalone`
- Use `OnInit` for data loading, `OnDestroy` + `destroy$ = new Subject<void>()` for cleanup
- Auto-unsubscribe: `takeUntil(this.destroy$)` on subscriptions
- Navigation: `Router.navigateByUrl()` with `{ replaceUrl: true }` to prevent back-button issues
- Modals via `ModalController`, loaders via `LoadingController`, toasts via `ToastService`

### Auth in Frontend
- Always use `JwtTokenUtils` static methods — never read localStorage JWT keys directly
- `JwtTokenUtils.getValidJwtToken()` — returns token or null (non-destructive)
- `JwtTokenUtils.clearJwtData()` — explicit logout/clear
- `AppLockService` handles all token refresh and expiry logic — don't duplicate this

---

## Conventions — General
- **No tests** — there are none; don't add test files unless asked
- **Branches:** `feature/xxx`, `fix/xxx`, `chore/xxx`
- Do not change database schema without flagging it to the user first
- Prefer extending existing patterns over introducing new ones

---

## Hard Rules
- Do not modify auth logic without explicitly being asked
- Do not invent new API endpoints — check `FREDdocs/API_ENDPOINTS.md` first
- Do not change database schema without flagging it first
- Do not read/write JWT localStorage keys directly — use `JwtTokenUtils`
- Never call `/api/dev/*` endpoints from production code paths

---

## Role & Workflow
You are an expert AI software engineer working inside this repository.
Prioritize correctness, clarity, and minimal changes.

---

## Agents

### How They Work
- **builder_agent** — implements the change
- **verifier_agent** — reviews what the builder built for correctness, safety, and completeness

### When to Spawn Them
Spawn agents automatically for non-trivial tasks:
1. Spawn `builder_agent` to implement the change
2. After builder completes, spawn `verifier_agent` to review it
3. User can also orchestrate agents manually if needed

For simple, targeted edits (single file, obvious change) you may implement directly without agents.
