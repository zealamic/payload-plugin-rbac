# @zealamic/payload-auth-rbac-plugin

Centralized **role-based access control (RBAC)** for [Payload CMS](https://payloadcms.com) **v3** (`payload ^3.84.1`).

![Payload Auth RBAC Plugin](https://github.com/zealamic/payload-auth-rbac-plugin/blob/main/assets/cover-photo.jpg)

Permissions live in the database (feature + action), are assigned to roles, and enforced via reusable access helpers — editable in Admin without redeploying policy code.

---

## Documentation

| Guide                                      | Read when you need to…                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **[COLLECTIONS](./docs/COLLECTIONS.md)**   | Understand plugin collections, users augmentation, `dataScope`, permission matrix, and **customize** fields/access/admin |
| **[UTILS](./docs/UTILS.md)**               | Wire **access helpers** on your app collections (`getPermissionAccess`, data-scope filters, examples)                    |
| **[TRANSLATIONS](./docs/TRANSLATIONS.md)** | Localize Admin labels, select options, and permission-matrix UI (`en`, `vi`, …)                                          |

**Typical flow:** install → register plugin → seed RBAC data ([COLLECTIONS](./docs/COLLECTIONS.md)) → protect app collections ([UTILS](./docs/UTILS.md)) → translate Admin UI ([TRANSLATIONS](./docs/TRANSLATIONS.md)).

Demo: `dev/rbac.ts`, `dev/collections/posts.ts`.

---

## Key features

- **Five RBAC collections** — features, actions, permissions, roles, join table ([details](./docs/COLLECTIONS.md))
- **Multi-role users** — union of enabled grants across assigned roles
- **Granular permissions** — any `featureCode` + `actionCode` pair ([helpers](./docs/UTILS.md))
- **Data scope** — per-role `own` / `hierarchy` / `all` for row-level filtering (`[dataScope` vs `isSuperAdmin](./docs/COLLECTIONS.md#what-is-datascope)`)
- **Permission matrix** — role edit UI; syncs to `roles-permissions` on save
- **TypeScript** — typed plugin options and exports (`/types`)
- **i18n** — plugin-owned translations merged into Payload i18n ([guide](./docs/TRANSLATIONS.md))

---

## Installation

```bash
npm install @zealamic/payload-auth-rbac-plugin
# or: yarn add / pnpm add @zealamic/payload-auth-rbac-plugin
```

---

## Quick start

### 1. Register the plugin

```ts
import { payloadAuthRbacPlugin } from "@zealamic/payload-auth-rbac-plugin";

export default buildConfig({
  plugins: [
    payloadAuthRbacPlugin({
      autoModifyUsersCollection: true, // roles, isSuperAdmin, parent, default user access
      // collections: { ... }  → see docs/COLLECTIONS.md
      // translations: { ... }  → see docs/TRANSLATIONS.md
    }),
  ],
});
```

### 2. Seed RBAC data (Admin or script)

1. **permission-features** — e.g. `posts`, `users` (`code` = `featureCode` in access helpers)
2. **permission-actions** — e.g. `create`, `read`, `update`, `delete`
3. **permissions** — one row per feature + action pair
4. **roles** — set `[dataScope](./docs/COLLECTIONS.md#what-is-datascope)`; configure matrix on update screen → Save
5. **users** — assign roles; bootstrap `[isSuperAdmin](./docs/COLLECTIONS.md#bootstrap-super-admin)` via seed/API

→ Full collection reference: **[COLLECTIONS](./docs/COLLECTIONS.md)**

### 3. Protect app collections

```ts
import {
  getPermissionAccess,
  getPermissionAndDataScopeReadAccess,
  getPermissionAndDataScopeMutationAccess,
} from "@zealamic/payload-auth-rbac-plugin";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: {
    read: getPermissionAndDataScopeReadAccess({
      featureCode: "posts",
      actionCode: "read",
      options: { createdByField: "createdBy" },
    }),
    create: getPermissionAccess({ featureCode: "posts", actionCode: "create" }),
    update: getPermissionAndDataScopeMutationAccess({
      featureCode: "posts",
      actionCode: "update",
      collectionSlug: "posts",
      options: { createdByField: "createdBy" },
    }),
    delete: getPermissionAndDataScopeMutationAccess({
      featureCode: "posts",
      actionCode: "delete",
      collectionSlug: "posts",
      options: { createdByField: "createdBy" },
    }),
  },
  hooks: {
    beforeChange: [
      ({ req, data, operation }) => {
        if (operation === "create" && req.user?.id && !data?.createdBy) {
          return { ...data, createdBy: req.user.id };
        }
        return data;
      },
    ],
  },
  fields: [
    { name: "createdBy", type: "relationship", relationTo: "users" /* ... */ },
  ],
};
```

**Access order:** anonymous → deny · super admin → allow · else → matrix permission (+ data scope when using scope helpers).

→ All helpers with examples: **[UTILS](./docs/UTILS.md)**

---

## Plugin options

| Option                      | Default | Description                                                                                 |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `disabled`                  | `false` | Skip runtime wiring; schema still registers                                                 |
| `autoModifyUsersCollection` | `true`  | Add RBAC fields + access on users collection                                                |
| `translations`              | —       | Admin / matrix i18n → **[TRANSLATIONS](./docs/TRANSLATIONS.md)**                            |
| `collections`               | —       | Per-collection overrides → **[COLLECTIONS](./docs/COLLECTIONS.md#customizing-collections)** |

Types: `@zealamic/payload-auth-rbac-plugin/types`

---

## Exported helpers (summary)

Full reference: **[UTILS](./docs/UTILS.md)**

| Function                                              | Purpose                                         |
| ----------------------------------------------------- | ----------------------------------------------- |
| `getPermissionAccess`                                 | Permission check only                           |
| `getPermissionAndDataScopeReadAccess`                 | Permission + read `Where` filter                |
| `getPermissionAndDataScopeMutationAccess`             | Permission + per-document scope (update/delete) |
| `getSuperAdminAccess`                                 | Super admin only (RBAC collections default)     |
| `canAccessDocumentByDataScope`                        | Single-document scope check                     |
| `resolveEffectiveDataScope` / `getDataScopeReadWhere` | Scope resolution & query filters                |

Constants: `CONSTANTS.ROLE.DATA_SCOPE`, etc.

---

## Package exports

| Import                                      | Contents                              |
| ------------------------------------------- | ------------------------------------- |
| `@zealamic/payload-auth-rbac-plugin`        | Plugin + utils + constants            |
| `@zealamic/payload-auth-rbac-plugin/client` | `RolePermissionMatrixClient`          |
| `@zealamic/payload-auth-rbac-plugin/types`  | TypeScript types                      |
| `@zealamic/payload-auth-rbac-plugin/utils`  | Access / field / localization helpers |

---

## License

MIT
