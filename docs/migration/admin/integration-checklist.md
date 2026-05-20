# Admin Integration Checklist

Manual checks for the migrated admin app before marking cross-domain integration complete.

## Auth and Routing

- [ ] Unauthenticated access to `/dashboard` redirects to `/login`.
- [ ] Unauthenticated access to `/resources/agents`, `/resources/prompts`, `/resources/sensitive-words`, `/simulations`, `/engine-dispatch`, `/users`, and `/settings` redirects to `/login`.
- [ ] Authenticated access to an unknown admin route redirects to `/dashboard`.
- [ ] Authenticated `/dashboard` loads the dashboard and keeps the sidebar active state on 数据看板.
- [ ] Sidebar active state is correct for every documented admin route.

## Resources

- [ ] `/resources/agents` loads; agent create, edit, delete, engine binding, prompt binding, and sensitive-word binding flows work.
- [ ] `/resources/prompts` loads; prompt create, edit, delete, version display, and Markdown preview flows work.
- [ ] `/resources/sensitive-words` loads; sensitive-word library create, edit, delete, and word parsing flows work.
- [ ] `/engine-dispatch` loads; model engine create, edit, delete, endpoint, and API key handling flows work.

## Simulations and Users

- [ ] `/simulations` loads; subject and grade filters work, tree expansion works, and enable/disable changes persist.
- [ ] `/users` loads; search, status toggle, blacklist toggle, quota display, and delete flows work.

## Operations

- [ ] `/operations/activities` loads; activity notice create, edit, delete, published, and draft flows work.
- [ ] `/operations/fission` loads; invite tree expansion, reward configuration, activity status, and second-level commission flows work.

## Security and Alarm

- [ ] `/security/system-audit` loads; filtering and CSV export dialog flows work.
- [ ] `/security/content-audit` loads; filtering, CSV export dialog, and soft-delete flows work.
- [ ] `/security/traffic-monitor` loads; model token, latency, and cost metrics render.
- [ ] `/alarm` loads; cost threshold and notification email settings save correctly.

## Settings

- [ ] `/settings` loads; password change validation and sign-out flows work.
