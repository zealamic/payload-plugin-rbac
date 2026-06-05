# Collections guide

This plugin targets **Payload CMS 3.x** (`payload ^3.84.1`). It is **not compatible with Payload 2.x**.

It registers **five RBAC collections** and optionally **augments your app's users collection**.

---

## Overview

```
permission-features ──┐
permission-actions  ──┼──► permissions ◄── roles-permissions ──► roles ◄── users.roles
```

| Config key (camelCase) | Slug (API)            | Purpose                                       |
| ---------------------- | --------------------- | --------------------------------------------- |
| `permissionActions`    | `permission-actions`  | Action verbs (`create`, `read`, …)            |
| `permissionFeatures`   | `permission-features` | Resource areas (`users`, `posts`, …)          |
| `permissions`          | `permissions`         | Feature + action pairs (enforceable units)    |
| `roles`                | `roles`               | Role definitions + permission matrix UI       |
| `rolesPermissions`     | `roles-permissions`   | Join table: role ↔ permission ↔ enabled       |
| —                      | `users` (app)         | Auth collection — plugin adds fields + access |

**Defaults:** only **super admins** can access the five RBAC collections. `roles-permissions` is **hidden** in Admin.

---

## Collection details

### `permission-actions`

| Field       | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `code`      | Unique code — must match `actionCode` in `getPermissionAccess` |
| `type`      | `main` (matrix column) or `sub` (sub-action row)               |
| `sortOrder` | Display order                                                  |
| `status`    | `active` / `inactive`                                          |

### `permission-features`

| Field       | Description                                              |
| ----------- | -------------------------------------------------------- |
| `code`      | Unique code — must match `featureCode` in access helpers |
| `sortOrder` | Display order                                            |
| `status`    | `active` / `inactive`                                    |

### `permissions`

| Field               | Description                            |
| ------------------- | -------------------------------------- |
| `name`              | Human-readable label                   |
| `permissionFeature` | → `permission-features`                |
| `permissionAction`  | → `permission-actions`                 |
| `sortOrder`         | Optional ordering                      |
| `status`            | Only `active` permissions are enforced |

### `roles`

| Field                   | Description                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `code`                  | Unique machine identifier                                                                          |
| `name`                  | Display name                                                                                       |
| `description`           | Optional                                                                                           |
| `status`                | `active` / `inactive`                                                                              |
| `dataScope`             | `own` / `hierarchy` / `all` — limits **which documents** a user can read/update/delete (see below) |
| `permissionMatrixDraft` | JSON field + custom matrix UI (update screen only)                                                 |

#### What is `dataScope`?

`dataScope` answers: _“After the user passes the permission check, which rows/documents can they see or change?”_

It works **together with** the permission matrix (`roles-permissions`). The matrix controls **whether** an action is allowed; `dataScope` controls **how far** that action reaches.

| Value       | Who can access documents                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `own`       | Only records the user created (`createdBy` = current user)                                                                          |
| `hierarchy` | Records created by the user **or** their subordinates in the user tree (`users.parent` / `parentPath`)                              |
| `all`       | Any record **within collections that use data-scope helpers** — still requires an enabled permission in the matrix (see note below) |

> **`all` vs `isSuperAdmin` — not the same thing**
>
> |                                    | `dataScope: all` (on a role)                                          | `isSuperAdmin: true` (on a user)                                        |
> | ---------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
> | **What it controls**               | Row-level filter only — “see all documents in this feature”           | Full bypass of RBAC permission + data-scope checks                      |
> | **Still needs matrix permission?** | **Yes** — user must have the feature/action enabled on a role         | **No** — skips `roles-permissions` entirely                             |
> | **Typical use**                    | Operational roles: “read/update all **posts**”, “read all **orders**” | Break-glass / platform admins: manage roles, permissions, system config |
> | **Privilege level**                | Lower than super admin                                                | Highest                                                                 |
>
> **Recommended split for developers:**
>
> - Use **`dataScope: all`** on **business roles** when someone should access all records of a _specific feature_ (e.g. all `posts`), but only for actions you grant in the matrix.
> - Reserve **`isSuperAdmin`** for a small set of accounts that manage **system-wide RBAC config**: `roles`, `permissions`, `permission-features`, `permission-actions`, and other global settings. Plugin RBAC collections default to `getSuperAdminAccess` for this reason.
> - Do **not** treat `all` as a substitute for super admin. A role with `all` on `posts` can read every post **only if** it has `posts` + `read` in the matrix — it cannot manage roles or permissions unless you explicitly grant those features too.
>
> Exact behavior depends on how you wire `access` on each collection (`getPermissionAccess` vs data-scope helpers). The table above reflects the **intended** separation.

