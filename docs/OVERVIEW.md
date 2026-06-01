# RBAC Plugin Overview

## Why this plugin exists

Payload gives you authentication, but many projects also need **role-based authorization** that can be managed by non-developers in the Admin UI.

This plugin exists to:

- model permissions as data (`feature` + `action`)
- assign those permissions to roles
- assign roles to users
- enforce access with reusable helpers (`getPermissionAccess`, `getSuperAdminAccess`)
- support i18n for admin labels and the role-permission matrix UI

In short: it turns authorization rules into configurable database records instead of hardcoded conditionals.

## Design trade-offs

| Approach | Benefit | Cost |
|---|---|---|
| **Data-driven RBAC (this plugin)** | Permissions editable in Admin; roles reusable across users; no redeploy to change policy | Requires seed/bootstrap in every environment; runtime DB lookups on each access check |
| **Hardcoded `access` functions** | Fast, predictable, no seed step | Policy changes need code changes and redeploy; non-developers cannot manage permissions |
| **`autoModifyUsersCollection: true` (default)** | Plugin wires `roles`, `isSuperAdmin`, and user access automatically | Merges into your existing users collection; you must align `permission-features.code` with the users slug |
| **`collections` overrides** | Hide fields, override access, extend schema per plugin collection without forking source | Overrides merge by field name — wrong names create duplicate fields instead of replacing defaults |

The plugin deliberately keeps schema additions even when `disabled: true`, so migrations stay consistent across environments. See `src/index.ts`.

## What the plugin adds

When `payloadAuthRbacPlugin()` is enabled, it augments Payload config with:

- collection `permission-actions`
- collection `permission-features`
- collection `permissions`
- collection `roles`
- collection `roles-permissions` (hidden in Admin by default)
- optional automatic modification of the users collection (default `true`)
  - add `isSuperAdmin` (read-only in Admin)
  - add `roles` relationship to `roles`
  - apply permission-based `access` rules for user CRUD/admin operations

Each plugin collection can be customized via `pluginOptions.collections`:

```ts
payloadAuthRbacPlugin({
  collections: {
    permissionActions: {
      fields: [{ name: "sortOrder", type: "number", admin: { hidden: true } }],
      access: {
        read: getPermissionAccess({
          featureCode: "permission-actions",
          actionCode: "read",
        }),
      },
    },
  },
})
```

Supported keys: `permissionActions`, `permissionFeatures`, `permissions`, `roles`, `rolesPermissions`.

Main source: `src/index.ts`, demo: `dev/rbac.ts`.

## Access model at runtime

Authorization is resolved with this priority:

1. no logged-in user → deny
2. `req.user.isSuperAdmin === true` → allow (no DB round-trip)
3. fallback query on `users` collection for persisted `isSuperAdmin`
4. otherwise: find active `permissions` matching `featureCode` + `actionCode`, then check whether any of the user's roles has an enabled `roles-permissions` row

Main source: `src/lib/utils/access.ts`.

## Installation

```bash
# npm
npm install @zealamic/payload-auth-rbac-plugin

# pnpm
pnpm add @zealamic/payload-auth-rbac-plugin

# yarn
yarn add @zealamic/payload-auth-rbac-plugin
```

**Peer dependency:** `payload ^3.84.1`

## Quick start

Register the plugin in your Payload config:

```ts
import {
  getPermissionAccess,
  payloadAuthRbacPlugin,
} from "@zealamic/payload-auth-rbac-plugin";

export default buildConfig({
  plugins: [
    payloadAuthRbacPlugin({
      autoModifyUsersCollection: true,
      translations: {
        vi: {
          collections: {
            permissionActions: {
              labels: {
                singular: "Hành động quyền",
                plural: "Hành động quyền",
              },
            },
          },
        },
      },
    }),
  ],
});
```

Then in Admin:

1. create `permission-features` (example: `posts`, `users`)
2. create `permission-actions` (example: `create`, `read`, `update`, `delete`)
3. create `permissions` rows that pair feature + action
4. create roles and toggle permissions in the role matrix
5. assign roles to users

**Critical:** `permission-features.code` and `permission-actions.code` must match the strings passed to `getPermissionAccess`.

