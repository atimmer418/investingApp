# FRED-183 — Change AI chat to use token streaming via SSE

## Before
```
## FRED-183 — Change request/response for ai chat page to use token streaming via SSE
update the ai chat response endpoint to send token's via SSE and spring boot's flux streaming
```

## Summary
Convert the AI chat from a blocking `POST /api/chat` → full response to a streaming SSE endpoint. The response will stream tokens as they arrive from OpenAI, enabling a "typing" effect in the UI. Uses Spring's `SseEmitter` (or `Flux<String>` with `text/event-stream`) on the backend and `EventSource` on the frontend.

**Current:** `ChatController.java:32` — `@PostMapping` returns `ResponseEntity<ChatResponse>` (full response, blocks until done).

**Target:** New `@GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)` streaming endpoint; frontend connects via `EventSource` or custom SSE Observable and appends tokens to the message bubble as they arrive.

## Files
**Backend:**
- `backend/src/main/java/com/investingapp/backend/controller/ChatController.java` — add `@GetMapping("/stream")` endpoint with `produces = MediaType.TEXT_EVENT_STREAM_VALUE` returning `SseEmitter` or `Flux<String>`
- `backend/src/main/java/com/investingapp/backend/service/LLMService.java` — update `callOpenAI()` to use OpenAI's streaming API (`stream: true`); parse `data: [DONE]` + token deltas from the SSE response; callback or return as `Flux<String>`
- `backend/src/main/java/com/investingapp/backend/service/ChatService.java` — add `streamChat(ChatRequest)` method that builds the prompt and delegates to `LLMService` streaming

**Frontend:**
- `frontend/src/app/services/chat.service.ts` — add `streamChat(message)` method using `EventSource` (or `fetch` with `ReadableStream`) to connect to `GET /api/chat/stream?...` and emit tokens
- `frontend/src/app/pages/ai-chat/ai-chat.page.ts` — replace call to `sendMessage()` with `streamChat()`; append tokens to the current message bubble in real time
- `frontend/src/app/pages/ai-chat/ai-chat.page.html` — ensure the message bubble supports incremental text append (no change needed if it's data-bound)

## Doc References
- None — new integration pattern

## Acceptance Criteria
1. `GET /api/chat/stream` endpoint streams tokens as `text/event-stream` events.
2. OpenAI API called with `stream: true`; token deltas parsed from `data: {"choices":[{"delta":{"content":"..."}}]}` lines.
3. Frontend connects to the stream endpoint; each token appends to the current AI message bubble in real time.
4. Stream ends with a `data: [DONE]` event; frontend marks the message complete.
5. On error or stream timeout, frontend shows an error state (current error handling preserved).
6. Old `POST /api/chat` endpoint preserved (or deprecated with a comment) for fallback during transition.

## Edge Cases / Open Questions
- Spring Boot's `SseEmitter` requires a thread to complete it — use a virtual thread or `CompletableFuture` to avoid blocking the request thread while streaming.
- CORS headers must include `Access-Control-Allow-Origin` for SSE to work cross-origin (already set globally, but verify for SSE specifically).
- `EventSource` in Capacitor/WKWebView: test on real iPhone — WKWebView supports `EventSource` but behavior with JWT auth headers may differ; `EventSource` doesn't support custom headers, so the JWT must be passed as a query param or via an alternative approach (e.g. `fetch` with `ReadableStream`).
- Chat history: the streamed response must still be saved to the chat history table after streaming completes.
- Message ordering: if the user sends a second message before the first finishes streaming, handle gracefully (cancel first stream or queue).

## Time Estimate
`3hr+`

## Label
`[code]`
