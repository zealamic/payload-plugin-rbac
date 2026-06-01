# Collections Guide

This guide lists every collection the RBAC plugin registers, how to customize them, and how user collection modification works.

> **Payload version:** This plugin targets **Payload CMS 3.x** (`peerDependencies: payload ^3.84.1`). It is **not compatible with Payload 2.x**. Collection schemas, Admin UI (Next.js App Router), relationship storage, and the Local API differ between major versions — do not follow v2 integration guides when using this plugin.
>
> Relationship fields (`permissionFeature`, `role`, etc.) store document IDs. Behavior on delete depends on your database adapter (MongoDB, Postgres via Drizzle, SQLite) and Payload config.

## Plugin collections at a glance

The plugin adds **five collections** and optionally modifies your **users** collection.

| Config key | Slug | Purpose | Default Admin access |
|---|---|---|---|
| `permissionActions` | `permission-actions` | Operation verbs (`create`, `read`, …) | Super admin only |
| `permissionFeatures` | `permission-features` | Resource areas (`users`, `posts`, …) | Super admin only |
| `permissions` | `permissions` | Feature + action pairs (enforceable units) | Super admin only |
| `roles` | `roles` | Named role definitions + permission matrix UI | Super admin only |
| `rolesPermissions` | `roles-permissions` | Join table: role ↔ permission ↔ enabled | Super admin only (hidden in Admin) |
| — | `users` (your app) | Auth collection augmented by plugin | Permission-based (see below) |

Config keys use **camelCase**. Database/API slugs use **kebab-case** where applicable.

```
permission-features ──┐
permission-actions  ──┼──► permissions ◄── roles-permissions ──► roles ◄── users.roles
                      │
                      └── (paired by permissionFeature + permissionAction)
```

---

## Collection details

### `permission-actions`

Defines what operation can be performed.

| Field | Type | Notes |
|---|---|---|
| `code` | text | Unique, indexed (e.g. `create`, `read`, `update`, `delete`) |
| `type` | select | `main` or `sub` — controls matrix layout |
| `sortOrder` | number | Display order in matrix (default `0`) |
| `status` | select | `active` or `inactive` |

### `permission-features`

Defines which resource area is protected.

| Field | Type | Notes |
|---|---|---|
| `code` | text | Unique, indexed — must match `featureCode` in `getPermissionAccess` |
| `sortOrder` | number | Display order in matrix |
| `status` | select | `active` or `inactive` |

### `permissions`

Links one feature to one action. Runtime access checks resolve against these records.

| Field | Type | Notes |
|---|---|---|
| `name` | text | Human-readable label |
| `permissionFeature` | relationship | → `permission-features` |
| `permissionAction` | relationship | → `permission-actions` |
| `sortOrder` | number | Optional ordering |
| `status` | select | Only `active` permissions are enforced |

### `roles`

Groups permissions for assignment to users.

| Field | Type | Notes |
|---|---|---|
| `code` | text | Unique, indexed machine identifier |
| `name` | text | Display name |
| `description` | text | Optional |
| `status` | select | `active` or `inactive` |
| `permissionMatrixDraft` | json | Custom matrix UI (update screen only) |

**Field name vs translation key:** the schema field is `permissionMatrixDraft`. In `translations.collections.roles.fields`, the label key is `permissionMatrix` (it only controls the Admin label for that field). When overriding via `collections.roles.fields`, use the schema name `permissionMatrixDraft`.

```ts
// ✅ translations — label key
translations: {
  en: {
    collections: {
      roles: {
        fields: {
          permissionMatrix: { label: "Permission Matrix" },
        },
      },
    },
  },
}

// ✅ collections.fields — schema field name
collections: {
  roles: {
    fields: [
      {
        name: "permissionMatrixDraft",
        type: "json",
        admin: { hidden: true },
      },
    ],
  },
}
```

### `roles-permissions`

Persists which permissions a role has enabled.