## Seed data and migration strategy

Features, actions, and permissions are **database records**, not config constants. The plugin does not auto-seed them on install — you must bootstrap them per environment.

### Recommended approach: `onInit` seed script

Chain your seed logic through Payload's `onInit` hook (the plugin already chains any existing `onInit` before its own):

```ts
// seed/rbac.ts
import type { Payload } from "payload";

const FEATURES = ["users", "posts"];
const ACTIONS = [
  { code: "create", type: "main" },
  { code: "read", type: "main" },
  { code: "update", type: "main" },
  { code: "delete", type: "main" },
];

export const seedRBAC = async (payload: Payload) => {
  for (const code of FEATURES) {
    const existing = await payload.find({
      collection: "permission-features",
      where: { code: { equals: code } },
      limit: 1,
    });
    if (!existing.docs.length) {
      await payload.create({
        collection: "permission-features",
        data: { code, status: "active" },
      });
    }
  }

  for (const { code, type } of ACTIONS) {
    const existing = await payload.find({
      collection: "permission-actions",
      where: { code: { equals: code } },
      limit: 1,
    });
    if (!existing.docs.length) {
      await payload.create({
        collection: "permission-actions",
        data: { code, type, status: "active" },
      });
    }
  }

  // Create permission pairs (feature + action) and default roles as needed
};
```

```ts
// payload.config.ts
import { seedRBAC } from "./seed/rbac";

export default buildConfig({
  onInit: async (payload) => {
    await seedRBAC(payload);
  },
  plugins: [payloadAuthRbacPlugin({ /* ... */ })],
});
```

### Environment strategy

| Environment | Strategy |
|---|---|
| **Local / dev** | Run seed in `onInit` or a dedicated `yarn dev:seed` script |
| **Staging / production** | Run seed once during deploy (idempotent upserts by `code`); avoid re-seeding on every server restart in production |
| **Schema migrations** | Plugin collections are added at config time; use `disabled: true` to keep schema without runtime wiring during migration windows |

The dev project seeds a default user only (`dev/seed.ts`). Extend it with RBAC records for local testing.

### Adding a new collection to RBAC later

When you add a new app collection (e.g. `orders`):

1. create a `permission-features` record with `code: "orders"`
2. ensure standard actions exist (`create`, `read`, `update`, `delete`)
3. create `permissions` rows for each pair
4. assign them to roles via the matrix or `roles-permissions`
5. wire `getPermissionAccess` on the new collection's `access` map

No plugin redeploy is needed — only new database records and collection config.

## Plugin options

From `PayloadAuthRbacPluginConfig` (`src/types.ts`):

| Option | Default | Description |
|---|---|---|
| `disabled` | `false` | Keeps collections/fields in schema; skips endpoint and i18n wiring |
| `translations` | `{}` | Deep-merged into default admin labels and matrix UI strings |
| `autoModifyUsersCollection` | `true` | Adds `isSuperAdmin`, `roles`, and permission-based user access |
| `collections` | — | Per-collection overrides: `fields`, `access`, `labels`, `admin` |

## How to use access helpers

### Collection-level access

Use `getPermissionAccess({ featureCode, actionCode })` in any collection `access` map:

```ts
import { getPermissionAccess } from "@zealamic/payload-auth-rbac-plugin";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: {
    create: getPermissionAccess({ featureCode: "posts", actionCode: "create" }),
    read: getPermissionAccess({ featureCode: "posts", actionCode: "read" }),
    update: getPermissionAccess({ featureCode: "posts", actionCode: "update" }),
    delete: getPermissionAccess({ featureCode: "posts", actionCode: "delete" }),
  },
  fields: [],
};
```

The plugin uses this pattern for the users collection automatically (`src/collections/users/index.ts`).

### Field-level access

**Yes — `getPermissionAccess` works on field `access` properties.**

The helper returns a standard Payload `Access` function that only reads `{ req }`. Extra arguments Payload passes to field access (`data`, `siblingData`, `id`, etc.) are simply ignored, so the same helper is valid for both collection and field scopes:

```ts
{
  name: "salary",
  type: "number",
  access: {
    read: getPermissionAccess({ featureCode: "users", actionCode: "readSalary" }),
    update: getPermissionAccess({ featureCode: "users", actionCode: "updateSalary" }),
  },
}
```

Requirements for field-level use:

- create matching `permission-features` / `permission-actions` / `permissions` records (e.g. feature `users`, action `readSalary`)
- assign those permissions to roles as usual

The plugin itself does not add field-level access to any built-in fields — only collection-level access on the users collection.

## How to modify safely

- **Extend fields**: pass `fields` in `collections.<name>`; merged by field name via `getArrayOfMergedFieldAffectingData` (`src/lib/utils/fields.ts`)
- **Override access**: pass `access` in `collections.<name>`; spread after defaults, so your rules win
- **Change labels/admin settings**: use `translations`, or pass `labels` / `admin` directly
- **Customize users behavior**:
  - easy mode: keep `autoModifyUsersCollection: true`
  - full control: set `autoModifyUsersCollection: false`, then add fields and access manually

## Data relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RBAC DATA MODEL                             │
└─────────────────────────────────────────────────────────────────────┘

  permission-features          permission-actions
  (code: "posts")              (code: "read", type: "main")
         │                              │
         └──────────┬───────────────────┘
                    ▼
               permissions                    roles
          (feature + action pair)         (code: "editor")
                    │                          │
                    └────────┬─────────────────┘
                             ▼
                    roles-permissions
                    (role + permission + enabled)
                             │
                             ▼
                          users
                    (roles[], isSuperAdmin)
                             │
                             ▼
                    getPermissionAccess()
                    checks at request time
```

**Resolution flow for a single request:**

```
User request
    │
    ├─ not authenticated ──────────────────────────► DENY
    │
    ├─ isSuperAdmin (inline or DB) ────────────────► ALLOW
    │
    └─ load user's role IDs
           │
           ├─ find active permission where
           │    permissionFeature.code = featureCode
           │    permissionAction.code  = actionCode
           │
           └─ find roles-permissions where
                role IN userRoleIDs
                permission IN matchedPermissionIDs
                enabled = true
                     │
                     ├─ found ──► ALLOW
                     └─ not found ► DENY
```

## Performance and caching

The plugin **does not implement request-level caching** today. Each call to a `getPermissionAccess` handler may trigger up to **two database queries**:

1. `permissions` — filter by `status`, `permissionFeature.code`, `permissionAction.code`
2. `roles-permissions` — filter by `role`, `permission`, `enabled`

Additional queries occur when:

- `isSuperAdmin` is not on the session user → one extra `users` lookup
- multiple collection/field access checks run in the same request → queries repeat per check

**Indexes applied by the plugin:**

| Collection | Indexed fields |
|---|---|
| `permission-actions` | `code` (`unique`, `index: true`) |
| `permission-features` | `code` (`unique`, `index: true`) |
| `roles` | `code` (`unique`, `index: true`) |
| `permissions` | relationship fields (no explicit `index: true`) |
| `roles-permissions` | relationship fields (no explicit `index: true`) |

**Recommendations for production:**

- ensure your database adapter creates indexes on relationship fields used in `where` clauses
- populate `req.user.roles` with IDs at login so role resolution does not require extra population queries
- set `isSuperAdmin` on the session JWT/user payload to avoid the fallback DB lookup
- for high-traffic endpoints, consider wrapping `getPermissionAccess` with a request-scoped cache (e.g. `Map` on `req.context`) — not provided out of the box

## Notes and caveats

- RBAC management collections default to super-admin-only access (`getSuperAdminAccess`)
- `roles-permissions` Admin view is hidden; the role matrix on the `roles` collection is the intended UI
- role matrix appears only on the role **update** screen (`id` required)
- matrix checkbox state is stored in `permissionMatrixDraft` (JSON field); translate its label via `translations.collections.roles.fields.permissionMatrix`; verify your save flow persists to `roles-permissions`
- client export: `@zealamic/payload-auth-rbac-plugin/client` (`RolePermissionMatrixClient`)
- RSC export is currently empty (`src/exports/rsc.ts`)

## Related docs

- [TRANSLATIONS.md](./TRANSLATIONS.md) — Custom translations guide
