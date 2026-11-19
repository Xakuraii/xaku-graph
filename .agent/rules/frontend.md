# Frontend Engineering Rules

1. **Strict Types:** TypeScript strict mode is enabled. No `any` types unless interfacing with dynamic third-party JS.
2. **Component Separation:** Keep API requests in `src/services/` and state/logic in hooks or container components.
3. **Styling:** Use Tailwind CSS utility classes with dark/light mode compatibility.
4. **Theme Support:** Use the `dark:` variant across components.
5. **Testing:** Write Vitest unit and integration tests under `web/tests/`.
