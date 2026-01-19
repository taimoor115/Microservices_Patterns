# Strangler Fig Pattern (Microservices)

A production-grade guide to safely modernizing a legacy monolith into microservices **without a rewrite cliff**.

This document focuses on the *mechanics* of real migrations: routing control, correctness, data ownership, observability, and rollback. It assumes you’re already fluent in REST, microservices, and gateway-based architectures.

---

## 1. Introduction

### What is the Strangler Fig Pattern

The **Strangler Fig Pattern** is an incremental migration approach where you:

- Put a **routing layer** (often an **API Gateway / reverse proxy**) in front of a **legacy monolith**.
- Gradually **extract features** (vertical slices) into new services.
- **Route traffic** to the new services feature-by-feature, cohort-by-cohort.
- Eventually **decommission** the legacy monolith once it serves no production traffic.

The defining trait is *operational continuity*: the system keeps serving users throughout the migration.

### Simple real-world analogy (tree/plant analogy)

A strangler fig plant grows around a host tree:

1. It starts small, using the host tree for support.
2. It expands and forms a stronger outer structure.
3. Over time, the host tree becomes irrelevant (and may die), while the fig remains.

In software:

- The **host tree** = your **legacy monolith**.
- The **fig** = the set of **new services + gateway routing**.
- The **growth** = progressive replacement of legacy capabilities.

### High-level summary

At a high level, you’re converting “one big irreversible migration” into “many small reversible releases.”

That creates three practical benefits:

- **Risk isolation**: failures are scoped to a small set of routes/capabilities.
- **Continuous delivery**: product work continues while modernization proceeds.
- **Measurable progress**: monolith traffic trends down; service traffic trends up.

---

## 2. Why the Strangler Fig Pattern Exists

### Problems with legacy monoliths

Most legacy monoliths aren’t “bad.” They’re successful systems that accumulated complexity.

Typical pain points:

- **Change amplification**: a small feature change touches many modules.
- **Slow and risky releases**: deployments are high-stakes events.
- **Tight coupling to infrastructure**: old libraries, runtimes, OS dependencies.
- **Low observability**: incidents are hard to debug; root cause analysis is slow.
- **Scaling inefficiency**: you scale the entire app to scale one hotspot.
- **Team contention**: many teams in one repo → coordination overhead and merge pain.

### Why big-bang rewrites fail

Big-bang rewrites typically fail for non-technical reasons:

- **The monolith is the spec**: real behavior lives in production quirks, not in docs.
- **Hidden edge cases**: domain exceptions, data anomalies, implicit invariants.
- **Long timelines**: business priorities change mid-rewrite.
- **Delayed validation**: you learn the rewrite is wrong very late.
- **Single cutover blast radius**: one day concentrates maximum risk.

### Business and technical risks this pattern solves

The Strangler Fig Pattern reduces:

- **Delivery risk**: ship in small increments; rollback quickly.
- **Operational risk**: canary releases limit blast radius.
- **Financial risk**: value is delivered early; investment is incremental.
- **Reputation risk**: avoids “migration day outages.”

---

## 3. Historical & Book-Based Perspective

The Strangler Fig Pattern is widely referenced in modernization literature and strongly associated with **Martin Fowler**.

### Martin Fowler’s explanation of the Strangler Fig Pattern

Fowler’s description (paraphrased) emphasizes:

- Introduce a **facade** (often a gateway/proxy) in front of the legacy system.
- Build new functionality outside the legacy system.
- Slowly **redirect** requests until the legacy system is obsolete.

The core insight: modernization becomes routing + incremental replacement rather than a rewrite.

### Key ideas from books and literature

#### "Refactoring" – Martin Fowler

What it contributes to strangler migrations:

- **Characterization tests**: capture existing behavior before changing it.
- **Small steps**: behavior-preserving changes reduce risk.
- **Seams first**: refactor to create safe extraction points.

Real-world emphasis: before you can extract a capability, you often need to refactor the monolith to *make a boundary exist*.

#### "Patterns of Enterprise Application Architecture"

What it contributes:

- Boundary patterns: **Facade**, **Gateway**, **Anti-Corruption Layer**.
- Clear separation of concerns and integration strategies.
- A strong reminder that **transaction boundaries** and **consistency** dominate complexity during decomposition.

Real-world emphasis: you don’t migrate “code,” you migrate **behavior + data responsibilities**.

