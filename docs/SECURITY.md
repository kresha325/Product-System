# Security notes — Product System

This project stores catalog data **in the GitHub repository** and uses the **GitHub REST API from the browser** (via `VITE_GITHUB_TOKEN` embedded in the built static site).

## Important limitations

- **Anyone who can download your deployed JavaScript can extract the PAT** unless you remove token usage from the client.
- Admin authentication (`VITE_SUPERADMIN_*`, `VITE_ADMIN_CREDENTIALS`) is **frontend-only**; it prevents casual access to the UI but is **not** a hardened multi-user authorization system.
- Session state lives in **`sessionStorage`** on the device.

## Recommended hardening path

1. **Move writes off the client**: use GitHub Actions (`workflow_dispatch` + repository dispatch), a tiny serverless function, or a minimal backend that holds the PAT.
2. **Use a narrowly scoped token**: fine-grained PAT with **Contents: Read and write** for this repo only; rotate if exposed.
3. **Never commit** `.env` or live tokens; use **GitHub Actions secrets** for production builds only.
4. For real customers, add **rate limiting**, **audit trails you control**, and **per-tenant isolation** outside a public repo model.

This file is guidance only; threat model depends on how you deploy and who can access the site + repository.
