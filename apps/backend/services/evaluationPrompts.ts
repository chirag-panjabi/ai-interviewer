export type ExperienceLevel = "JUNIOR" | "MID" | "SENIOR";

export type InterviewTrack =
  | "FULLSTACK_GENERAL"
  | "BACKEND"
  | "FRONTEND"
  | "SYSTEM_DESIGN"
  | "DSA"
  | "BEHAVIORAL"
  | "DEVOPS_CLOUD"
  | "ML_AI"
  | string;

export interface EvaluationPromptParams {
  experienceLevel: ExperienceLevel;
  track: InterviewTrack;
  transcriptFormatted: string;
  githubMetadata?: any;
}

interface TrackLevelRubric {
  trackName: string;
  rolePersona: string;
  focusDomain: string;
  categoryDefinitions: string;
  scoreBands: {
    noHire: string;
    leanNoHire: string;
    hire: string;
    strongHire: string;
  };
  greenFlags: string[];
  redFlags: string[];
  adaptiveNotes: string;
}

const RUBRIC_MATRIX: Record<string, Record<ExperienceLevel, TrackLevelRubric>> = {
  FULLSTACK_GENERAL: {
    JUNIOR: {
      trackName: "Full-Stack General",
      rolePersona: "Principal Staff Engineer evaluating a Junior Full-Stack Engineer (0-2 years)",
      focusDomain: "Foundational REST APIs, basic database CRUD, component state, and asynchronous data flow.",
      categoryDefinitions: `1. **Technical Accuracy**: Correct understanding of HTTP methods (GET/POST/PUT/DELETE), status codes, basic SQL queries/joins, and React state/props flow.
2. **Problem Solving**: Ability to reason through simple end-to-end bugs, network error handling, and form validation logic.
3. **Communication**: Clear, structured explanations of how their frontend connects to the backend and database.
4. **Engineering Depth**: Basic code cleanliness, separation of concerns, and foundational CS understanding (e.g. basic Big-O).`,
      scoreBands: {
        noHire: "Cannot explain basic HTTP conventions, confused about frontend vs backend boundaries, or unable to write/trace simple database CRUD.",
        leanNoHire: "Recites terminology (e.g. 'useEffect', 'foreign key') but struggles to explain how data actually flows from UI to database.",
        hire: "Solid fundamentals: cleanly explains REST endpoints, database schema design for simple apps, and component state lifecycle. Ready for production junior contribution.",
        strongHire: "Exceeds junior expectations: demonstrates architectural awareness, discusses caching or indexing basics, and reasons well about error edge cases.",
      },
      greenFlags: [
        "Clearly separates client state from server state",
        "Understands basic SQL relations (1-to-many, foreign keys) or Document store schemas",
        "Handles loading and error states in UI gracefully",
        "Knows how to inspect network requests and debug API errors",
      ],
      redFlags: [
        "Storing sensitive API keys or database credentials in frontend client bundles",
        "Confusing server-side execution with client-side execution",
        "Unable to explain what happens when an API request fails",
      ],
      adaptiveNotes: "Do not penalize for missing distributed consensus or DB sharding knowledge. Reward candidate if they handled mid-level caching or queue questions well.",
    },
    MID: {
      trackName: "Full-Stack General",
      rolePersona: "Principal Staff Engineer evaluating a Mid-Level Full-Stack Engineer (2-5 years)",
      focusDomain: "Multi-tier web application architecture, API contract design, database indexing, caching strategies, and concurrency.",
      categoryDefinitions: `1. **Technical Accuracy**: Precise knowledge of database indexing (B-Trees), transaction boundaries (ACID), state management libraries, and cache invalidation.
2. **Problem Solving**: Handling traffic spikes, designing resilient API contracts, background job processing, and race condition avoidance.
3. **Communication**: Articulate trade-off discussions (SQL vs NoSQL, Server Components vs Client Components, REST vs GraphQL).
4. **Engineering Depth**: Deep understanding of browser rendering lifecycle, DB connection pooling, and asynchronous event loops.`,
      scoreBands: {
        noHire: "Lacks production depth despite experience; cannot explain how to index a database table or optimize slow queries.",
        leanNoHire: "Relies on surface buzzwords (Kafka, Redis) without understanding cache-aside patterns, invalidation bugs, or transaction isolation.",
        hire: "Strong production intuition: designs clean API contracts, indexes database tables effectively, uses caching with clear TTLs, handles background queues.",
        strongHire: "Near-senior mastery: proactively identifies N+1 query bottlenecks, designs idempotent APIs, mitigates race conditions, and explains trade-offs with nuance.",
      },
      greenFlags: [
        "Proactively discusses database query plans (EXPLAIN) and indexing strategies",
        "Implements idempotent API endpoints and exponential backoff retries",
        "Designs normalized client state and avoids unnecessary re-renders",
        "Handles asynchronous queue workers (BullMQ, Celery, SQS) cleanly",
      ],
      redFlags: [
        "Performing heavy computations or synchronous blocking calls in API request threads",
        "Blindly adding Redis caching without an invalidation or TTL strategy",
        "Ignoring optimistic concurrency and database race conditions",
      ],
      adaptiveNotes: "Anchor evaluation on mid-level production standards. Reward candidate if they demonstrated senior-level failure mode analysis.",
    },
    SENIOR: {
      trackName: "Full-Stack General",
      rolePersona: "Principal Staff Engineer evaluating a Senior / Lead Full-Stack Engineer (5+ years)",
      focusDomain: "Distributed full-stack architecture, high-throughput scaling, database sharding, cache coherence, and failure containment.",
      categoryDefinitions: `1. **Technical Accuracy**: Flawless command of distributed systems concepts (MVCC, WAL, CAP theorem, locking protocols, streaming protocols).
2. **Problem Solving**: Designing systems for 100x traffic surges, mitigating cascading failures, consensus trade-offs, and zero-downtime migrations.
3. **Communication**: Executive-level technical clarity, precise trade-off articulation, and strategic engineering leadership.
4. **Engineering Depth**: Deep mastery of operating system internals, database storage engines, network socket buffering, and browser paint pipelines.`,
      scoreBands: {
        noHire: "Unable to justify architectural boundaries, vague about database scale, or fails to anticipate distributed failure modes.",
        leanNoHire: "Strong individual contributor knowledge but lacks deep architectural rigor when probed on multi-region scale or consistency anomalies.",
        hire: "Senior engineering excellence: architects resilient distributed full-stack systems, designs for graceful degradation, proves deep systems depth.",
        strongHire: "Principal-level authority: masterful dissection of distributed edge cases, cache stampedes, multi-region replication lag, and organizational impact.",
      },
      greenFlags: [
        "Proactively addresses failure blast radius, circuit breakers, and rate limiters",
        "Balances strong consistency vs eventual consistency with concrete business context",
        "Designs zero-downtime database schema migrations (expand-contract pattern)",
        "Demonstrates deep empathy for team velocity and maintainable architecture",
      ],
      redFlags: [
        "Single point of failure (SPOF) in core architecture without mitigation",
        "Inability to explain how distributed transactions or two-phase commits work",
        "Over-engineering simple solutions without business justification",
      ],
      adaptiveNotes: "Hold the candidate to Tier-1 industry rigor. Look for proactive identification of non-functional requirements (latency, availability, cost).",
    },
  },

  BACKEND: {
    JUNIOR: {
      trackName: "Backend Engineering",
      rolePersona: "Senior Backend Lead evaluating an Entry-Level Backend Engineer (0-2 years)",
      focusDomain: "RESTful API design, database schema modeling, basic SQL joins, middleware, and error handling.",
      categoryDefinitions: `1. **Technical Accuracy**: Correct implementation of HTTP status codes, routing, SQL relational queries, and input validation.
2. **Problem Solving**: Debugging backend server errors, handling null/edge cases, and structuring clean service layers.
3. **Communication**: Ability to walk through request-response lifecycles clearly.
4. **Engineering Depth**: Understanding asynchronous promises, event loops, and basic authentication (JWT/Sessions).`,
      scoreBands: {
        noHire: "Unable to construct standard SQL queries, confused about API parameters, or ignores server error handling.",
        leanNoHire: "Understands basic CRUD syntax but cannot explain how middleware or database connections work.",
        hire: "Solid backend basics: builds clean REST endpoints, models relational schemas correctly, sanitizes inputs, handles errors gracefully.",
        strongHire: "Exceeds junior bar: demonstrates early understanding of connection pooling, Redis caching, and unit testing backend routes.",
      },
      greenFlags: [
        "Validates and sanitizes all incoming request payloads",
        "Understands relational constraints (Primary Keys, Foreign Keys, Unique Indexes)",
        "Properly uses environment variables for configuration",
      ],
      redFlags: [
        "Concatenating user input directly into SQL strings (SQL Injection vulnerability)",
        "Swallowing errors in catch blocks without logging or returning 500 status",
      ],
      adaptiveNotes: "Focus on clean coding and security fundamentals over high-scale distributed topics.",
    },
    MID: {
      trackName: "Backend Engineering",
      rolePersona: "Staff Backend Architect evaluating a Mid-Level Backend Engineer (2-5 years)",
      focusDomain: "Service modularity, database optimization, transaction management, caching, and worker queues.",
      categoryDefinitions: `1. **Technical Accuracy**: In-depth knowledge of database indexing (composite indexes), isolation levels, Redis cache-aside, and message queues.
2. **Problem Solving**: Optimizing slow database queries, handling concurrent updates, backpressure, and asynchronous task workflows.
3. **Communication**: Structured explanation of data flow, service boundaries, and trade-offs between sync vs async operations.
4. **Engineering Depth**: Understanding connection pooling limits, memory leaks, garbage collection pauses, and API security (CORS, Rate Limiting, OWASP).`,
      scoreBands: {
        noHire: "Fails to reason about database query performance or ignores concurrent write collisions.",
        leanNoHire: "Uses ORMs blindly without understanding generated SQL or N+1 queries; struggles with cache invalidation.",
        hire: "Competent mid-level engineer: optimizes indexes, manages ACID transaction boundaries, implements robust queue consumers.",
        strongHire: "Near-senior depth: proactively introduces idempotency keys, dead-letter queues, distributed locking mechanisms (Redlock), and circuit breakers.",
      },
      greenFlags: [
        "Explains query execution plans and when composite indexes are utilized",
        "Uses background workers (BullMQ, Kafka, SQS) for non-blocking operations",
        "Implements optimistic locking with version columns to prevent race conditions",
      ],
      redFlags: [
        "Running unindexed queries on high-cardinality tables in hot paths",
        "Lack of idempotency in message queue consumers leading to duplicate processing",
      ],
      adaptiveNotes: "Reward candidate for deep understanding of database internals and worker resilience.",
    },
    SENIOR: {
      trackName: "Backend Engineering",
      rolePersona: "Principal Backend Architect evaluating a Senior / Lead Backend Engineer (5+ years)",
      focusDomain: "High-throughput distributed services, storage engine internals, consensus, fault tolerance, and event-driven architectures.",
      categoryDefinitions: `1. **Technical Accuracy**: Deep mastery of MVCC, WAL, Raft/Paxos, message broker semantics (Kafka partition rebalancing, offset commits), and distributed locks.
2. **Problem Solving**: Mitigating cascading outages, handling network partitions, backpressure regulation, and multi-region data replication.
3. **Communication**: High-clarity architectural trade-off justification (CAP theorem, PACELC, latency budgets).
4. **Engineering Depth**: Deep understanding of kernel TCP buffers, database page cache, lock contention, and high-concurrency memory models.`,
      scoreBands: {
        noHire: "Lacks distributed systems foundations; unable to explain partition tolerance or handle service failure cascades.",
        leanNoHire: "Good component-level knowledge but struggles when challenged on distributed data consistency anomalies or partition splits.",
        hire: "Senior backend leader: masterfully architects distributed services, prevents split-brain, implements graceful degradation under extreme load.",
        strongHire: "Principal-level mastery: world-class systems depth in distributed consensus, zero-downtime data migration, and high-scale event streaming.",
      },
      greenFlags: [
        "Designs backpressure mechanisms (leaky bucket, token bucket) and load shedding",
        "Articulates exact trade-offs of Kafka vs RabbitMQ vs SQS for specific use cases",
        "Mitigates distributed transaction complexities with Sagas or outbox patterns",
      ],
      redFlags: [
        "Assuming synchronous distributed transactions (2PC) are feasible at high scale",
        "Ignoring network partition failures or thundering herd scenarios",
      ],
      adaptiveNotes: "Challenge with realistic edge cases (split-brain, clock drift, connection exhaustion) and evaluate architectural maturity.",
    },
  },

  FRONTEND: {
    JUNIOR: {
      trackName: "Frontend Engineering",
      rolePersona: "Senior Frontend Lead evaluating an Entry-Level Frontend Engineer (0-2 years)",
      focusDomain: "Component hierarchy, React state and props, DOM events, CSS layout (Flexbox/Grid), and async API fetching.",
      categoryDefinitions: `1. **Technical Accuracy**: Correct usage of useState, useEffect dependencies, conditional rendering, and semantic HTML.
2. **Problem Solving**: Handling loading and error states, form input controlled state, and basic responsiveness.
3. **Communication**: Clear explanation of component composition and user interactions.
4. **Engineering Depth**: Understanding the difference between client-side state, props drilling, and basic Web Accessibility (WCAG).`,
      scoreBands: {
        noHire: "Cannot explain basic component props/state flow, causes infinite render loops with useEffect, or ignores CSS basics.",
        leanNoHire: "Knows React syntax but cannot explain how DOM events work or how to handle asynchronous fetch states cleanly.",
        hire: "Solid junior engineer: builds modular UI components, manages local state cleanly, handles network loading/error states.",
        strongHire: "Exceptional junior: understands memoization basics, clean custom hooks, and semantic accessibility.",
      },
      greenFlags: [
        "Correctly manages useEffect dependency arrays without missing dependencies",
        "Uses semantic HTML elements (<button>, <nav>, <main>) for accessibility",
        "Implements responsive layouts with modern CSS (Flexbox, CSS Grid)",
      ],
      redFlags: [
        "Mutating state directly instead of using setState/immutability",
        "Using <div> for clickable elements without keyboard accessibility or ARIA roles",
      ],
      adaptiveNotes: "Emphasize clean code, UI states, and foundational browser mechanics.",
    },
    MID: {
      trackName: "Frontend Engineering",
      rolePersona: "Staff Frontend Architect evaluating a Mid-Level Frontend Engineer (2-5 years)",
      focusDomain: "Component design systems, state management architecture, rendering performance, client-side caching, and Core Web Vitals.",
      categoryDefinitions: `1. **Technical Accuracy**: Deep knowledge of Virtual DOM reconciliation, memoization (useMemo, useCallback), React Query/SWR, and browser rendering pipeline.
2. **Problem Solving**: Eliminating unnecessary re-renders, optimizing bundle sizes with lazy loading, and managing complex global state.
3. **Communication**: Articulating trade-offs between client-side state libraries (Zustand, Redux, Context) and data-fetching cache layers.
4. **Engineering Depth**: Understanding Core Web Vitals (LCP, INP, CLS), browser critical rendering path, and XSS prevention.`,
      scoreBands: {
        noHire: "Unable to diagnose performance bottlenecks or explain why components re-render.",
        leanNoHire: "Applies useMemo/useCallback blindly without profiling; struggles with cache synchronization or stale state bugs.",
        hire: "Strong mid-level frontend engineer: structures clean design systems, optimizes rendering performance, leverages modern query caches.",
        strongHire: "Near-senior expertise: masterfully optimizes Web Vitals, implements optimistic UI rollbacks, and structures complex state machines.",
      },
      greenFlags: [
        "Profiles performance with React DevTools and Chrome Performance tab",
        "Implements optimistic updates with automatic rollback on server error",
        "Uses code-splitting and dynamic imports to minimize Initial Bundle Size",
      ],
      redFlags: [
        "Over-relying on React Context for high-frequency state updates causing global re-renders",
        "Injecting unsanitized HTML (dangerouslySetInnerHTML) without XSS protection",
      ],
      adaptiveNotes: "Evaluate both UX quality intuition and technical rendering optimization.",
    },
    SENIOR: {
      trackName: "Frontend Engineering",
      rolePersona: "Principal Frontend Architect evaluating a Senior / Lead Frontend Engineer (5+ years)",
      focusDomain: "Enterprise frontend architecture, streaming SSR, Micro-frontends, build tooling, and web platform standards.",
      categoryDefinitions: `1. **Technical Accuracy**: Masterful understanding of Concurrent React, streaming SSR, hydration internals, Module Federation, and browser paint engines.
2. **Problem Solving**: Architecting large-scale design systems, resilient offline-first sync, and large bundle optimizations.
3. **Communication**: High-impact architectural trade-off analysis (SSR vs SSG vs RSC vs SPA), mentoring, and developer experience (DX).
4. **Engineering Depth**: Deep mastery of Webpack/Vite/Turbopack internals, Service Workers, memory leak profiling, and WCAG AAA compliance.`,
      scoreBands: {
        noHire: "Lacks architectural vision for enterprise web apps; unable to explain SSR hydration or modern rendering paradigms.",
        leanNoHire: "Skilled UI developer but lacks deep understanding of browser engines, streaming SSR, or build tool optimization at scale.",
        hire: "Senior frontend authority: architects robust, accessible, high-performance web platforms with excellent developer ergonomics.",
        strongHire: "Principal-level frontend master: pioneer in rendering performance, streaming architecture, offline resilience, and cross-team design systems.",
      },
      greenFlags: [
        "Deeply explains React Server Components (RSC) and streaming HTML pipelines",
        "Designs micro-frontend architectures with clear isolation and shared dependencies",
        "Audits and optimizes Core Web Vitals at an enterprise scale",
      ],
      redFlags: [
        "Ignoring hydration mismatches or client-server state divergence in SSR",
        "Inability to explain how modern JavaScript bundlers perform tree-shaking",
      ],
      adaptiveNotes: "Probe deeply into browser architecture, developer tooling, and modern full-stack frontend paradigms.",
    },
  },

  SYSTEM_DESIGN: {
    JUNIOR: {
      trackName: "System Design",
      rolePersona: "Staff System Architect evaluating a Junior Engineer (0-2 years)",
      focusDomain: "Basic client-server architecture, database choice (SQL vs NoSQL), load balancing, and single points of failure.",
      categoryDefinitions: `1. **Technical Accuracy**: Basic understanding of client, web server, database layers, DNS, and HTTP/HTTPS.
2. **Problem Solving**: Identifying system bottlenecks for simple scaling scenarios (1,000 to 50,000 users).
3. **Communication**: Ability to walk through a high-level block diagram systematically.
4. **Engineering Depth**: Basic awareness of caching (Redis), database read replicas, and horizontal scaling.`,
      scoreBands: {
        noHire: "Cannot explain how a client connects to a server, or confuses client-side storage with database servers.",
        leanNoHire: "Draws boxes on a diagram but cannot explain the function of a load balancer or why a database needs replicas.",
        hire: "Good junior system understanding: designs a clean 3-tier architecture, explains basic caching, and identifies single points of failure.",
        strongHire: "Exceeds junior level: calculates basic capacity estimates and reasons clearly about database indexing and caching.",
      },
      greenFlags: [
        "Explains the role of a Load Balancer in distributing web traffic",
        "Separates static asset delivery (CDN) from application servers",
        "Identifies database read bottlenecks and introduces Redis caching",
      ],
      redFlags: [
        "Assuming a single database instance can handle infinite scale without replicas",
        "Storing session state in memory on load-balanced application servers without sticky sessions or distributed stores",
      ],
      adaptiveNotes: "Calibrate for foundational architectural clarity; do not expect complex distributed consensus.",
    },
    MID: {
      trackName: "System Design",
      rolePersona: "Principal Systems Architect evaluating a Mid-Level Engineer (2-5 years)",
      focusDomain: "Scalable multi-tier topologies, capacity estimation, SQL vs NoSQL trade-offs, message queues, and caching strategies.",
      categoryDefinitions: `1. **Technical Accuracy**: Solid estimation (RPS, bandwidth, storage), CAP theorem application, database sharding strategies, and asynchronous decoupling.
2. **Problem Solving**: Handling read-heavy vs write-heavy workloads, cache invalidation, database failover, and rate limiting.
3. **Communication**: Structured approach (Requirements -> Capacity -> High-Level -> Deep Dives -> Bottlenecks).
4. **Engineering Depth**: Understanding replication lag, consistent hashing, message broker semantics, and database indexing at scale.`,
      scoreBands: {
        noHire: "Fails to structure the interview; jumps straight into tools without clarifying functional or non-functional requirements.",
        leanNoHire: "Describes a generic system but cannot perform back-of-the-envelope math or handle database replication lag.",
        hire: "Strong mid-level architect: produces clear capacity numbers, designs resilient multi-tier topology, addresses cache invalidation.",
        strongHire: "Near-senior architect: proactively identifies hot key issues, applies consistent hashing, and designs robust asynchronous event flows.",
      },
      greenFlags: [
        "Starts with clear functional and non-functional requirements (Availability, Latency, Throughput)",
        "Calculates realistic back-of-the-envelope RPS, storage, and network bandwidth estimates",
        "Applies consistent hashing to distribute caching and storage load evenly",
      ],
      redFlags: [
        "Ignoring database write scalability (proposing only read replicas for write-heavy systems)",
        "Not accounting for cache stampedes or thundering herd problems",
      ],
      adaptiveNotes: "Expect a structured, top-down system design framework with concrete numerical grounding.",
    },
    SENIOR: {
      trackName: "System Design",
      rolePersona: "Principal Systems Architect evaluating a Senior / Staff Engineer (5+ years)",
      focusDomain: "High-scale global distributed systems, consensus protocols, multi-region failover, blast radius containment, and data partitioning.",
      categoryDefinitions: `1. **Technical Accuracy**: Flawless mastery of distributed systems principles (PACELC, Raft/Paxos, CRDTs, WAL, LSM trees vs B-Trees, vectorized search).
2. **Problem Solving**: Designing for 100M+ DAU, mitigating split-brain, handling global replication lag, and cost optimization.
3. **Communication**: Flawless executive structure, driving trade-offs proactively, defining SLAs/SLOs, and guiding technical strategy.
4. **Engineering Depth**: Deep understanding of network protocols (gRPC, TCP, QUIC), kernel bypass, storage engine write amplification, and failure isolation.`,
      scoreBands: {
        noHire: "Cannot defend architectural choices, ignores failure modes under partition, or shows superficial knowledge.",
        leanNoHire: "Standard senior knowledge but struggles when pressed on consensus anomalies, multi-region conflict resolution, or extreme edge cases.",
        hire: "Senior systems authority: designs highly resilient distributed architectures, calculates precise latency budgets, mitigates cascading failures.",
        strongHire: "Staff/Principal master: world-class distributed architecture, effortless navigation of consensus, cost, partition tolerance, and organizational scale.",
      },
      greenFlags: [
        "Proactively defines blast radius containment, bulkheads, and graceful degradation paths",
        "Solves multi-region active-active write conflicts with CRDTs, vector clocks, or partition routing",
        "Calculates hardware infrastructure cost trade-offs and network egress bottlenecks",
      ],
      redFlags: [
        "Relying on synchronous cross-region database writes for latency-sensitive user paths",
        "Failing to account for clock skew and NTP synchronization limits in distributed ordering",
      ],
      adaptiveNotes: "Test with severe constraints (e.g. data center outage, network partition, 10x sudden spike) and evaluate resilience.",
    },
  },

  DSA: {
    JUNIOR: {
      trackName: "Data Structures & Algorithms",
      rolePersona: "Senior Algorithm Specialist evaluating a Junior Developer (0-2 years)",
      focusDomain: "Core data structures (Arrays, Strings, Hash Maps, Linked Lists, Stacks, Queues) and fundamental Big-O analysis.",
      categoryDefinitions: `1. **Algorithmic Correctness**: Implements bug-free logic for standard problems (e.g. Two Sum, Valid Parentheses, Reverse Linked List).
2. **Optimization Ability**: Progresses from naive brute-force (O(N^2)) to optimal hash map or two-pointer approach (O(N)).
3. **Communication**: Talks through thought process, clarifies constraints (empty input, negative numbers), and writes clean logic.
4. **Complexity Analysis**: Accurately computes Big-O time and space complexity.`,
      scoreBands: {
        noHire: "Unable to write basic iteration logic, confused about array indexing, or cannot compute basic Big-O.",
        leanNoHire: "Writes brute force but cannot optimize even with hints; struggles with edge cases (empty array, null).",
        hire: "Good junior algorithmic foundation: clarifies problem constraints, implements correct solution with reasonable complexity, explains Big-O.",
        strongHire: "Exceptional junior: jumps quickly to optimal data structure, handles edge cases proactively, and proves time/space bounds.",
      },
      greenFlags: [
        "Clarifies input bounds and edge cases before writing code",
        "Uses Hash Maps effectively to reduce lookup time from O(N) to O(1)",
        "Accurately calculates both time and auxiliary memory space complexity",
      ],
      redFlags: [
        "Ignoring off-by-one errors and array bounds checks",
        "Confusing O(N) linear time with O(log N) logarithmic time",
      ],
      adaptiveNotes: "Prioritize clear algorithmic thinking and correct Big-O analysis over speed.",
    },
    MID: {
      trackName: "Data Structures & Algorithms",
      rolePersona: "Staff Algorithm Specialist evaluating a Mid-Level Developer (2-5 years)",
      focusDomain: "Intermediate algorithms (Trees, Graphs, Heaps, Sliding Window, Binary Search, Dynamic Programming) and trade-off analysis.",
      categoryDefinitions: `1. **Algorithmic Correctness**: Implements optimal solutions for Medium-difficulty problems with clean invariant handling.
2. **Optimization Ability**: Identifies suboptimal subproblems, eliminates redundant work, and trades space for time when appropriate.
3. **Communication**: Articulates algorithmic patterns clearly and validates solutions with dry-run test cases.
4. **Complexity Analysis**: Deep understanding of amortized complexity, recursion stack overhead, and auxiliary space.`,
      scoreBands: {
        noHire: "Struggles with fundamental tree/graph traversals or fails to optimize beyond brute force.",
        leanNoHire: "Recognizes problem type but gets stuck in implementation details or misses critical edge cases (cycles, integer overflow).",
        hire: "Strong mid-level problem solver: selects optimal data structure, implements clean solution, explains space/time trade-offs.",
        strongHire: "Exceptional mastery: rapidly implements optimal DP or Graph solution, proves mathematical invariants, writes clean modular code.",
      },
      greenFlags: [
        "Selects the optimal algorithmic pattern (e.g. Monotonic Stack, Sliding Window, Topological Sort)",
        "Proactively dry-runs code against boundary test cases",
        "Explains auxiliary stack space in recursive solutions",
      ],
      redFlags: [
        "Infinite loops in graph traversals due to missing visited sets",
        "Inability to justify why a greedy approach is correct vs dynamic programming",
      ],
      adaptiveNotes: "Expect structured problem decomposition and optimal time/space performance.",
    },
    SENIOR: {
      trackName: "Data Structures & Algorithms",
      rolePersona: "Principal Algorithm Specialist evaluating a Senior / Staff Engineer (5+ years)",
      focusDomain: "Advanced algorithms (Segment Trees, Trie, Hard Graphs, Flow, Advanced DP, Bit Manipulation) and system mapping.",
      categoryDefinitions: `1. **Algorithmic Correctness**: Flawless implementation of complex algorithms, optimal data structure selection, and robust edge-case coverage.
2. **Optimization Ability**: Proves optimality, analyzes amortized bounds, cache locality, and memory overhead.
3. **Communication**: Crystal-clear explanation of complex state transitions and invariants.
4. **Complexity Analysis & Production Mapping**: Maps algorithmic principles to real-world software engineering systems (e.g. LRU caches, route planning, rate limiters).`,
      scoreBands: {
        noHire: "Unable to reason about algorithmic complexity or fails to solve standard medium/hard challenges.",
        leanNoHire: "Solves standard problems but cannot adapt when constraints are modified (e.g. stream data, memory-constrained).",
        hire: "Senior algorithmic strength: effortlessly solves hard algorithmic challenges, proves lower bounds, explains cache locality.",
        strongHire: "Staff/Principal algorithmic master: flawless execution, mathematical proofs of correctness, and maps algorithms to production systems.",
      },
      greenFlags: [
        "Analyzes CPU cache locality, branch prediction, and memory layout of data structures",
        "Adapts algorithms seamlessly to stream data or disk-backed storage constraints",
        "Proves algorithmic lower bounds rigorously",
      ],
      redFlags: [
        "Relying on brute force for problems with standard optimal patterns",
        "Failing to recognize exponential time complexity in recursive branching",
      ],
      adaptiveNotes: "Probe how the algorithm behaves under concurrent access or streaming memory constraints.",
    },
  },

  BEHAVIORAL: {
    JUNIOR: {
      trackName: "Behavioral & Leadership",
      rolePersona: "Engineering Director evaluating a Junior Engineer (0-2 years)",
      focusDomain: "STAR method stories, unblocking oneself, receiving feedback, team collaboration, and learning agility.",
      categoryDefinitions: `1. **Situation Framing**: Sets context clearly using STAR (Situation & Task) without rambling.
2. **Action Quality**: Demonstrates proactive initiative, asking for help when stuck, and personal accountability.
3. **Impact Articulation**: Shares concrete outcomes, lessons learned, and continuous improvement trajectory.
4. **Leadership & Culture**: Openness to constructive code review feedback, team camaraderie, and growth mindset.`,
      scoreBands: {
        noHire: "Blames others for failures, defensive about code review feedback, or unable to describe a single real project experience.",
        leanNoHire: "Gives vague, generic answers ('I worked hard') without concrete actions or personal ownership.",
        hire: "Great junior teammate: tells structured STAR stories, shows humility and eagerness to learn, receives feedback constructively.",
        strongHire: "Exceptional junior: shows remarkable self-awareness, took initiative to improve documentation/tests, inspired peers.",
      },
      greenFlags: [
        "Openly shares a mistake they made, what they learned, and how they fixed it",
        "Demonstrates hunger to learn from senior engineers and documentation",
        "Communicates with empathy and positive team spirit",
      ],
      redFlags: [
        "Defensive attitude toward receiving critical feedback",
        "Claiming they never made a mistake or never got stuck",
      ],
      adaptiveNotes: "Evaluate for cultural addition, growth mindset, and coachability.",
    },
    MID: {
      trackName: "Behavioral & Leadership",
      rolePersona: "Engineering Director evaluating a Mid-Level Engineer (2-5 years)",
      focusDomain: "Feature ownership, cross-functional collaboration (PM/Design), resolving disagreements, and accountability.",
      categoryDefinitions: `1. **Situation Framing**: Clear, high-context STAR framing of real production features and technical hurdles.
2. **Action Quality**: Decisive technical actions taken, pushing back constructively on requirements, and driving project completion.
3. **Impact Articulation**: Quantifiable business and technical metrics (e.g. reduced latency by 30%, shipped feature on deadline).
4. **Leadership & Culture**: Mentoring junior engineers, mediating disagreements in design reviews, and fostering healthy engineering practices.`,
      scoreBands: {
        noHire: "Cannot articulate personal contribution to team success; avoids accountability for past project delays.",
        leanNoHire: "Struggles to describe cross-functional collaboration with product or design; gives superficial answers.",
        hire: "Strong mid-level engineer: demonstrates end-to-end feature ownership, resolves technical disagreements professionally, quantifies impact.",
        strongHire: "Near-senior leadership: proactively improved team processes, mentored juniors to promotion, navigated ambiguous requirements.",
      },
      greenFlags: [
        "Describes navigating shifting requirements with product managers constructively",
        "Quantifies project impact with concrete business or performance metrics",
        "Mentors junior team members and conducts thoughtful code reviews",
      ],
      redFlags: [
        "Passive attitude ('I just wrote the tickets I was assigned without asking why')",
        "Dismissive of product, design, or business priorities",
      ],
      adaptiveNotes: "Look for strong personal ownership, cross-functional empathy, and technical leadership.",
    },
    SENIOR: {
      trackName: "Behavioral & Leadership",
      rolePersona: "VP of Engineering evaluating a Senior / Staff Engineering Leader (5+ years)",
      focusDomain: "Organizational impact, technical vision, navigating executive ambiguity, resolving senior conflict, and building engineering culture.",
      categoryDefinitions: `1. **Situation Framing**: High-stakes strategic situation framing affecting multiple teams or company-level architecture.
2. **Action Quality**: Influencing without authority, making difficult trade-offs under incomplete information, and driving systemic change.
3. **Impact Articulation**: Broad organizational impact (revenue, system uptime, team velocity, retention).
4. **Leadership & Culture**: Resolving deep technical rifts between staff engineers, leading blameless post-mortems, and elevating engineering standards.`,
      scoreBands: {
        noHire: "Lacks executive presence; unable to influence peers or resolve team conflict without escalation.",
        leanNoHire: "Strong technical individual contributor but lacks strategic organizational influence or empathy for broader business goals.",
        hire: "Senior engineering leader: drives multi-team technical alignment, leads blameless outage post-mortems, mentors and multiplies others.",
        strongHire: "Staff+ / VP caliber: exceptional leadership presence, builds enduring engineering culture, resolves deep org friction, aligns tech with business.",
      },
      greenFlags: [
        "Leads blameless post-mortems focusing on systemic safeguards rather than human error",
        "Influences cross-organizational technical strategy without needing formal authority",
        "Builds strong engineering culture, hiring pipelines, and developer career ladders",
      ],
      redFlags: [
        "Ego-driven decision making ('I forced my architecture because I'm the lead')",
        "Inability to align technical initiatives with executive business goals",
      ],
      adaptiveNotes: "Hold the candidate to executive leadership standards: multiplier effect, empathy, and strategic vision.",
    },
  },

  DEVOPS_CLOUD: {
    JUNIOR: {
      trackName: "DevOps & Cloud",
      rolePersona: "Senior Platform Lead evaluating a Junior DevOps / Cloud Engineer (0-2 years)",
      focusDomain: "CI/CD pipelines, Docker containerization, basic Linux commands, cloud basics (AWS/GCP), and application logging.",
      categoryDefinitions: `1. **Technical Accuracy**: Writing valid Dockerfiles, understanding CI/CD triggers, basic Linux permissions, and cloud resources (EC2, S3).
2. **Problem Solving**: Debugging failed build pipelines, container port mapping issues, and basic network connectivity.
3. **Communication**: Clear explanation of how code moves from a git commit to a deployed cloud server.
4. **Engineering Depth**: Basic awareness of environment secrets, SSL/TLS certificates, and log inspection.`,
      scoreBands: {
        noHire: "Cannot write a basic Dockerfile or explain how a CI/CD pipeline operates.",
        leanNoHire: "Knows basic commands but doesn't understand container layers, environment variables, or port bindings.",
        hire: "Competent junior DevOps engineer: writes multi-stage Dockerfiles, builds GitHub Actions pipelines, inspects container logs.",
        strongHire: "Exceptional junior: understands basic Terraform (IaC), container security scanning, and Prometheus metrics.",
      },
      greenFlags: [
        "Uses multi-stage Docker builds to keep production images lightweight",
        "Properly secures API keys and secrets using CI/CD secret vaults",
        "Understands basic networking concepts (DNS, Ports, HTTP vs HTTPS)",
      ],
      redFlags: [
        "Hardcoding cloud credentials in Dockerfiles or git repositories",
        "Running containers as root user in production environments",
      ],
      adaptiveNotes: "Emphasize security fundamentals, container basics, and CI/CD hygiene.",
    },
    MID: {
      trackName: "DevOps & Cloud",
      rolePersona: "Staff Site Reliability Engineer evaluating a Mid-Level DevOps / SRE Engineer (2-5 years)",
      focusDomain: "Kubernetes orchestration, Infrastructure as Code (Terraform), observability (Prometheus/Grafana), and deployment strategies.",
      categoryDefinitions: `1. **Technical Accuracy**: Deep knowledge of Kubernetes resources (Deployments, Services, Ingress, HPA), Terraform state management, and IAM policies.
2. **Problem Solving**: Designing zero-downtime Blue-Green/Canary deployments, resolving crash loops, and setting actionable alerting thresholds.
3. **Communication**: Articulating cloud architecture trade-offs (Serverless vs Containers, Managed DB vs Self-Hosted).
4. **Engineering Depth**: Understanding distributed tracing (OpenTelemetry), log aggregation at scale, and least-privilege cloud security.`,
      scoreBands: {
        noHire: "Cannot explain Kubernetes networking or fails to manage Terraform state safely.",
        leanNoHire: "Uses Kubernetes manifests blindly without understanding resource limits, probes, or autoscaling behavior.",
        hire: "Solid mid-level SRE/DevOps engineer: manages production K8s clusters, writes modular Terraform, implements actionable alerting.",
        strongHire: "Near-senior platform engineer: implements GitOps with ArgoCD, establishes golden observability pipelines, mitigates incident blast radius.",
      },
      greenFlags: [
        "Configures proper Kubernetes liveness, readiness, and startup probes",
        "Defines resource requests and limits to prevent noisy-neighbor cluster evictions",
        "Implements modular Terraform with remote state locking (S3 + DynamoDB)",
      ],
      redFlags: [
        "Deploying Kubernetes pods without resource limits or health probes",
        "Creating overly permissive cloud IAM policies (e.g. AdministratorAccess or *:* permissions)",
      ],
      adaptiveNotes: "Evaluate infrastructure resilience, automation, and observability depth.",
    },
    SENIOR: {
      trackName: "DevOps & Cloud",
      rolePersona: "Principal Platform Architect evaluating a Senior / Staff SRE / Platform Engineer (5+ years)",
      focusDomain: "Enterprise platform engineering, service mesh (Istio/Linkerd), multi-cluster GitOps, FinOps, and automated chaos engineering.",
      categoryDefinitions: `1. **Technical Accuracy**: Masterful understanding of eBPF, service mesh mTLS, BGP routing, multi-region disaster recovery (RTO/RPO), and Vault architecture.
2. **Problem Solving**: Multi-region failover, mitigating cloud provider zone outages, automated chaos testing, and large-scale cloud cost governance.
3. **Communication**: Strategic engineering leadership, defining error budgets and SLOs with executive product stakeholders.
4. **Engineering Depth**: Deep mastery of Linux kernel networking, container runtime security, high-cardinality metric indexing, and infrastructure compliance.`,
      scoreBands: {
        noHire: "Lacks platform architecture vision; unable to design multi-region disaster recovery or manage cluster security.",
        leanNoHire: "Good operational skills but struggles when pressed on service mesh networking, FinOps cost modeling, or chaos testing at scale.",
        hire: "Senior platform leader: designs enterprise-grade multi-cluster platforms, enforces zero-trust security, operationalizes SLO error budgets.",
        strongHire: "Principal platform master: industry-defining platform architecture, eBPF observability, automated self-healing infrastructure, and FinOps excellence.",
      },
      greenFlags: [
        "Establishes precise SLO/SLI error budget policies that govern release velocity",
        "Designs zero-trust network policies with automated mTLS certificate rotation",
        "Drives automated multi-region disaster recovery drills with verifiable RTO/RPO",
      ],
      redFlags: [
        "No disaster recovery strategy for cross-region database or cluster failures",
        "Ignoring cloud egress bandwidth costs and idle infrastructure spend",
      ],
      adaptiveNotes: "Test with large-scale failure scenarios (region loss, certificate expiry, cascading DDOS) and evaluate leadership.",
    },
  },

  ML_AI: {
    JUNIOR: {
      trackName: "ML & AI Engineering",
      rolePersona: "Senior AI Researcher evaluating an Entry-Level ML / AI Engineer (0-2 years)",
      focusDomain: "Data preprocessing, train/val/test splits, classic ML metrics (Precision/Recall/F1), basic RAG, and model evaluation.",
      categoryDefinitions: `1. **Technical Accuracy**: Correct understanding of supervised vs unsupervised learning, overfitting/underfitting, embeddings, and loss functions.
2. **Problem Solving**: Handling missing data, class imbalance (SMOTE/class weights), and basic prompt engineering with context injection.
3. **Communication**: Explaining model evaluation results and metric trade-offs clearly.
4. **Engineering Depth**: Basic understanding of vector databases, token limits, and serving models with FastAPI/Flask.`,
      scoreBands: {
        noHire: "Cannot explain basic ML concepts (e.g. data leakage, precision vs recall) or confused about embeddings.",
        leanNoHire: "Knows library syntax (scikit-learn, PyTorch) but doesn't understand why a model is overfitting or how to evaluate it.",
        hire: "Solid junior ML engineer: cleans data properly, selects correct evaluation metrics, builds simple RAG pipelines, serves predictions via API.",
        strongHire: "Exceptional junior: understands chunking trade-offs in RAG, fine-tuning basics (LoRA), and implements automated evaluation metrics.",
      },
      greenFlags: [
        "Correctly identifies and prevents data leakage across train/test splits",
        "Chooses Precision vs Recall intentionally based on business cost of false positives vs false negatives",
        "Understands tokenization and vector similarity metrics (Cosine, Dot Product)",
      ],
      redFlags: [
        "Evaluating a classification model with severe class imbalance using only Accuracy",
        "Training on test data or scaling features before splitting datasets",
      ],
      adaptiveNotes: "Focus on clean data practices, metric comprehension, and foundational LLM/embedding workflows.",
    },
    MID: {
      trackName: "ML & AI Engineering",
      rolePersona: "Staff AI Engineer evaluating a Mid-Level ML / AI Engineer (2-5 years)",
      focusDomain: "End-to-end ML pipelines, advanced RAG architectures, vector indexing, model serving optimization, and drift monitoring.",
      categoryDefinitions: `1. **Technical Accuracy**: Deep knowledge of vector index algorithms (HNSW, IVF), embedding model selection, quantization (AWQ/GPTQ), and prompt evaluation frameworks.
2. **Problem Solving**: Optimizing RAG retrieval accuracy with re-rankers, reducing LLM inference latency, handling context overflow, and detecting data drift.
3. **Communication**: Articulating trade-offs between fine-tuning vs RAG, small specialized models vs large frontier LLMs.
4. **Engineering Depth**: Understanding GPU memory allocation (VRAM), batching strategies (vLLM continuous batching), and LLM-as-a-judge evaluation frameworks.`,
      scoreBands: {
        noHire: "Treats LLMs as a magic black box without understanding retrieval bottlenecks, latency constraints, or evaluation metrics.",
        leanNoHire: "Builds standard RAG but cannot handle retrieval failures, hallucinations, context fragmentation, or high serving costs.",
        hire: "Strong mid-level AI engineer: implements advanced RAG (re-ranking, hybrid search), optimizes inference latency, tracks model drift in production.",
        strongHire: "Near-senior AI architect: designs multi-agent orchestration, implements automated hallucination guardrails, fine-tunes open models with LoRA/QLoRA.",
      },
      greenFlags: [
        "Implements hybrid search (Dense embeddings + Sparse BM25) with cross-encoder re-ranking",
        "Profiles and optimizes inference throughput using vLLM, TensorRT-LLM, or Ollama",
        "Establishes automated evaluation pipelines (Ragas, DeepEval, G-Eval)",
      ],
      redFlags: [
        "Blindly increasing chunk size without evaluating retrieval precision vs context pollution",
        "Deploying LLM features without rate limiting, token cost tracking, or fallback mechanisms",
      ],
      adaptiveNotes: "Evaluate production ML systems engineering, retrieval quality, and latency/cost trade-offs.",
    },
    SENIOR: {
      trackName: "ML & AI Engineering",
      rolePersona: "Principal AI Architect evaluating a Senior / Lead AI Systems Engineer (5+ years)",
      focusDomain: "Enterprise AI platforms, multi-step LLM agent systems, model fine-tuning & distillation, vector databases at scale, and AI governance.",
      categoryDefinitions: `1. **Technical Accuracy**: Masterful understanding of attention mechanics (FlashAttention), parameter-efficient fine-tuning (LoRA, QLoRA, DPO), KV-cache optimization, and semantic caching.
2. **Problem Solving**: Multi-step autonomous agent architectures, reliable tool-calling guardrails, self-healing workflows, and scaling vector search to billions of embeddings.
3. **Communication**: Strategic AI roadmapping, ROI analysis (build vs buy, open-weight vs proprietary API), and AI ethics/security leadership.
4. **Engineering Depth**: Deep mastery of GPU cluster orchestration (CUDA, Triton), model quantization degradation bounds, and adversarial prompt injection defenses.`,
      scoreBands: {
        noHire: "Lacks systems-level AI depth; unable to optimize serving throughput, prevent agent looping, or govern model drift at scale.",
        leanNoHire: "Good theoretical knowledge but lacks hands-on production experience in high-concurrency LLM serving, agent reliability, or fine-tuning economics.",
        hire: "Senior AI systems leader: masterfully architects reliable LLM agent pipelines, optimizes high-throughput model serving, enforces enterprise guardrails.",
        strongHire: "Principal AI master: world-class expertise in distributed AI systems, custom model distillation, cutting-edge retrieval topologies, and AI governance.",
      },
      greenFlags: [
        "Designs autonomous agent loops with deterministic state machines and loop-break guardrails",
        "Optimizes KV-cache memory and implements speculative decoding or prompt caching for low latency",
        "Defends against indirect prompt injection, jailbreaks, and sensitive data exfiltration",
      ],
      redFlags: [
        "Allowing autonomous LLM agents to execute destructive actions without human-in-the-loop or sandboxing",
        "Assuming proprietary frontier APIs are the only solution without evaluating distilled open-weight models for cost/speed",
      ],
      adaptiveNotes: "Hold the candidate to cutting-edge 2025 AI engineering rigor: agent reliability, KV-cache serving, and security guardrails.",
    },
  },
};