#### "Building Microservices" – Sam Newman

What it emphasizes:

- Migration is as much about an **operating model** as architecture.
- Avoid building a **distributed monolith**.
- Invest early in:
  - Observability
  - Deployment automation
  - Resilience patterns

Real-world emphasis: the gateway makes routing possible, but engineering discipline makes it safe.

#### "Monolith to Microservices"

What it emphasizes:

- Start from **business goals**, not from ideology.
- Use incremental patterns (Strangler, Branch by Abstraction, Parallel Run).
- Measure outcomes throughout the journey.

Real-world emphasis: a modernization program should behave like a product roadmap with incremental value.

---

## 4. Real-World Usage (Industry Examples)

Below are realistic sequences teams use (not theoretical idealizations). The exact order varies, but the strategy remains: start safe, validate in production, and grow confidence.

### E-commerce platforms

Typical situation:

- Monolith handles catalog, cart, checkout, payments, shipping, promotions.
- Seasonal peaks make outages unacceptable.

Step-by-step gradual migration:

1. Put an **API Gateway** in front of the monolith and route **100%** to legacy (no behavior change).
2. Extract **read-heavy** capabilities first (easy to benchmark + scale):
   - product catalog
   - search suggestions
   - reviews
3. Add feature flags and route only **internal users** to the new services.
4. Canary rollout for external users by cohort (1% → 5% → 25% → 50% → 100%).
5. Move write-heavy, correctness-sensitive flows later:
   - checkout orchestration
   - payment authorization/capture
   - order confirmation
6. Retire monolith endpoints when their traffic reaches ~0.

### Banking / FinTech systems

Typical constraints:

- Compliance, auditing, and strict correctness requirements.
- Core banking systems are difficult to change.

Step-by-step gradual migration:

1. Gateway adds standardized auth, correlation IDs, and audit logging.
2. Extract customer-facing “digital channel” capabilities (often read models):
   - account overview aggregation
   - statements
   - notifications
3. Introduce **Anti-Corruption Layers** to avoid leaking legacy domain models.
4. High-stakes flows (transfers/payments) are migrated later with:
   - idempotency
   - reconciliation
   - parallel run (when practical)

### Legacy ERP systems

Typical situation:

- The ERP is the source of truth.
- Business logic is embedded in decades of workflows.

Step-by-step gradual migration:

1. Encapsulate ERP behind a stable integration layer.
2. Extract new workflow services around the ERP rather than rewriting it.
3. Build modern read models (CQRS-style projections) for digital experiences.
4. Gradually reduce direct ERP coupling as services assume ownership of new processes.

### SaaS products

Typical situation:

- Multi-tenant systems allow safer cohort routing per tenant.

Step-by-step gradual migration:

1. Extract cross-cutting services:
   - identity
   - billing
   - notifications
2. Route by tenant for controlled rollout.
3. Keep long-tail tenants on legacy until proven.
4. Migrate tenants gradually; retire legacy once all tenants are off.

---

## 5. Architecture Overview

A strangler migration typically includes:

- **Legacy monolith**: continues serving production traffic.
- **API Gateway**: traffic control + policy enforcement.
- **New microservices**: incrementally replace legacy capabilities.

### Before migration

```text
Client
  |
  v
+---------------------+
|   Legacy Monolith   |
+---------------------+
          |
          v
    Legacy Database
```

### During strangling

```text
                  +-------------------+
Client ----------> |    API Gateway    |
                  +-------------------+
                    |             |
          (not migrated yet)      |  (migrated)
                    v             v
          +----------------+   +------------------+
          | Legacy Monolith|   | New Service(s)   |
          +----------------+   +------------------+
                  |                    |
                  v                    v
           Legacy Database      Service Database(s)
```

### After migration

```text
                  +-------------------+
Client ----------> |    API Gateway    |
                  +-------------------+
                    |   |     |     |
                    v   v     v     v
              +--------+ +--------+ +--------+
              | Users  | | Orders | | Billing|
              +--------+ +--------+ +--------+
                  |         |          |
                  v         v          v
               Users DB   Orders DB  Billing DB
```

---

## 6. Role of the API Gateway

The gateway is the **control plane** for incremental migration. It enables you to move traffic safely without changing clients.

### Request routing

Common routing signals:

- **Path-based** routing: `/api/orders/*` → `orders-service`
- **Host-based** routing: `orders.api.company.com` → `orders-service`
- **Header-based** routing: `X-Tenant-ID`, `X-Experiment`
- **Cohort-based** routing: internal users, beta users, specific tenants
- **Percentage-based** routing: 1% → 5% → 25% → 50% → 100%

Conceptual routing rule:

```text
if request.path startsWith /api/orders:
  route to orders-service
else:
  route to legacy-monolith
```

### Feature flags

Feature flags at the gateway are extremely practical because rollback becomes instantaneous:

- Enable new services for internal cohorts first.
- Ramp up traffic gradually.
- Roll back to monolith via a configuration change.

Key principle: **keep business logic out of the gateway**. Use it for routing and policy, not domain rules.

### Canary releases

Canary releases are how you prove safety:

- Start with a cohort you can afford to impact.
- Observe telemetry: request success, latency, and business KPIs.
- Increase exposure only when you have evidence.

Canaries require:

- Strong observability
- A tested rollback
- Idempotency for write operations

### Shadow traffic

Shadow traffic mirrors production requests to the new service without affecting user responses.

Why it’s useful:

- It exposes edge cases you’ll never hit in staging.
- It validates performance under real load.

Hard constraints:

- Never allow side effects.
- Scrub sensitive data.
- Treat it like a security surface.

### Backward compatibility

The gateway can temporarily preserve client compatibility:

- Version routing: `/v1/*` → monolith, `/v2/*` → microservices
- Request/response transformations (short-term)

Avoid turning the gateway into a permanent translation engine—it becomes the next legacy system.

### Centralized authentication and logging

Centralize cross-cutting concerns during migration:

- Authentication (JWT/session introspection)
- Rate limiting
- Correlation IDs
- Structured access logs
- Consistent tracing headers

Baseline best practice:

- Gateway injects `X-Request-Id` or W3C `traceparent`.
- Gateway logs the routing decision (monolith vs service).
- Downstream services propagate trace headers.

---

## 7. Step-by-Step Migration Flow

### Phase 1: Proxying traffic to monolith

Goal: add the gateway without changing behavior.

Checklist:

- Route **100%** traffic to the monolith.
- Add correlation IDs and baseline dashboards.
- Prove you can roll back gateway config safely.

Success criteria:

- No user-visible change.
- Your baseline error rate/latency is measurable.

### Phase 2: Gradual feature extraction

Goal: replace capabilities one small slice at a time.

A practical extraction loop:

1. Define the **contract** (request/response, error semantics).
2. Add characterization tests against the monolith if behavior is unclear.
3. Implement the service with observability and resilience from day one.
4. Deploy and validate via shadow traffic or internal-only traffic.
5. Canary release with explicit success criteria.
6. Ramp traffic while monitoring.
7. Retire monolith code/routes for that capability.

### Phase 3: Decommissioning the monolith

Goal: remove the monolith when it no longer serves traffic.

Steps:

- Identify remaining endpoints and dependencies.
- Migrate operational runbooks and on-call ownership.
- Freeze legacy changes (or heavily control them).
- Decommission infrastructure and archive responsibly.

---

## 8. Best Practices (From Real-World Experience)

### Feature-by-feature migration

Do:

- Extract **vertical slices** (API + domain + persistence + observability).
- Start with the most valuable, most painful, or most scalable-candidate capability.

Avoid:

- Extracting only “data access” or only “UI” without an end-to-end slice.

### Contract testing

You’re replacing implementations while preserving client expectations.

Use:

- Consumer-driven contract tests
- Characterization tests against legacy behavior

Practical rule: if you can’t write the contract down precisely, you haven’t found the boundary.

### Observability (logs, metrics, tracing)

Minimum bar:

- Correlated logs (request ID / trace context)
- Metrics:
  - throughput
  - p50/p95/p99 latency
  - error rate
  - dependency timeout/error rates
- Distributed tracing across gateway → services → dependencies

Migration dashboards:

- Monolith traffic by route (should trend down)
- Microservice traffic by route (should trend up)
- KPI deltas during canaries

### Rollback strategies

Treat rollback as a feature:

- Routing rollback must be a configuration change.
- Writes must be idempotent or compensatable.
- Don’t rely on “we’ll just redeploy” as a rollback.

### Avoiding shared databases

Shared databases create a distributed monolith.

Prefer:

