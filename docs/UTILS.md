# Utils reference

Helpers exported from `@zealamic/payload-auth-rbac-plugin` (same as `/utils`).

```ts
import {
  getPermissionAccess,
  getPermissionAndDataScopeReadAccess,
  getPermissionAndDataScopeMutationAccess,
  canAccessDocumentByDataScope,
  resolveEffectiveDataScope,
  getDataScopeReadWhere,
  getHierarchyVisibleUserIds,
  mergeDataScopeWhere,
  getSuperAdminAccess,
  getAuthenticatedOrSuperAdminAccess,
  isProtectedSuperAdminUserDoc,
  toID,
  CONSTANTS,
} from "@zealamic/payload-auth-rbac-plugin";
```

## How access is resolved

For permission-based helpers, evaluation order is:

1. No `req.user` → **deny**
2. `req.user.isSuperAdmin === true` (or persisted super admin) → **allow**
3. Find active `permissions` where `permissionFeature.code` + `permissionAction.code` match
4. Check whether any of the user's roles has an **enabled** row in `roles-permissions`

`featureCode` / `actionCode` must match `permission-features.code` and `permission-actions.code` in the database.

---

## Permission helpers

### `getPermissionAccess({ featureCode, actionCode })`

Returns a Payload `access` function that checks RBAC only (no row-level filter).

**Use for:** `create`, or any operation that does not need data-scope filtering.

```ts
import { getPermissionAccess } from "@zealamic/payload-auth-rbac-plugin";

export const Orders: CollectionConfig = {
  slug: "orders",
  access: {
    create: getPermissionAccess({
      featureCode: "orders",
      actionCode: "create",
    }),
    // read / update / delete: see data-scope helpers below
  },
};
```

---

### `getSuperAdminAccess`

Allow only super admins. Used by plugin RBAC collections (`roles`, `permissions`, …).

```ts
import { getSuperAdminAccess } from "@zealamic/payload-auth-rbac-plugin";

access: {
  read: getSuperAdminAccess,
  update: getSuperAdminAccess,
}
```

---

### `getAuthenticatedOrSuperAdminAccess`

Allow when `req.user.id === id` (document owner) **or** the user is a super admin.

**Use for:** profile-style access on the users collection (e.g. read/update own user record).

```ts
import { getAuthenticatedOrSuperAdminAccess } from "@zealamic/payload-auth-rbac-plugin";

access: {
  read: getAuthenticatedOrSuperAdminAccess,
  update: getAuthenticatedOrSuperAdminAccess,
}
```

---

## Data scope helpers

Each **role** has a `dataScope`:

| Value | Meaning |
|-------|---------|
| `own` | Only documents where `createdByField` equals the current user |
| `hierarchy` | Documents created by self or subordinates (`users.parent` / `parentPath`) |
| `all` | All documents (subject to permission check) |

When a user has multiple roles, the **widest** scope wins: `all` > `hierarchy` > `own`.

Import scope values:

```ts
import { CONSTANTS } from "@zealamic/payload-auth-rbac-plugin";

const { DATA_SCOPE } = CONSTANTS.ROLE;
// DATA_SCOPE.OWN | DATA_SCOPE.HIERARCHY | DATA_SCOPE.ALL
```

### `DataScopeOptions`

Shared optional config for scope helpers:

| Option | Default | Description |
|--------|---------|-------------|
| `createdByField` | `"createdBy"` | Field on your collection storing the creator user id |
| `usersCollectionSlug` | `"users"` | Users collection slug (for hierarchy lookups) |

Your collection should set `createdBy` on create (hook or default):

```ts
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
```

---

### `getPermissionAndDataScopeReadAccess({ featureCode, actionCode, options? })`

Combines RBAC **and** a Payload `Where` filter for `read` access.

- Returns `false` if the user lacks permission
- Returns `true` if super admin or effective scope is `all` (no extra filter)
- Returns a `Where` object otherwise (e.g. `{ createdBy: { equals: userId } }`)

```ts
import { getPermissionAndDataScopeReadAccess } from "@zealamic/payload-auth-rbac-plugin";

access: {
  read: getPermissionAndDataScopeReadAccess({
    featureCode: "posts",
    actionCode: "read",
    options: {
      createdByField: "createdBy",
      usersCollectionSlug: "users",
    },
  }),
},
```

---

### `getPermissionAndDataScopeMutationAccess({ featureCode, actionCode, collectionSlug, options? })`