| Field | Type | Notes |
|---|---|---|
| `role` | relationship | → `roles` |
| `permission` | relationship | → `permissions` |
| `enabled` | checkbox | Default `true` |

Hidden in Admin by default — manage via the role permission matrix on the `roles` collection.

---

## How to customize a collection

Pass overrides under `collections` in plugin config:

```ts
import {
  getPermissionAccess,
  payloadAuthRbacPlugin,
} from "@zealamic/payload-auth-rbac-plugin";

export const rbacPlugin = payloadAuthRbacPlugin({
  collections: {
    permissionActions: { /* overrides */ },
    permissionFeatures: { /* overrides */ },
    permissions: { /* overrides */ },
    roles: { /* overrides */ },
    rolesPermissions: { /* overrides */ },
  },
});
```

### Overridable attributes

Each collection accepts the same override shape:

| Attribute | What it does |
|---|---|
| `fields` | Add fields or merge with defaults **by field name** |
| `access` | Override collection access handlers (spread after defaults — your rules win) |
| `labels` | Override collection singular/plural labels directly |
| `admin` | Override Admin UI settings (group, columns, hidden, etc.) |

Labels and field text can also be customized via `translations`. See [TRANSLATIONS.md](./TRANSLATIONS.md).

### Field merge behavior

- Same `name` as a plugin default → **shallow-merged** (`{ ...pluginField, ...yourField }`)
- New field name → **appended** after defaults
- Wrong name → creates a **duplicate** field instead of replacing — always match existing names exactly

#### Hooks, validation, and nested field config

The merge is a **single-level object spread**, not a deep merge:

| Property on your override | Result |
|---|---|
| Top-level scalar (`required`, `type`, …) | Your value replaces the plugin default |
| `validate` | **Replaces** the plugin field's `validate` entirely — not chained |
| `hooks` | **Replaces** the plugin field's `hooks` entirely — not chained |
| `admin` | **Replaces** the entire `admin` object — nested keys are not merged |

Plugin collection fields ship **without field-level `hooks` or `validate`** today, so overrides typically add new logic rather than compete with existing hooks. If you add `hooks.beforeChange` on an override, only your handlers run for that field — the plugin does not append them to a hidden default.

**Practical rule:** if you override `admin` on a field, re-include any plugin behavior you still need (e.g. custom components, `condition`, placeholders). Copy the default shape from the plugin docs or inspect generated config in dev.

**Collection-level hooks** (`collections.hooks` on your host collection config) are unaffected by plugin field merges — they run on the collection as Payload normally orchestrates them.

### Example 1: Hide a field

Hide `sortOrder` on `permission-actions` in Admin:

```ts
collections: {
  permissionActions: {
    fields: [
      {
        name: "sortOrder",
        type: "number",
        admin: { hidden: true },
      },
    ],
  },
},
```

### Example 2: Override access

Allow non–super-admins with the right RBAC permission to read/update permission actions:

```ts
collections: {
  permissionActions: {
    access: {
      read: getPermissionAccess({
        featureCode: "permission-actions",
        actionCode: "read",
      }),
      update: getPermissionAccess({
        featureCode: "permission-actions",
        actionCode: "update",
      }),
    },
  },
},
```

Requires matching `permission-features`, `permission-actions`, and `permissions` records in the database.

### Example 3: Change Admin list columns

```ts
collections: {
  roles: {
    admin: {
      defaultColumns: ["code", "name", "status"],
    },
  },
},
```

### Example 4: Expose the join table for debugging

```ts
collections: {
  rolesPermissions: {
    admin: {
      hidden: false,
    },
  },
},
```

### Example 5: Add a custom field

```ts
collections: {
  roles: {
    fields: [
      {
        name: "department",
        type: "text",
        admin: { position: "sidebar" },
      },
    ],
  },
},
```

---

## Users collection modification

The plugin does **not** add a new users collection. It **augments** the collection referenced by `config.admin.user` (default slug: `users`).

Controlled by `autoModifyUsersCollection` (default: `true`).

