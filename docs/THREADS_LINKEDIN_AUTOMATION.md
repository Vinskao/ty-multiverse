# Threads + LinkedIn publishing workflow

Checked: 2026-10-29. This is the implementation and handoff contract for the requested `birch_investments` publishing schedule. The existing ChatGPT task was updated on 2026-10-29 to draft for Threads and LinkedIn (`tianyi-kao`) while preserving its current weekly schedule. The task is shown as active, but its prompt requires valid provider connections, account verification, and per-platform outbox claims; no post or API authorization was performed.

## Keep three identities separate

1. **Keycloak SSO** authenticates Tianyi to TY Multiverse's own admin/review pages. It does not authenticate to Threads or LinkedIn and cannot grant those services permission to publish.
2. **Threads OAuth** is granted by the owner of the Threads profile through a Meta Developer app configured for the Threads API. Meta's maintained collection documents OAuth code exchange, long-lived token exchange, creating a post container, and publishing it. The live developer docs should be checked again when implementing because Meta changes API versions and permissions.
3. **LinkedIn member OAuth** must be granted by the owner of `https://www.linkedin.com/in/tianyi-kao/`. LinkedIn documents `w_member_social` for publishing as the authorized member. Keep this separate from Keycloak and from Threads OAuth.

## Scheduled task capability boundary

ChatGPT Scheduled Tasks can run recurring work, but current OpenAI documentation says scheduled tasks do not support custom GPTs. Event-triggered scheduled tasks currently list Gmail, Slack, and GitHub activity; Threads and LinkedIn are not listed as event sources. ChatGPT Work's cloud browser can interact with supported signed-in sites, but may pause for sign-in or confirmation and is not a reliable unattended publishing API. Therefore do not describe a ChatGPT task as an already-configured Threads/LinkedIn auto-publisher.

Use the TY Multiverse backend/consumer for event-triggered and weekly/biweekly publishing. A ChatGPT scheduled task may still produce research drafts or reminders, but persistent publishing should run in the site's service with server-side Meta and LinkedIn authorization.

## Workflow

```text
new related research report / filing / earnings or investor meeting
                    OR
weekly/biweekly Taiwan-stock research refresh
                    ↓
source-backed research object (claims, evidence URLs, thesis, invalidation conditions)
                    ↓
LLM drafts two channel-specific versions from the same approved facts
          ↙                                  ↘
Threads concise current take                LinkedIn fuller professional analysis
          ↘                                  ↙
                   pending review
       Maya Sawa Telegram bot + website (Keycloak SSO)
                    ↓ owner approves / edits / rejects
        separate Threads publisher + LinkedIn publisher
                    ↓
provider post IDs, URLs, timestamps, and errors saved per channel
```

## Pending review behavior

- Every generated post starts as `pending`; never publish a model draft automatically.
- Telegram notification includes source report/event, concise preview, evidence links, and actions: approve both, approve one platform, edit, reject, or defer.
- Approval is tied to an immutable draft version and an explicit platform selection. Editing invalidates the prior approval.
- If a provider token expires, the post returns to `pending_auth` and the bot notifies the owner. Do not fall back to browser-password automation.
- Save each channel's state independently (`pending`, `approved`, `publishing`, `published`, `failed`, `pending_auth`) to avoid duplicate posts when one platform succeeds and the other fails.
- Use idempotency/duplicate detection keyed by source event + draft version + platform. Store the provider post ID and canonical URL after publication.
- Keep an audit record of source, model output, human edits, approver, timestamps, API response status, and retries.
- No performance promises, investment recommendation language, fabricated claims, or unsupported material. Include the site's intended disclosure for investment content and link to primary research where possible.

## Credentials and access

- Meta Threads OAuth scopes must be selected from the current official Threads permission docs for the functions actually used (minimum: publishing and basic profile identity). Meta App Review/test-user rules must be checked before production use.
- LinkedIn uses member OAuth with `w_member_social` for personal-profile posting. Use only the member-post endpoints needed for publishing; avoid organization permissions and read scopes unless separately required.
- Store both platform client secrets and user tokens only on the backend in Kubernetes Secrets or the configured secret manager. Never put credentials in `index.astro`, browser storage, the ChatGPT prompt, Telegram messages, a ConfigMap, or Git.
- Keycloak roles control access to TY Multiverse review UI; provider tokens are separate external grants and must be revocable independently.
- Reauthorization should be owner-driven and use each provider's OAuth consent screen. Do not collect social passwords.

## Implementation order

1. Verify whether the existing ChatGPT schedule is a ChatGPT task or a TY Multiverse backend task. This workspace currently contains notification UI but no Threads/LinkedIn publisher implementation.
2. Add a durable event record for relevant uploads, filings, earnings releases, and Taiwan-stock refreshes. Link a report to its affected stock(s) before drafting.
3. Add a bilingual/Traditional Chinese editorial schema and separate channel adapters. Require source references and an invalidation condition in the underlying research object.
4. Add a pending-review store/API and Telegram callbacks; make approval and rejection auditable.
5. Configure Meta Threads and LinkedIn OAuth apps, callback URLs, exact minimum scopes, token storage, expiry refresh, and revoke procedure.
6. Publish only after approval; log per-platform results and test partial failure/retry behavior.
7. Run a manual test draft, get owner approval, and only then enable recurring/event triggers.

## Owner's known channel and intent

- Threads/Instagram handle: `birch_investments`.
- LinkedIn member page: `https://www.linkedin.com/in/tianyi-kao/`.
- Topics: current macro/AI research and event-linked individual-stock analysis. Post when a related report, filing, earnings release, or investor meeting adds material information; also prepare a weekly or biweekly Taiwan-only portfolio review. Keep human approval pending until the owner authorizes a post.

## Draft task instructions

Use this as the research/drafting portion of a scheduled task or backend consumer prompt. It does not authorize publication by itself:

> Review newly available, source-linked macro/AI research and material filings or earnings/investor-meeting releases related to the owner's Taiwan holdings. If nothing material changed, say so and do not create filler. Otherwise prepare a concise Traditional Chinese research note with the source, publication date, key evidence, what changed, portfolio relevance, and what evidence would invalidate the view. Produce two distinct draft posts from the verified facts: (1) a concise Threads post for `birch_investments`; (2) a fuller professional LinkedIn post for Tianyi Kao's member profile, with a clear source link and no unsupported performance claims. Return both as `pending` for owner review through Maya Sawa Telegram / the Keycloak-protected website. Never publish or imply approval. For weekly/biweekly portfolio reviews, cover Taiwan-listed holdings only.

For an actual recurring publisher, let the application scheduler invoke this prompt for each material report/event and the weekly/biweekly Taiwan refresh. The ChatGPT Scheduled Tasks feature may be used for research reminders/drafts, but it cannot replace the two provider OAuth integrations and reviewed publisher described above.

## Official references

- OpenAI Help Center, [Scheduled tasks in ChatGPT](https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt): scheduled task capabilities, supported event apps, and limits.
- OpenAI Help Center, [Using cloud browser in ChatGPT](https://help.openai.com/en/articles/20001280-using-cloud-browser-in-chatgpt): separate sign-in session, pauses, and confirmation flow.
- Meta's maintained Postman collection, [Threads API](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api): OAuth token flow and publishing requests. The Meta Developer docs should be checked at implementation time for current permission review requirements.
- LinkedIn, [Getting Access to LinkedIn APIs](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access): OAuth and `w_member_social` access.
- LinkedIn, [Share on LinkedIn](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin): member authorization and post creation.