For `update` / `delete`: loads the target document by `id`, then checks permission + per-document scope.

```ts
import { getPermissionAndDataScopeMutationAccess } from "@zealamic/payload-auth-rbac-plugin";

access: {
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
```

---

### `canAccessDocumentByDataScope({ req, doc, featureCode, actionCode, collectionSlug, options? })`

Lower-level check for **one document** (custom access, hooks, endpoints).

```ts
import { canAccessDocumentByDataScope } from "@zealamic/payload-auth-rbac-plugin";

const allowed = await canAccessDocumentByDataScope({
  req,
  doc: post,
  featureCode: "posts",
  actionCode: "update",
  collectionSlug: "posts",
  options: { createdByField: "createdBy" },
});

if (!allowed) {
  throw new APIError("Forbidden", 403);
}
```

---

### `resolveEffectiveDataScope(req, options?)`

Returns the user's effective scope: `"own" | "hierarchy" | "all"`.

```ts
const scope = await resolveEffectiveDataScope(req);

if (scope === CONSTANTS.ROLE.DATA_SCOPE.ALL) {
  // show admin-wide dashboard
}
```

---

### `getDataScopeReadWhere(req, options?)`

Builds the `Where` clause for list/read queries without running the permission check.

```ts
const scopeWhere = await getDataScopeReadWhere(req, {
  createdByField: "createdBy",
});

const result = await req.payload.find({
  collection: "posts",
  where: mergeDataScopeWhere(
    { status: { equals: "published" } },
    scopeWhere,
  ),
});
```

---

### `getHierarchyVisibleUserIds(req, options?)`

Returns user IDs visible under **hierarchy** scope: self + descendants via `parent` / `parentPath`.

```ts
const visibleIds = await getHierarchyVisibleUserIds(req);

// e.g. filter a report by team members
where: {
  createdBy: { in: visibleIds },
},
```

---

### `mergeDataScopeWhere(base, scopeWhere)`

Merges an existing `Where` with a scope filter.

- If `scopeWhere === true` → returns `base` unchanged (no scope limit)
- Otherwise → `{ and: [base, scopeWhere] }`

```ts
import { mergeDataScopeWhere, getDataScopeReadWhere } from "@zealamic/payload-auth-rbac-plugin";

const scopeWhere = await getDataScopeReadWhere(req);
const where = mergeDataScopeWhere(
  { title: { contains: "draft" } },
  scopeWhere,
);
```

---

### `isProtectedSuperAdminUserDoc(doc)`

Returns `true` when a user document has `isSuperAdmin: true`. Non–super-admins with `all` scope cannot update/delete that user (guardrail on the users collection).

```ts
if (isProtectedSuperAdminUserDoc(userDoc)) {
  // apply extra UI warnings or block non-admin edits
}
```

---

## General utilities

### `toID(value)`

Normalizes a relationship value or id to a string id.

```ts
import { toID } from "@zealamic/payload-auth-rbac-plugin";

toID("507f1f77bcf86cd799439011"); // "507f1f77bcf86cd799439011"
toID({ id: "507f1f77bcf86cd799439011", name: "Admin" }); // "507f1f77bcf86cd799439011"
toID(undefined); // ""
```

---

## Constants

`CONSTANTS` groups plugin enums:

```ts
import { CONSTANTS } from "@zealamic/payload-auth-rbac-plugin";

CONSTANTS.ROLE.DATA_SCOPE;       // { ALL, OWN, HIERARCHY }
CONSTANTS.ROLE.STATUS;           // { ACTIVE, INACTIVE }
CONSTANTS.PERMISSION.STATUS;
CONSTANTS.PERMISSION_ACTION.TYPE; // { MAIN, SUB }
CONSTANTS.USER.PARENT_PATH_SEPARATOR;
```

---

## Full collection example

See `dev/collections/posts.ts` in this repo for a working pattern:

- `getPermissionAccess` on `create`
- `getPermissionAndDataScopeReadAccess` on `read`
- `getPermissionAndDataScopeMutationAccess` on `update` / `delete`
- `beforeChange` hook to set `createdBy`

---

## Related docs

- [README](../README.md) — install, quick start, plugin options
- [COLLECTIONS](./COLLECTIONS.md) — RBAC collection schemas
- [TRANSLATIONS](./TRANSLATIONS.md) — Admin / matrix i18n
