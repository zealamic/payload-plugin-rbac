# @zealamic/payload-plugin-rbac

Centralized **role-based access control (RBAC)** for [Payload CMS](https://payloadcms.com) **v3**.

![Payload Auth RBAC Plugin](https://github.com/zealamic/payload-plugin-rbac/blob/main/assets/cover-photo.jpg)

Permissions live in the database (feature + action), are assigned to roles, and enforced via reusable access helpers — editable in Admin without redeploying policy code.

---

## Documentation

| Guide                                                                                                   | Read when you need to…                                                                                                   |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **[COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md)**   | Understand plugin collections, users augmentation, `dataScope`, permission matrix, and **customize** fields/access/admin |
| **[UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md)**               | Wire **access helpers** on your app collections (`getPermissionAccess`, data-scope filters, examples)                    |
| **[TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md)** | Localize Admin labels, select options, and permission-matrix UI (`en`, `vi`, …)                                          |

**Typical flow:** install → register plugin → seed RBAC data ([COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md)) → protect app collections ([UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md)) → translate Admin UI ([TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md)).

Demo: `dev/rbac.ts`, `dev/collections/posts.ts`.

---

## Key features

- **Five RBAC collections** — features, actions, permissions, roles, join table ([details](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md))
- **Multi-role users** — union of enabled grants across assigned roles
- **Granular permissions** — any `featureCode` + `actionCode` pair ([helpers](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md))
- **Data scope** — per-role `own` / `hierarchy` / `all` for row-level filtering ([`dataScope` vs `isSuperAdmin`](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#what-is-datascope)`)
- **Permission matrix** — role edit UI; syncs to `roles-permissions` on save
- **TypeScript** — typed plugin options and exports (`/types`)
- **i18n** — plugin-owned translations merged into Payload i18n ([guide](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md))

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
      // collections: { ... }  → see docs/COLLECTIONS.md
      // translations: { ... }  → see docs/TRANSLATIONS.md
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
> → See [COLLECTIONS — Bootstrap super admin](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#bootstrap-super-admin)

### 3. Seed RBAC data (Admin or script)

1. **permission-features** — e.g. `posts`, `users` (`code` = `featureCode` in access helpers)
2. **permission-actions** — e.g. `create`, `read`, `update`, `delete`
3. **permissions** — one row per feature + action pair
4. **roles** — set [dataScope](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#what-is-datascope); configure matrix on update screen → Save
5. **users** — assign roles; bootstrap [isSuperAdmin](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#bootstrap-super-admin) via seed/API

→ Full collection reference: **[COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md)**

### 4. Protect app collections

```ts
import { getPermissionAccess } from "@zealamic/payload-plugin-rbac";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: {
    read: getPermissionAccess({
      featureCode: "posts",
      actionCode: "read",
      // read mode is inferred when options is provided
      options: { createdByField: "createdBy" },
    }),
    create: getPermissionAccess({ featureCode: "posts", actionCode: "create" }),
    update: getPermissionAccess({
      featureCode: "posts",
      actionCode: "update",
      mode: "modify",
      collectionSlug: "posts",
      options: { createdByField: "createdBy" },
    }),
    delete: getPermissionAccess({
      featureCode: "posts",
      actionCode: "delete",
      mode: "modify",
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

→ All helpers with examples: **[UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md)**

---

## Plugin options

| Option                      | Default | Description                                                                                                                                              |
| --------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`                  | `false` | Skip runtime wiring; schema still registers                                                                                                              |
| `autoModifyUsersCollection` | `true`  | Add RBAC fields + access on users collection                                                                                                             |
| `translations`              | —       | Admin / matrix i18n → **[TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md)**                            |
| `collections`               | —       | Per-collection overrides → **[COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#customizing-collections)** |

Types: `@zealamic/payload-plugin-rbac/types`

---

## Exported helpers (summary)

Full reference: **[UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md)**

| Function                                              | Purpose                                                |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `getPermissionAccess`                                 | Unified helper: permission / read scope / modify scope |
| `getSuperAdminAccess`                                 | Super admin only (RBAC collections default)            |
| `canAccessDocumentByDataScope`                        | Single-document scope check                            |
| `resolveEffectiveDataScope` / `getDataScopeReadWhere` | Scope resolution & query filters                       |

Constants: `CONSTANTS.ROLE.DATA_SCOPE`, etc.

---

## Package exports

| Import                                      | Contents                              |
| ------------------------------------------- | ------------------------------------- |
| `@zealamic/payload-plugin-rbac`        | Plugin + utils + constants            |
| `@zealamic/payload-plugin-rbac/client` | `RolePermissionMatrixClient`          |
| `@zealamic/payload-plugin-rbac/types`  | TypeScript types                      |
| `@zealamic/payload-plugin-rbac/utils`  | Access / field / localization helpers |

---

## License

MIT

---

> _If this plugin helps your team ship safer access control with less friction, thank you for giving it a place in your stack._
