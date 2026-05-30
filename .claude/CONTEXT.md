# Current Project

## What we are building
We are building FRED. FRED is an iOS app (built with Ionic + Angular) that helps everyday people
get into long-term investing so they can leave the corporate world behind earlier.
The philosophy is simple: long-term investing, financial freedom, as early as possible.

## What a Successful Output Looks Like
A good Claude Code output for FRED passes four tests before it ships:

### 1. It looks and feels like the FRED app
FRED has a specific visual identity: calm, minimal, premium. Think iOS-native done right — not a generic mobile UI.
Before writing code, internalize:
- **Typography**: System fonts used correctly. Hierarchy is clear: large, confident headings; small, restrained body copy. Nothing is cluttered.
- **Color**: The FRED palette only. No ad-hoc grays, no improvised accent colors. If a color isn't in the design system, don't use it.
- **Spacing**: Generous. FRED doesn't cram. Use the established spacing scale — don't eyeball it.
- **Motion**: Purposeful and subtle. Transitions should feel like iOS, not a web app. Nothing bounces that shouldn't bounce.
- **Tone in copy**: Calm. Direct. Freedom-focused. Never pushy. If a button label feels urgent or salesy, rewrite it.
Reference existing screens before adding new UI. A new component should be indistinguishable from a native one.

### 2. It fits the existing codebase
Don't invent new patterns when one already exists.
- **Angular/Ionic**: Follow the established component and module structure. New components belong in the right feature folder, not at the root.
- **Spring Boot**: New endpoints follow existing controller/service/repository layering. No logic in controllers.
- **Naming**: Match existing conventions exactly — file names, class names, variable names, API route naming.
- **State management**: Use the established approach. Don't introduce a new pattern for one screen.
- **Error handling**: Mirror how errors are already handled elsewhere in the stack (HTTP status codes, error DTOs, UI error states).
If you're unsure whether a pattern exists, look for it in adjacent files before creating something new.

### 3. It handles the unhappy path
FRED touches real money and real user data. Edge cases aren't optional.
Before marking any task complete, verify:
- **Empty states**: What does the UI show with no data? Is it designed, or just blank?
- **Loading states**: Every async operation has a loading indicator.
- **Error states**: Network failures, API errors, and validation failures all surface useful feedback to the user — not a raw error string.
- **Boundary inputs**: Zero values, max values, malformed inputs, null/undefined where a value is expected.
- **Auth edge cases**: Expired sessions, failed passkey auth, incomplete onboarding flows.
- **Race conditions**: Tapping submit twice. Navigating away during a pending request. Returning to a screen mid-flow.
If an edge case breaks the user experience, it's a bug — even if the happy path works perfectly.

### 4. It doesn't create new debt
- No `TODO` comments left in shipped code unless explicitly flagged for follow-up.
- No dead code (commented-out blocks, unused imports, orphaned files).
- No hardcoded strings that should be constants or config values.
- No secrets, tokens, or environment-specific values committed.
- New API surface has at least minimal inline documentation.

**The bar**: A successful output is one that could be reviewed by a senior iOS/fintech engineer and passed without a "why did you do it this way?" comment.

## What to Avoid
- **Inventing patterns**: If a convention exists in the codebase, use it. Don't introduce a new approach for one screen.
- **Unsolicited refactors**: Fix what was asked. Don't restructure unrelated code mid-task.
- **Filler UI**: Placeholder text, hardcoded mock data, or blank states that aren't designed.
- **Generic copy**: No "Click here", "Submit", "Error occurred". FRED's voice is calm and specific.
- **Over-engineering**: Solve the problem in front of you. Don't build for hypothetical future requirements.
- **Skipping the unhappy path**: A feature isn't done if only the happy path works.
- **Breaking existing tests**: If a change causes test failures, fix them — don't delete or skip them.
- **Leaking concerns**: No business logic in controllers, no UI logic in services, no raw SQL outside repositories.
- **Committing secrets**: No API keys, tokens, or env-specific values in code — ever.

---

## App Tech Stack
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

### Periodic Review
Every ~10 stories, re-read `.claude/agents/*.md` and ask: which Hard Rule has never triggered? Which tool has never been used? Which step is the model now smart enough to skip? Prune ruthlessly. Also promote any accumulated items in `.claude/agent-memory/findings.md` into the relevant sections of CONTEXT.md.