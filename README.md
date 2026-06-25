# @zealamic/payload-plugin-rbac

Centralized **role-based access control (RBAC)** for [Payload CMS](https://payloadcms.com) **v3** (`payload ^3.84.1`). Not compatible with Payload 2.x.

![Payload Auth RBAC Plugin](https://github.com/zealamic/payload-plugin-rbac/blob/main/assets/cover-photo.jpg)

Permissions live in the database (feature + action), are assigned to roles, and enforced via reusable access helpers — editable in Admin without redeploying policy code.

> **Row-level access (`dataScope`):** add a field storing the creator’s user **id** (`text` is enough; `relationship` optional), set it on create, wire `getPermissionAccess`. → **[UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md#ownership-field-required-for-data-scope)**

---

## Documentation

| Guide                                                                                                        | Read when you need to…                                                                         |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **[COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md)**             | Plugin collections, users augmentation, `dataScope`, permission matrix, field/access overrides |
| **[UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md)**                         | `getPermissionAccess`, data-scope filters, field merge helpers                                 |
| **[TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md)**           | Admin labels, select options, matrix UI strings (`en`, `vi`, …)                                |
| **[CUSTOM_COMPONENTS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/CUSTOM_COMPONENTS.md)** | Custom matrix checkboxes / search input (client field component)                               |

**Typical flow:** install → register plugin → seed RBAC data ([COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md)) → add ownership fields + `getPermissionAccess` on app collections ([UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md)) → translate Admin UI ([TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md)).

**Demos in this repo:** `dev/rbac.ts`, `dev/collections/posts.ts`, `dev/components/role-permission-matrix-field.tsx`.

---

## Key features

- **Five RBAC collections** — features, actions, permissions, roles, join table ([details](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md))
- **Multi-role users** — union of enabled grants across assigned roles
- **Granular permissions** — any `featureCode` + `actionCode` pair ([helpers](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md))
- **Data scope** — `own` / `hierarchy` / `all`; needs ownership field with user **id** ([UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md#ownership-field-required-for-data-scope))
- **Auth users slug** — `config.admin.user` (default `users`) for hierarchy + `options.usersCollectionSlug`
- **Permission matrix** — role **update** UI; syncs draft → `roles-permissions` on save
- **Reorder drawers** — drag-and-drop `sortOrder` for permission features and actions on each collection list view
- **Custom matrix UI** — optional client field component + render props ([CUSTOM_COMPONENTS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/CUSTOM_COMPONENTS.md))
- **TypeScript** — typed plugin config and exported helpers/types from the main package
- **i18n** — plugin translations merged into Payload i18n ([guide](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md))

---

## Installation

```bash
npm install @zealamic/payload-plugin-rbac
# or: yarn add / pnpm add @zealamic/payload-plugin-rbac
```

---

## Quick start

### 1. Register the plugin

```ts
import { payloadPluginRBAC } from "@zealamic/payload-plugin-rbac";

export default buildConfig({
  plugins: [
    payloadPluginRBAC({
      autoModifyUsersCollection: true, // roles, isSuperAdmin, parent, default user access
      // collections: { ... }   → https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md
      // translations: { ... } → https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md
      // components: { rolePermissionMatrixField: "..." } → custom matrix Field (client module)
    }),
  ],
});
```

### 2. Migration

After adding the plugin to `payload.config.ts`, run a Payload migration if your database schema is not up to date:

```bash
npm run payload migrate:create
# or: yarn payload migrate:create
# or: pnpm payload migrate:create
```

Then apply the migration with `migrate` (or your project's usual migration workflow).

> **Bootstrap a super admin:** RBAC collections are restricted to super admins by default. Set `isSuperAdmin: true` on at least one user (via seed script, Local API, or direct database update) before you can manage roles, permissions, and the permission matrix in Admin.
>
> → [COLLECTIONS — Bootstrap super admin](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#bootstrap-super-admin)

### 3. Seed RBAC data (Admin or script)

1. **permission-features** — e.g. `posts`, `users` (`code` = `featureCode` in access helpers); use **Reorder** on the list view to set row order in the matrix
2. **permission-actions** — e.g. `create`, `read`, `update`, `delete` (`main` / `sub` types); use **Reorder** to set main column and sub-action order
3. **permissions** — one row per feature + action pair (`status: active`)
4. **roles** — set [dataScope](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#what-is-datascope); open **update** screen, configure matrix → Save
5. **users** — assign roles; bootstrap [isSuperAdmin](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#bootstrap-super-admin) via seed/API

→ Full reference: **[COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md)**

### 4. Protect app collections

For `dataScope`, each collection needs: (1) ownership field with user **id** — `text` default, `relationship` only for Admin UI, (2) create hook (`createdByOnCreateBeforeChangeHook`), (3) `getPermissionAccess` with `options` on `read` and `mode: "modify"` on `update` / `delete`. Full guide → **[UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md#getpermissionaccessargs)** · relationship demo: `dev/collections/posts.ts`

```ts
import type { CollectionConfig } from "payload";
import { createdByOnCreateBeforeChangeHook, getPermissionAccess } from "@zealamic/payload-plugin-rbac";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: {
    read: getPermissionAccess({ featureCode: "posts", actionCode: "read", options: {} }),
    create: getPermissionAccess({ featureCode: "posts", actionCode: "create" }),
    update: getPermissionAccess({ featureCode: "posts", actionCode: "update", mode: "modify" }),
    delete: getPermissionAccess({ featureCode: "posts", actionCode: "delete", mode: "modify" }),
  },
  hooks: { beforeChange: [createdByOnCreateBeforeChangeHook] },
  fields: [{ name: "createdBy", type: "text", admin: { readOnly: true } }],
};
```

**Access order:** no user → deny · super admin → allow · else → matrix permission (+ scope when `options` / `mode: "modify"`).

---

## Reorder overview (features & actions)

List views for **`permission-features`** and **`permission-actions`** include a **Reorder** drawer to set `sortOrder` (hidden on edit forms). Order drives the role permission matrix: features → rows, main actions → columns, sub actions → checkbox order under each row.

![Sorted matrix](https://github.com/zealamic/payload-plugin-rbac/blob/main/assets/sort-3.jpg)

| Step | Action |
| ---- | ------ |
| Features | **Permission Features** → **Reorder** → drag → **Save order** |
| Actions | **Permission Actions** → **Reorder** → pick **Main** or **Sub** → drag → **Save order** |

![Reorder permission features](https://github.com/zealamic/payload-plugin-rbac/blob/main/assets/sort-1.jpg)
![Reorder permission actions](https://github.com/zealamic/payload-plugin-rbac/blob/main/assets/sort-2.jpg)

**API:** `POST /api/permission-features/reorder` · `POST /api/permission-actions/reorder` — body `{ "sortedItems": [{ "id": "…", "sortOrder": 0 }] }`. Requires **update** access (super admin by default). Details → [COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#permission-actions) · labels → [TRANSLATIONS — Reorder drawers](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md#reorder-drawers).

---

## Plugin options

| Option                                 | Default               | Description                                                                                                                                                                       |
| -------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`                             | `false`               | Skip runtime i18n/`onInit` wiring; collections still register in schema                                                                                                           |
| `autoModifyUsersCollection`            | `true`                | Add RBAC fields, parent-path hooks, and default access on the auth users collection                                                                                               |
| `translations`                         | —                     | Admin + matrix i18n → **[TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md)**                                                          |
| `collections`                          | —                     | Per-collection `fields` / `access` / `admin` overrides → **[COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#customizing-collections)** |
| `components.rolePermissionMatrixField` | default client export | Import-map path to a custom matrix `Field` component (client module)                                                                                                              |

Types import from the main entry:

```ts
import type {
  RBACTranslations,
  PayloadPluginRBACConfig,
} from "@zealamic/payload-plugin-rbac";
```

---

## Exported helpers (summary)

Full reference: **[UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md)**

| Function                                                             | Purpose                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `getPermissionAccess`                                                | Unified access: permission-only, read `Where`, or modify per-document |
| `getCreatedByRelationshipField` / `createdByOnCreateBeforeChangeHook` | Ownership field + create hook → [UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md#getcreatedbyrelationshipfieldparams) |
| `resolveUsersCollectionSlug`                                         | Same `admin.user` → slug resolution as the plugin                       |
| `getSuperAdminAccess`                                                | Super admin only (default on RBAC collections)                        |
| `getAuthenticatedOrSuperAdminAccess`                                 | Owner or super admin                                                  |
| `canAccessDocumentByDataScope`                                       | Low-level single-document RBAC + scope check                          |
| `resolveEffectiveDataScope` / `getHierarchyVisibleUserIds`           | Scope resolution                                                      |
| `getDataScopeReadWhere` / `mergeDataScopeWhere`                      | Query filters                                                         |
| `getMergedFieldAffectingData` / `getArrayOfMergedFieldAffectingData` | Field merge for overrides                                             |

Constants: `CONSTANTS.ROLE.DATA_SCOPE`, `CONSTANTS.PERMISSION_ACTION.TYPE`, etc.

---

## Package exports

| Import                                 | Contents                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@zealamic/payload-plugin-rbac`        | `payloadPluginRBAC`, utils, constants, TypeScript types                                                                                                |
| `@zealamic/payload-plugin-rbac/client` | `RolePermissionMatrixClient`, `PermissionActionReorderClient`, `PermissionFeatureReorderClient`, `createRolePermissionMatrixClient`, and related types |

---

## Images from demo

![demo-1](https://github.com/zealamic/payload-plugin-rbac/blob/main/assets/demo-1.jpg)

Reorder screenshots: [Reorder overview](#reorder-overview-features--actions) above.

---

## License

MIT

---

> _If this plugin helps your team ship safer access control with less friction, thank you for giving it a place in your stack._
