# edopro-live-viewer
A project to watch live duels from ygopro.

![Captura](https://github.com/termitaklk/edopro-live-viewer/assets/112192503/da03c8ab-0f11-4717-8aea-eff9e548a9ce)

## Run

```bash
npm start
```

Default URL: `http://localhost:8088`

## Notes

- Sessions now carry an explicit `clientFlow` (`edopro` or `mercury`) end-to-end (TCP -> SSE -> viewer).
- Flow is inferred from room metadata, but can be forced in `/api/watch` body using `clientFlow`.
- Room API base URL is validated (`ROOM_API_ALLOWED_HOSTS`, `ALLOW_PRIVATE_ROOM_API`).
