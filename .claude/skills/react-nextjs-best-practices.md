---
name: react-nextjs-best-practices
description: "React and Next.js performance optimization and best practices. Use when building React components, Next.js pages, data fetching, bundle optimization, or performance improvements. Covers SSR, RSC, suspense, streaming, caching, and production patterns."
---

# React & Next.js Best Practices

## Component Patterns

### Server vs Client Components (Next.js 14+)
- Default to Server Components (no "use client")
- Add "use client" only when using: useState, useEffect, event handlers, browser APIs
- Keep client components small and leaf-level
- Pass server data down as props, don't fetch in client components

### Performance
- Use `React.memo()` only when profiling shows re-render issues
- Use `useMemo`/`useCallback` for expensive computations or stable references to child props
- Avoid premature optimization — measure first
- Use `dynamic()` for heavy components not needed on initial load

### State Management
- Start with useState + useReducer + Context
- Only add Zustand/Redux when Context causes perf issues
- Colocate state — keep it as close to where it's used as possible
- Avoid global state for server-fetchable data

## Data Fetching

### Next.js App Router
```typescript
// Server Component — fetch directly, no hook needed
async function Page() {
  const data = await fetch('...', { next: { revalidate: 60 } })
  return <Component data={data} />
}
```

### SSE/Streaming (for Probe interview flow)
```typescript
// Client component for SSE
'use client'
function InterviewStream({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  
  useEffect(() => {
    const es = new EventSource(`/api/interview/${sessionId}/stream?token=...`)
    es.addEventListener('question', (e) => {
      setMessages(prev => [...prev, JSON.parse(e.data)])
    })
    return () => es.close()
  }, [sessionId])
}
```

## Bundle Optimization

- Use `next/dynamic` for below-the-fold components
- Use `next/image` for all images (auto WebP, lazy loading)
- Use `next/font` for font loading (no layout shift)
- Check bundle with `@next/bundle-analyzer`
- Tree-shake icon libraries: `import { Icon } from 'lucide-react'` not `import * as Icons`

## File Structure (Probe Web)

```
app/
├── layout.tsx          — Root layout (fonts, metadata)
├── page.tsx            — Landing/home
├── (auth)/
│   └── login/page.tsx  — Login (no layout chrome)
├── (main)/
│   ├── layout.tsx      — Authenticated layout (navbar)
│   ├── interview/
│   │   ├── setup/page.tsx
│   │   ├── [uuid]/page.tsx      — "use client" (SSE)
│   │   └── [uuid]/report/page.tsx
│   └── history/page.tsx
components/
├── ui/                 — Base components (Button, Card, Input)
├── interview/          — Interview-specific (ChatBubble, Timer)
└── report/             — Report-specific (RadarChart, ScoreCard)
lib/
├── api.ts              — Fetch wrapper
├── sse.ts              — EventSource wrapper
└── auth.ts             — Token management
```

## Error Handling

```typescript
// app/error.tsx — Global error boundary
'use client'
export default function Error({ error, reset }) {
  return (
    <div>
      <p>出了点问题</p>
      <button onClick={reset}>重试</button>
    </div>
  )
}

// app/loading.tsx — Global loading
export default function Loading() {
  return <Skeleton />  // or spinner
}
```

## SSE Best Practices (Critical for Probe)

1. Token via query param (EventSource doesn't support headers)
2. Implement reconnection with Last-Event-ID
3. Handle all event types exhaustively
4. Show connection status to user
5. Buffer rapid events (requestAnimationFrame for typewriter)
6. Clean up on unmount and page navigation
