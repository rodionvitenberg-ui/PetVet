# ADR-0001: AI Chat — SSE Streaming for Real-time Responses

- **Status:** proposed
- **Date:** 2026-07-29
- **Deciders:** Rodion

## Context

The AI assistant was a single-request modal (`POST /api/ai/consult/` → JSON response). Users had to wait 5–30 seconds with a spinner before seeing any response. This was poor UX for a conversational feature.

We needed to rebuild it as a full chat experience: persistent sessions, message history, and real-time streaming of AI responses token-by-token.

## Decision

**Use Server-Sent Events (SSE) over a standard HTTP POST for streaming AI responses.**

### How it works

1. POST `/api/ai/sessions/{id}/stream/` with `{ query: "..." }` creates the user message, builds context, and opens an SSE stream.
2. Backend calls DeepSeek API with `stream: true` and pipes tokens through a `StreamingHttpResponse` with `Content-Type: text/event-stream`.
3. Frontend uses `fetch()` with `response.body.getReader()` to parse SSE events and append tokens to the chat UI in real time.
4. When streaming completes, the full AI message is saved to the database and a `{"done": true, "message_id": 42}` event is sent.

### Alternatives considered

| Alternative | Why rejected |
|---|---|
| **WebSocket** | Overkill for unidirectional streaming. Requires Daphne/Channels. Adds complexity for connection management. SSE is simpler. |
| **Polling** | Too much latency. Defeats the purpose of streaming UX. |
| **Full response only** | Already existed. Users complained about long waits with spinner. |

### Trade-offs

- SSE is unidirectional (server → client). Each user query requires a new POST request, which is fine for a chat where the user sends one message and gets one streaming response.
- Nginx must be configured with `proxy_buffering off` and `chunked_transfer_encoding on` for SSE to work in production.
- The client must handle reconnection if the SSE stream drops mid-response (current implementation: show error, user can retry).

## Consequences

- Real-time token-by-token UI feedback.
- Chat history is persisted in the database (`AIChatMessage` model) after streaming completes.
- No additional infrastructure (no Redis pub/sub, no Channels). Plain Django views with `StreamingHttpResponse`.