export function getEvaluationPrompt(params: EvaluationPromptParams): string {
  const { experienceLevel, track, transcriptFormatted, githubMetadata } = params;

  // Fallback to FULLSTACK_GENERAL if track is unknown
  const trackKey = (RUBRIC_MATRIX[track] ? track : "FULLSTACK_GENERAL") as keyof typeof RUBRIC_MATRIX;
  const levelRubrics = RUBRIC_MATRIX[trackKey] || RUBRIC_MATRIX["FULLSTACK_GENERAL"]!;
  const rubric = levelRubrics[experienceLevel] || levelRubrics["MID"]!;

  const isBehavioral = track === "BEHAVIORAL";
  const isDSA = track === "DSA";

  return `You are a ${rubric.rolePersona}.
You are conducting an objective, deeply rigorous, evidence-based technical interview evaluation for the **${rubric.trackName}** track.
Target Experience Level Baseline: **${experienceLevel}** (${experienceLevel === "JUNIOR" ? "0-2 years" : experienceLevel === "SENIOR" ? "5+ years" : "2-5 years"}).

### EVALUATION DOMAIN CONTEXT:
${rubric.focusDomain}

### CANDIDATE GITHUB CONTEXT:
${githubMetadata ? (typeof githubMetadata === "string" ? githubMetadata : JSON.stringify(githubMetadata, null, 2)) : "No public repository context provided."}

### INTERVIEW TRANSCRIPT:
${transcriptFormatted}

### STANDARDIZED SCORING CALIBRATION RUBRIC (${experienceLevel} Baseline):
- **0.0 - 3.9 (No Hire)**: ${rubric.scoreBands.noHire}
- **4.0 - 5.9 (Lean No Hire)**: ${rubric.scoreBands.leanNoHire}
- **6.0 - 7.9 (Hire - ${experienceLevel} Expectations Met)**: ${rubric.scoreBands.hire}
- **8.0 - 10.0 (Strong Hire - Exceptional ${experienceLevel})**: ${rubric.scoreBands.strongHire}

### LOOK-FORS & GREEN FLAGS (Positive Signals for High Scores):
${rubric.greenFlags.map((flag) => `- [POSITIVE]: ${flag}`).join("\n")}

### PITFALLS & RED FLAGS (Negative Signals for Low Scores):
${rubric.redFlags.map((flag) => `- [NEGATIVE]: ${flag}`).join("\n")}

### ADAPTIVE SCORING & CALIBRATION PROTOCOL:
1. **Anchor on Declared Level**: Evaluate the candidate's baseline against the ${experienceLevel} rubric.
2. **Reward Successful Stretch**: If the interviewer probed upward into harder questions and the candidate handled them well, award a higher score (8.0+) and explicitly praise this in the summary.
3. **Fairness on Stretch Questions**: ${rubric.adaptiveNotes}
4. **Observed vs Declared Calibration**: In the summary, state the candidate's observed capability level clearly (e.g., "Declared: ${experienceLevel} | Observed: Strong Mid-level capability").

### 4 EVALUATION CATEGORIES & DEFINITIONS:
${rubric.categoryDefinitions}

${isBehavioral ? `NOTE: For Behavioral track, the output JSON category keys map as:
- technicalAccuracy -> Situation & Task Framing score and feedback
- problemSolving -> Action Quality & Initiative score and feedback
- communication -> Impact Articulation & Clarity score and feedback
- depth -> Leadership Signals & Culture score and feedback` : ""}

${isDSA ? `NOTE: For DSA track, the output JSON category keys map as:
- technicalAccuracy -> Algorithmic Correctness score and feedback
- problemSolving -> Optimization Ability score and feedback
- communication -> Communication & Invariants score and feedback
- depth -> Complexity Analysis & Memory Bounds score and feedback` : ""}

### STRICT OUTPUT FORMAT INSTRUCTIONS:
- You must respond with ONLY a valid, parseable JSON object matching the schema below.
- Do NOT output any markdown commentary outside the JSON block.
- Provide detailed, constructive, and actionable feedback in every field.
- In the "evidence" array, extract 2 to 4 verbatim quotes directly from the transcript, each paired with a sharp technical assessment.

JSON Schema:
{
  "overallScore": number (0.0 to 10.0, one decimal place),
  "recommendation": "Strong Hire" | "Hire" | "Lean Hire" | "No Hire",
  "summary": "string (2-3 concise sentences detailing executive assessment and observed level)",
  "categories": {
    "technicalAccuracy": {
      "score": number (0.0 to 10.0),
      "feedback": "string (detailed domain-specific feedback on correctness and mechanics)"
    },
    "problemSolving": {
      "score": number (0.0 to 10.0),
      "feedback": "string (detailed feedback on trade-offs and edge case handling)"
    },
    "communication": {
      "score": number (0.0 to 10.0),
      "feedback": "string (feedback on structure, articulation, and conciseness)"
    },
    "depth": {
      "score": number (0.0 to 10.0),
      "feedback": "string (feedback on underlying systems depth vs superficial buzzwords)"
    }
  },
  "strengths": [
    "string (Top strength with technical specifics)",
    "string (Second key strength)",
    "string (Third key strength)"
  ],
  "improvements": [
    "string (Concrete actionable area for technical improvement)",
    "string (Second actionable improvement area)"
  ],
  "evidence": [
    {
      "quote": "string (verbatim transcript excerpt)",
      "assessment": "string (concrete technical analysis of why this quote demonstrates mastery or a gap)"
    }
  ]
}`;
}