- Database-per-service
- Event-driven consistency
- Read projections for cross-service queries

If temporary sharing is unavoidable:

- Make it explicit, time-boxed, and measurable.

### Incremental releases

- Ship small.
- Validate in production.
- Expand only when telemetry supports it.

---

## 9. When to Use the Strangler Fig Pattern

Use it when:

- The system is **business-critical**.
- You must keep shipping features.
- You need modernization with controlled risk.

### Team and organizational maturity

It works best when you can support:

- CI/CD and automation
- On-call ownership
- Observability discipline
- Clear contracts and service ownership

### Business-critical systems

If the platform can’t go down, strangler is often the safest path:

- Gradual exposure
- Fast rollback
- Incremental value delivery

### Long-running legacy platforms

Systems with years of hidden behavior and data complexity are prime candidates.

---

## 10. When NOT to Use It

Avoid it when:

- **Small applications**: rewriting may be faster.
- **Greenfield projects**: start clean.
- **Tight timelines**: strangler is safer but takes disciplined iteration.

### When it becomes an anti-pattern

It becomes an anti-pattern when:

- The gateway accumulates permanent business logic.
- You keep both implementations forever.
- You share a database long-term.
- Routing rules become too complex to reason about.

---

## 11. Common Mistakes and Pitfalls

### Big-bang thinking

- Extracting huge domains before any production routing.
- No incremental validation.

Fix: ship thin end-to-end slices early.

### Shared databases

Fix: enforce data ownership and integrate via APIs/events.

### No gateway

Fix: centralize routing to keep clients stable.

### No monitoring

Fix: observability first; migration is production engineering.

### No rollback plan

Fix: practice rollback via configuration changes; test it.

---

## 12. Comparison With Other Approaches

### Big Bang Rewrite

- Pros: clean slate (if you succeed)
- Cons: high risk, long feedback cycles, major cutover

### Branch by Abstraction

- Old and new implementations behind an abstraction in the same codebase.
- Useful to create seams inside the monolith.
- Often used *with* strangler for certain domains.

### Parallel Run

- Run both implementations and compare.
- Valuable for correctness-heavy domains.
- Operationally expensive but increases confidence.

---

## 13. How It Works With Other Patterns

### Saga Pattern

As you extract write workflows, distributed transactions emerge.

- Use sagas (orchestrated or choreographed).
- Ensure idempotency and compensations.

### Circuit Breaker

Extracted services introduce new dependencies.

- Use circuit breakers and timeouts to prevent cascade failures.

### CQRS

CQRS often pairs well with strangler:

- Extract reads first into projections.
- Migrate writes later.

### API Gateway Pattern

The gateway is the enabler:

- routing
- rollout control
- logging/auth
- temporary compatibility

---

## 14. Mental Model & Engineer Checklist

### A simple mental model

You’re migrating three things simultaneously:

1. **Traffic** (routing control)
2. **Behavior** (correctness and contracts)
3. **Data** (ownership and consistency)

If any one is unclear, the migration becomes fragile.

### A checklist engineers can follow during migration

- **Boundary & contract**
  - [ ] Contract documented (inputs, outputs, error semantics)
  - [ ] Contract/characterization tests exist

- **Gateway & rollout**
  - [ ] Route implemented
  - [ ] Feature flag/cohort strategy defined
  - [ ] Canary stages defined with measurable success criteria
  - [ ] Rollback tested

- **Observability**
  - [ ] Logs carry request/trace IDs
  - [ ] Metrics dashboards exist (latency, errors, throughput)
  - [ ] Traces work end-to-end
  - [ ] Alerts cover canary regressions

- **Resilience**
  - [ ] Timeouts configured
  - [ ] Retries used safely (idempotent only)
  - [ ] Circuit breaker policy defined

- **Data & consistency**
  - [ ] Data ownership clearly defined
  - [ ] Migration plan exists (backfill/event sync/dual write + reconciliation)
  - [ ] Idempotency keys for write operations

---

## 15. Summary

Key takeaways:

- The Strangler Fig Pattern is a **safe modernization strategy**.
- It works by controlling traffic at the edge and replacing capabilities incrementally.
- The real risk is usually **data ownership and consistency**, not HTTP routing.
- Success requires **contracts, observability, and rollback** as first-class concerns.

This pattern isn’t about microservices for their own sake. It’s about **shipping change safely** while evolving a system the business depends on.