**Multiple roles:** if a user has more than one role, the **widest** scope wins:

```
all  >  hierarchy  >  own
```

**Example:** a user with roles `Author` (`own`) and `Manager` (`hierarchy`) effectively gets `hierarchy`.

**Where it applies:** data-scope helpers such as `getPermissionAndDataScopeReadAccess` and `getPermissionAndDataScopeMutationAccess`. Plain `getPermissionAccess` checks permission only — no row filter.

**What you need in your app collections:**

1. A field storing the creator (default: `createdBy` → relationship to `users`)
2. Set it on create (hook or default value)
3. Pass `options: { createdByField: "createdBy" }` to data-scope helpers

```ts
// posts collection — read filtered by dataScope
read: getPermissionAndDataScopeReadAccess({
  featureCode: "posts",
  actionCode: "read",
  options: { createdByField: "createdBy" },
}),
```

**Users collection:** the plugin uses `createdByField: "id"` (each user document is “owned” by itself) and adds `parent` / `parentPath` for hierarchy. See [UTILS](https://github.com/zealamic/payload-auth-rbac-plugin/blob/main/docs/UTILS.md) for full helper reference.

**Super admin (`isSuperAdmin`):** bypasses permission checks **and** data scope on every helper. Use sparingly for platform administrators — not for everyday business roles. Set via seed/Local API only (`isSuperAdmin` is read-only in Admin).

**How the permission matrix works:**

1. Admin toggles checkboxes → updates `permissionMatrixDraft` on the form
2. **Save role** → `afterChange` hook syncs to `roles-permissions`
3. Runtime RBAC reads **`roles-permissions`**, not the JSON draft

**Field name vs translation key:** the schema field is `permissionMatrixDraft`; the translation label key is `permissionMatrix`:

```ts
translations: {
  en: {
    collections: {
      roles: {
        fields: {
          permissionMatrix: { label: "Permission Matrix" }, // label for permissionMatrixDraft
        },
      },
    },
  },
}
```

### `roles-permissions`

| Field        | Description                   |
| ------------ | ----------------------------- |
| `role`       | → `roles`                     |
| `permission` | → `permissions`               |
| `enabled`    | Grant on/off (default `true`) |

Managed via the matrix on the role edit screen — you normally do not open this collection in Admin.

---

## Users collection

The plugin does **not** add a separate users collection. It **augments** the collection referenced by `config.admin.user` (default: `users`).

Toggle with `autoModifyUsersCollection` (default: `true`).

### Fields the plugin adds

| Field          | Description                                          |
| -------------- | ---------------------------------------------------- |
| `isSuperAdmin` | Bypasses all checks; **read-only** in Admin          |
| `roles`        | hasMany relationship → `roles`                       |
| `parent`       | Relationship to parent user (for `hierarchy` scope)  |
| `parentPath`   | Hidden, auto-maintained — used for hierarchy lookups |

### Default access on users

`featureCode` = users collection slug (e.g. `"users"`).

| Operation      | `actionCode`            |
| -------------- | ----------------------- |
| `create`       | `create`                |
| `read`         | `read` (+ data scope)   |
| `update`       | `update` (+ data scope) |
| `delete`       | `delete` (+ data scope) |
| `readVersions` | `readVersions`          |
| `unlock`       | `unlock`                |

Seed a `permission-features` record with `code` equal to the users slug, plus matching actions and permissions.

**Your access overrides the plugin:** spread order is `{ ...pluginDefaults, ...yourAccess }` — your handler wins for the same operation.

### Bootstrap super admin

`isSuperAdmin` cannot be set in the Admin UI. Use a seed script or Local API:

```ts
await payload.update({
  collection: "users",
  id: userId,
  data: { isSuperAdmin: true },
  overrideAccess: true,
});
```

---

## Customizing collections

Pass overrides under `collections` in plugin config:

```ts
import {
  getPermissionAccess,
  payloadAuthRbacPlugin,
} from "@zealamic/payload-auth-rbac-plugin";

export default buildConfig({
  plugins: [
    payloadAuthRbacPlugin({
      autoModifyUsersCollection: true,
      collections: {
        permissionActions: {
          /* ... */
        },
        permissionFeatures: {
          /* ... */
        },
        permissions: {
          /* ... */
        },
        roles: {
          /* ... */
        },
        rolesPermissions: {
          /* ... */
        },
      },
      translations: {
        /* label i18n — see TRANSLATIONS.md */
      },
    }),
  ],
});
```

### What you can override

| Property | Effect                                              |
| -------- | --------------------------------------------------- |
| `fields` | Add fields or merge with defaults **by field name** |
| `access` | Override access handlers (spread after defaults)    |
| `labels` | Collection singular/plural labels                   |
| `admin`  | Group, columns, hidden, etc.                        |

### Field merge rules

- **Same `name`** → shallow merge `{ ...pluginField, ...yourField }`
- **New name** → appended after defaults
- **Wrong name** → duplicate field — always match existing names exactly

`admin`, `hooks`, and `validate` on a field override **replace** the plugin field's values entirely (no deep merge).

---

## Customization examples

### 1. Hide a field in Admin

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

### 2. Let non–super-admins read/update permission-actions

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

### 3. Change role list columns

```ts
collections: {
  roles: {
    admin: {
      defaultColumns: ["code", "name", "dataScope", "status"],
    },
  },
},
```

### 4. Add a custom field to roles

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

### 5. Expose `roles-permissions` for debugging

```ts
collections: {
  rolesPermissions: {
    admin: { hidden: false },
  },
},
```

### 6. Translate user field labels (not via `collections.users`)

```ts
payloadAuthRbacPlugin({
  translations: {
    en: {
      collections: {
        users: {
          fields: {
            roles: { label: "Assigned Roles" },
            isSuperAdmin: { label: "Super Admin" },
          },
        },
      },
    },
  },
});
```

### 7. Custom users slug (`admin.user`)

```ts
export default buildConfig({
  admin: { user: "members" },
  plugins: [payloadAuthRbacPlugin({ autoModifyUsersCollection: true })],
  collections: [
    {
      slug: "members",
      auth: true,
      fields: [{ name: "email", type: "email", required: true }],
    },
  ],
});
```

Seed `permission-features` with `code: "members"` to match the slug.

### 8. Disable auto-modify users

```ts
payloadAuthRbacPlugin({
  autoModifyUsersCollection: false,
});
```

You must add `roles`, `isSuperAdmin`, and wire `getPermissionAccess` on the users collection yourself.

---

## Quick setup checklist

1. Register the plugin in `payload.config.ts`
2. Seed **permission-features** (`users`, `posts`, …)
3. Seed **permission-actions** (`create`, `read`, `update`, `delete`, …)
4. Create **permissions** (one row per feature + action pair)
5. Create **roles**, configure the matrix, and Save
6. Assign **roles** to users
7. Bootstrap a **super admin** (seed / DB)
8. Apply access helpers on app collections — see [UTILS](https://github.com/zealamic/payload-auth-rbac-plugin/blob/main/docs/UTILS.md)

---

## Deletes and referential integrity

The plugin does **not** cascade deletes. Recommended:

- Prefer `status: inactive` over deleting features, actions, or permissions
- Before deleting a role: remove it from users and delete related `roles-permissions` rows

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

---

## Quick reference

| Goal                       | Use                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Translate labels           | `translations` → [TRANSLATIONS](https://github.com/zealamic/payload-auth-rbac-plugin/blob/main/docs/TRANSLATIONS.md) |
| Hide / extend fields       | `collections.<key>.fields`                                                                                           |
| Change who can CRUD        | `collections.<key>.access`                                                                                           |
| Access helpers             | [UTILS](https://github.com/zealamic/payload-auth-rbac-plugin/blob/main/docs/UTILS.md)                                |
| Setup & plugin config      | [README](https://github.com/zealamic/payload-auth-rbac-plugin/blob/main/README.md)                                   |
| Disable users modification | `autoModifyUsersCollection: false`                                                                                   |

Working demos: `dev/rbac.ts`, `dev/collections/posts.ts`.