### What the plugin adds

| Field | Type | Behavior |
|---|---|---|
| `isSuperAdmin` | checkbox | Full bypass for access checks; **read-only** in Admin |
| `roles` | relationship (hasMany) | Links to `roles` collection |

Appended to your existing user fields — your original schema is preserved.

### Default access on users

When modification is enabled, the plugin sets permission-based access using the **users collection slug** as `featureCode`:

| Access operation | `actionCode` |
|---|---|
| `create` | `create` |
| `read` | `read` |
| `update` | `update` |
| `delete` | `delete` |
| `readVersions` | `readVersions` |
| `unlock` | `unlock` |
| `admin` | `admin` |

Super admins (`isSuperAdmin: true`) bypass all checks.

**Important:** create a `permission-features` record with `code` equal to your users slug (usually `"users"`), plus matching actions and permissions, before expecting role-based user access to work.

### Enable / disable

```ts
// Default: plugin modifies users automatically
payloadAuthRbacPlugin({
  autoModifyUsersCollection: true,
})

// Full manual control
payloadAuthRbacPlugin({
  autoModifyUsersCollection: false,
})
```

When `false`, you must add `roles`, optionally `isSuperAdmin`, and wire `getPermissionAccess` on your users collection yourself.

### Customize user field labels

Use `translations.collections.users` (not `collections.users`):

```ts
payloadAuthRbacPlugin({
  autoModifyUsersCollection: true,
  translations: {
    en: {
      collections: {
        users: {
          fields: {
            isSuperAdmin: { label: "Super Admin" },
            roles: { label: "Assigned Roles" },
          },
        },
      },
    },
  },
})
```

### How existing vs missing users collection is handled

```
config.admin.user slug (default "users")
        │
        ├─ collection exists ──► append isSuperAdmin + roles fields
        │                        merge plugin access with existing access
        │
        └─ collection missing ──► create auth-enabled users collection
                                  with plugin fields + default access
```

Your collection's existing `access` rules are spread **after** the plugin defaults, so **your handlers override** the plugin's when both define the same operation.

### Setup checklist for users RBAC

1. Keep `autoModifyUsersCollection: true` (or wire access manually if `false`)
2. Seed `permission-features` with `code: "users"` (or your custom user slug)
3. Seed actions: `create`, `read`, `update`, `delete`, etc.
4. Create `permissions` rows for each feature + action pair
5. Assign permissions to roles via the matrix
6. Assign roles to users in Admin
7. Bootstrap the first super admin via Local API (see below) — the Admin UI cannot set `isSuperAdmin` because the field is read-only

### Bootstrap the first super admin

`isSuperAdmin` is read-only in Admin to prevent privilege escalation through the UI. Use a **seed script** or **`onInit`** with the Local API to create or promote the initial account:

```ts
import type { Payload } from "payload";

export const bootstrapSuperAdmin = async (payload: Payload) => {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@example.com";

  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
  });

  if (existing.docs.length) {
    // Promote existing user
    await payload.update({
      collection: "users",
      id: existing.docs[0].id,
      data: { isSuperAdmin: true },
      overrideAccess: true, // required — no super admin exists yet to pass access checks
    });
    return;
  }

  // Create first user
  await payload.create({
    collection: "users",
    data: {
      email,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "change-me",
      isSuperAdmin: true,
    },
    overrideAccess: true,
  });
};
```

Wire it in `payload.config.ts`:

```ts
export default buildConfig({
  onInit: async (payload) => {
    if (process.env.NODE_ENV !== "production") {
      await bootstrapSuperAdmin(payload);
    }
  },
  plugins: [payloadAuthRbacPlugin({ autoModifyUsersCollection: true })],
});
```

Use `overrideAccess: true` only in trusted bootstrap paths. Remove or guard this in production (e.g. run once via deploy script, then disable).

#### Production

In **production**, avoid running `bootstrapSuperAdmin` on every server start. Super admin accounts are few and long-lived — set `isSuperAdmin` **directly in the database** instead:

| Environment | Recommended approach |
|---|---|
| **Local / staging** | `onInit` or seed script with Local API (snippet above) |
| **Production** | One-time DB update for known accounts only |

Example (MongoDB — adjust field path for your adapter/schema):

```js
// Set isSuperAdmin on a specific user by email (run once, via mongosh or your DB tool)
db.users.updateOne(
  { email: "admin@yourcompany.com" },
  { $set: { isSuperAdmin: true } },
)
```

For Postgres/SQLite, run an equivalent `UPDATE` on your `users` table (`is_super_admin = true` or your column name).

**Why DB in production:**

- No bootstrap code or env vars (`BOOTSTRAP_ADMIN_PASSWORD`) in the running app
- No risk of `onInit` re-running or being misconfigured on deploy
- Fits the model: only a small number of break-glass accounts need super admin

After the DB change, that user can manage RBAC in Admin. Everyone else stays on roles only (`isSuperAdmin` remains read-only in the UI).

### Example: users with custom admin user slug

```ts
export default buildConfig({
  admin: {
    user: "members", // custom slug
  },
  plugins: [
    payloadAuthRbacPlugin({
      autoModifyUsersCollection: true,
    }),
  ],
  collections: [
    {
      slug: "members",
      auth: true,
      fields: [{ name: "email", type: "email", required: true }],
    },
  ],
});
```

The plugin targets `members`, adds `roles` + `isSuperAdmin` there, and uses `featureCode: "members"` in access checks. Seed permissions with `code: "members"` accordingly.

---

## Referential integrity and deletes

The plugin does **not** register cascade-delete hooks. Deleting a parent record does **not** automatically clean up dependent rows.

| Deleted record | Typical impact |
|---|---|
| `permission-features` | `permissions` rows still reference the deleted feature ID — access checks for that feature fail; stale Admin references possible |
| `permission-actions` | Same for `permissions` pointing at that action |
| `permissions` | `roles-permissions` rows still reference the deleted permission ID — those grants become dead |
| `roles` | `roles-permissions` rows and `users.roles` arrays may still hold the deleted role ID |
| `users` | No plugin cascade into roles or permissions |

**Default behavior:** Payload relationship fields store IDs. Unless you add `beforeDelete` / `afterDelete` hooks or manual cleanup jobs, **orphaned relationships are expected**.

**Recommended practices:**

1. Prefer **`status: inactive`** over hard deletes for features, actions, and permissions — runtime checks already ignore inactive permissions.
2. Before deleting a role, remove it from users and delete related `roles-permissions` rows (or hide the role via `status`).
3. Add collection hooks in your project if you need hard deletes:

```ts
// Example: clean join rows when a role is deleted
hooks: {
  beforeDelete: [
    async ({ id, req }) => {
      await req.payload.delete({
        collection: "roles-permissions",
        where: { role: { equals: id } },
        req,
      });
    },
  ],
},
```

4. On Postgres/SQLite (Drizzle), FK constraints depend on your Payload/database config — do not assume DB-level `ON DELETE CASCADE` unless you configured it.

---

## Quick reference: customization paths

| Goal | Use |
|---|---|
| Translate labels / placeholders | `translations` → [TRANSLATIONS.md](./TRANSLATIONS.md) |
| Hide or extend fields | `collections.<name>.fields` |
| Change who can CRUD | `collections.<name>.access` |
| Change Admin sidebar group / columns | `collections.<name>.admin` or `translations` |
| User field labels | `translations.collections.users` |
| Skip users modification entirely | `autoModifyUsersCollection: false` |

---

## Related docs

- [OVERVIEW.md](./OVERVIEW.md) — plugin setup, access model, seeding
- [TRANSLATIONS.md](./TRANSLATIONS.md) — i18n for collection and matrix labels
- [ROLE.md](./ROLE.md) — roles and permission matrix
- [USER.md](./USER.md) — user access and super-admin behavior

