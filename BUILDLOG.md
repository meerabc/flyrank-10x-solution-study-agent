# Build Log

## How this was built

Every design decision was discussed and reasoned through before writing
code. AI wrote the code after each decision, and every command was run
and verified manually. This project reuses proven ingestion and
extraction logic from an earlier personal agent project, then wraps it in
a real backend with authentication, caching, and background processing.

## Real issues found and fixed

**Payload size limit.** Base64-encoded file uploads exceeded Express's
default 100kb body limit. Fixed by raising the limit to 20mb and adding a
dedicated error handler that returns clean JSON instead of Express's
default HTML error page on oversized payloads.

**Invalid cache hits on failed processing.** The original caching check
matched on file hash alone, so a previously failed processing attempt
could be served back as if it had succeeded. Fixed by requiring
`status === 'done'` before treating a match as a valid cache hit, and
covered with an automated test.

**Rate limit pacing miscalculated.** Gemini's free tier limit is 15
requests per minute. The initial pacing (3 seconds between calls, 2 calls
per unit) allowed roughly 20 calls per minute, above the limit, and
caused repeated failures on real multi-page files. Fixed by increasing
pacing to 10 seconds between calls and adding retry logic that reads the
retry delay from Google's own error response and retries up to 4 times
before failing. Verified end to end on a real 40 page academic PDF,
which completed successfully in under 6 minutes with zero failures.

**Weak spot ranking was inverted.** The SQL sort order for prioritizing
concepts a user got wrong was backwards, and ties on wrong ratio had no
tiebreaker, so the same concept could rank first regardless of which
question was actually answered incorrectly. Fixed by correcting the sort
direction and adding a most-recently-wrong tiebreaker for ties. This was
caught by manually testing the full pipeline end to end rather than
trusting the individual pieces in isolation, and it was a genuine gap:
the feature had never actually been exercised through the real API
before this check.

## Where the design differs from the FL-06 style spec

Authentication was kept even though the tool is primarily for personal
use, since the API is genuinely multi-tenant capable and the concept is
one of the program's core backend patterns. Background jobs run in
process rather than through a dedicated queue (BullMQ, Redis), a
deliberate scope decision appropriate for a single server instance; a
version serving many concurrent users would need a real queue.

## AI cost and grounding

Google Gemini API, free tier, no cost incurred. Rate limits were hit and
handled directly rather than avoided, both through corrected pacing and
automatic retry with the delay Google's API specifies.