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

**Defaults:** only **super admins** can access the five RBAC collections (`getSuperAdminAccess` on CRUD, `readVersions`, `unlock`, and Admin visibility). `roles-permissions` is **hidden** in Admin.

`permission-actions` and `permission-features` list views include a built-in **Reorder** drawer for `sortOrder` (see [collection details](#permission-actions) below).

Set `disabled: true` on the plugin to skip runtime hooks/i18n registration while keeping collections in the schema (useful for migrations).

---

## Collection details

### `permission-actions`

| Field       | Description                                                                             |
| ----------- | --------------------------------------------------------------------------------------- |
| `code`      | Unique code — must match `actionCode` in `getPermissionAccess`                          |
| `type`      | `main` (matrix column) or `sub` (sub-action row)                                        |
| `sortOrder` | Display order in matrix — **hidden** in edit form; set via **Reorder** on the list view |
| `status`    | `active` / `inactive` — only `active` rows appear in matrix                             |

**Admin defaults:**

- List **default sort:** `updatedAt` (override with `collections.permissionActions.defaultSort` if needed)
- **Reorder** button above the list (`PermissionActionReorderClient`) — drag-and-drop drawer; main and sub actions are reordered **independently** (`sortOrder` `0…n` per `type`)
- Type selector labels in the drawer use `translations.collections.permissionActions.fields.type.mainLabel` / `subLabel` — see [TRANSLATIONS — Reorder drawers](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md#reorder-drawers)

Matrix and reorder APIs fetch actions with `sort=sortOrder`.

### `permission-features`

| Field       | Description                                                                         |
| ----------- | ----------------------------------------------------------------------------------- |
| `code`      | Unique code — must match `featureCode` in access helpers                            |
| `sortOrder` | Row order in matrix — **hidden** in edit form; set via **Reorder** on the list view |
| `status`    | `active` / `inactive` — only `active` rows appear in matrix                         |

**Admin defaults:**

- List **default sort:** `updatedAt`
- **Reorder** button above the list (`PermissionFeatureReorderClient`) — single draggable list

Matrix and reorder APIs fetch features with `sort=sortOrder`.

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

**Multiple roles:** if a user has more than one role, the **widest** scope wins:

```
all  >  hierarchy  >  own
```

**Example:** a user with roles `Author` (`own`) and `Manager` (`hierarchy`) effectively gets `hierarchy`.

**Where it applies:** pass `options` to `getPermissionAccess` for read filters, or `mode: "modify"` for per-document `update` / `delete`. Plain `getPermissionAccess` without `options` checks permission only — no row filter.

**What you need in your app collections:**

1. A field storing the creator (default: Payload `createdBy` → relationship to `users`)
2. Set it on create (hook or default value)
3. Pass `options` to `getPermissionAccess` only when the ownership field or users collection slug differs from the defaults (`createdBy` / `users`)

```ts
// posts collection — read filtered by dataScope (options defaults to createdBy + users)
read: getPermissionAccess({
  featureCode: "posts",
  actionCode: "read",
  options: {},
}),
update: getPermissionAccess({
  featureCode: "posts",
  actionCode: "update",
  mode: "modify",
}),
```

See [UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md) for the full `getPermissionAccess` reference.

**Users collection:** the plugin uses `createdByField: "id"` (each user document is “owned” by itself) and adds `parent` / `parentPath` for hierarchy.

**Super admin (`isSuperAdmin`):** bypasses permission checks **and** data scope on every helper. Use sparingly for platform administrators — not for everyday business roles. Set via seed/Local API only (`isSuperAdmin` is read-only in Admin).

**How the permission matrix works:**

1. Admin toggles checkboxes → updates `permissionMatrixDraft` on the form (update screen only)
2. **Save role** → `afterChange` hook syncs draft → `roles-permissions` (batch load + parallel writes)
3. Runtime RBAC reads **`roles-permissions`**, not the JSON draft

**Default matrix field:** `@zealamic/payload-plugin-rbac/client#RolePermissionMatrixClient`

**Field name vs translation key:** schema field = `permissionMatrixDraft`; translation label key = `permissionMatrix` — see [TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md).

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

Plugin fields are **prepended** before your existing fields (`[...pluginFields, ...collection.fields]`).

| Field          | Description                                          |
| -------------- | ---------------------------------------------------- |
| `isSuperAdmin` | Bypasses all checks; **read-only** in Admin          |
| `roles`        | hasMany relationship → `roles`                       |
| `parent`       | Relationship to parent user (for `hierarchy` scope)  |
| `parentPath`   | Hidden, auto-maintained — used for hierarchy lookups |

`parent` / `parentPath` hooks validate cycles and keep descendant paths in sync.

### Default access on users

`featureCode` = users collection slug (e.g. `"users"`).

The plugin wires **only** these operations by default:

| Operation | `actionCode` | Helper mode                                |
| --------- | ------------ | ------------------------------------------ |
| `create`  | `create`     | permission-only                            |
| `read`    | `read`       | read + data scope (`createdByField: "id"`) |
| `update`  | `update`     | `mode: "modify"` + data scope              |
| `delete`  | `delete`     | `mode: "modify"` + data scope              |

`readVersions`, `unlock`, and other operations are **not** set by the plugin — add them yourself with `getPermissionAccess` if needed.

Seed a `permission-features` record with `code` equal to the users slug, plus matching actions and permissions.

**Your access overrides the plugin:** for each operation, the plugin uses your handler when defined on the collection; otherwise it falls back to the plugin default. Spreading `collection.access` last means explicit keys on your collection win.

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

## Plugin config shape

```ts
payloadPluginRBAC({
  autoModifyUsersCollection?: boolean; // default true
  disabled?: boolean;
  translations?: RBACTranslations;
  components?: {
    rolePermissionMatrixField?: string; // import map path to custom Field component
  };
  collections?: {
    permissionActions?: CollectionOverrides;
    permissionFeatures?: CollectionOverrides;
    permissions?: CollectionOverrides;
    roles?: CollectionOverrides;
    rolesPermissions?: CollectionOverrides;
  };
});
```

`components.rolePermissionMatrixField` sets the matrix `admin.components.Field` on `roles.permissionMatrixDraft`. Alternative: override via `collections.roles.fields` (see examples).

---

## Customizing collections

Pass overrides under `collections` in plugin config:

```ts
import {
  getPermissionAccess,
  payloadPluginRBAC,
} from "@zealamic/payload-plugin-rbac";

export default buildConfig({
  plugins: [
    payloadPluginRBAC({
      autoModifyUsersCollection: true,
      components: {
        rolePermissionMatrixField:
          "./components/role-permission-matrix-field#RolePermissionMatrixField",
      },
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

| Property      | Effect                                              |
| ------------- | --------------------------------------------------- |
| `fields`      | Add fields or merge with defaults **by field name** |
| `access`      | Override access handlers (your keys win)            |
| `labels`      | Collection singular/plural labels                   |
| `admin`       | Group, columns, hidden, list components, etc.       |
| `defaultSort` | List view default sort field                        |

RBAC collection `access` is `{ ...pluginDefaults, ...yourAccess }` — your handlers replace the same operation keys.

### List view components (`beforeListTable`)

`permission-actions` and `permission-features` register a reorder client via `admin.components.beforeListTable`. Your `admin.components.beforeListTable` entries are **appended** after the plugin component (not replaced).

```ts
// Plugin always prepends:
// permission-actions  → PermissionActionReorderClient
// permission-features → PermissionFeatureReorderClient
```

To add your own list UI without removing reorder:

```ts
collections: {
  permissionActions: {
    admin: {
      components: {
        beforeListTable: ["./components/my-banner#MyListBanner"],
      },
    },
  },
},
```

Requires a matching entry in the Payload **import map** (`payload generate:importmap`).

### Field merge rules

When a host field shares the same `name` as a plugin default:

1. **Top-level properties** — shallow merge: `{ ...pluginField, ...yourField }` (your values win)
2. **`admin`** — deep merge: `{ ...pluginAdmin, ...yourAdmin }`
3. **`admin.components`** on **fields** — deep merge: default `Field` is kept unless you override the same component key
4. **`admin.components.beforeListTable`** on **collections** — plugin reorder client is **prepended**; your `beforeListTable` entries are appended (see [List view components](#list-view-components-beforelisttable))

Unmatched fields (new names, or layout fields like tabs) are **appended** after merged defaults.

```ts
// Override matrix visibility only — keeps default Field component
collections: {
  roles: {
    fields: [
      {
        name: "permissionMatrixDraft",
        type: "json",
        admin: {
          condition: (_, __, { operation }) => operation === "update",
        },
      },
    ],
  },
},
```

Always include `type: "json"` when overriding `permissionMatrixDraft` so Payload narrows the field type correctly.

---

## Customization examples

### 1. Show `sortOrder` on the edit form

`sortOrder` is **hidden by default** on `permission-actions` and `permission-features`. Order is managed via **Reorder** on each collection list view. To expose the field again:

```ts
collections: {
  permissionActions: {
    fields: [
      {
        name: "sortOrder",
        type: "number",
        admin: { hidden: false },
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

Requires matching `permission-features`, `permission-actions`, and `permissions` records in the database. Users need **`update`** access on `permission-actions` to save a new order from the reorder drawer.

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

### 5. Custom permission matrix field (checkbox / search UI)

```ts
payloadPluginRBAC({
  components: {
    rolePermissionMatrixField:
      "./components/role-permission-matrix-field#RolePermissionMatrixField",
  },
});
```

The component must be a client module that renders `RolePermissionMatrixClient` (optionally with `components` for custom renderers). See `dev/components/role-permission-matrix-field.tsx` and [TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md#custom-matrix-field-component-not-translations).

### 6. Expose `roles-permissions` for debugging

```ts
collections: {
  rolesPermissions: {
    admin: { hidden: false },
  },
},
```

### 7. Translate user field labels

```ts
payloadPluginRBAC({
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

User collection labels are **not** overridden via `collections.users` — use `translations` only.

### 8. Custom users slug (`admin.user`)

```ts
export default buildConfig({
  admin: { user: "members" },
  plugins: [payloadPluginRBAC({ autoModifyUsersCollection: true })],
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

### 9. Disable auto-modify users

```ts
payloadPluginRBAC({
  autoModifyUsersCollection: false,
});
```

You must add `roles`, `isSuperAdmin`, `parent` / `parentPath` (if using hierarchy), and wire `getPermissionAccess` on the users collection yourself.

### 10. Wire data scope on an app collection

Full example: `dev/collections/posts.ts` — `createdBy` field, create hook, and `getPermissionAccess` for CRUD.

---

## Quick setup checklist

1. Register the plugin in `payload.config.ts`
2. Seed **permission-features** (`users`, `posts`, …) — use **Reorder** on the list to set feature row order
3. Seed **permission-actions** (`create`, `read`, `update`, `delete`, …) — use **Reorder** to set main/sub column order
4. Create **permissions** (one row per feature + action pair)
5. Create **roles**, configure the matrix on the **update** screen, and Save
6. Assign **roles** to users
7. Bootstrap a **super admin** (seed / DB)
8. Apply `getPermissionAccess` on app collections — see [UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md)

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

| Goal                       | Use                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Translate labels           | `translations` → [TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md) |
| Reorder drawer copy        | `translations.components.permissionActionReorder` / `permissionFeatureReorder`                                  |
| Hide / extend fields       | `collections.<key>.fields`                                                                                      |
| Custom matrix UI component | `components.rolePermissionMatrixField` or `collections.roles.fields`                                            |
| Add list UI (keep reorder) | `collections.<key>.admin.components.beforeListTable`                                                            |
| Change who can CRUD        | `collections.<key>.access`                                                                                      |
| Access helpers             | [UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md)                                |
| Setup & plugin config      | [README](https://github.com/zealamic/payload-plugin-rbac/blob/main/README.md)                                   |
| Disable users modification | `autoModifyUsersCollection: false`                                                                              |
| Disable plugin runtime     | `disabled: true` (collections remain in schema)                                                                 |

Working demos: `dev/rbac.ts`, `dev/collections/posts.ts`, `dev/components/role-permission-matrix-field.tsx`.
