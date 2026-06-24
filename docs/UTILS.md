# Utils reference

Utilities exported from the plugin for access control, field merging, IDs, and translation helpers.

**Import from either:**

```ts
import { getPermissionAccess, CONSTANTS, createdByOnCreateBeforeChangeHook } from "@zealamic/payload-plugin-rbac";
// or
import { getPermissionAccess } from "@zealamic/payload-plugin-rbac/utils";
```

Both resolve to the same barrel: `src/lib/utils/index.ts`.

---

## Exported modules

| Module         | File                            | Purpose                                     |
| -------------- | ------------------------------- | ------------------------------------------- |
| `access`       | `src/lib/utils/access.ts`       | RBAC + data-scope access helpers and types  |
| `collections`  | `src/lib/utils/collections.ts`  | Users slug resolution, `createdBy` field helper, list UI merge |
| `data`         | `src/lib/utils/data.ts`         | ID normalization                            |
| `fields`       | `src/lib/utils/fields.ts`       | Plugin field merge for collection overrides |
| `hooks`        | `src/lib/utils/hooks.ts`        | Reusable collection hooks (`createdBy` on create) |
| `localization` | `src/lib/utils/localization.ts` | i18n merge helpers used by the plugin       |

`access-cache.ts` is **internal** (request-scoped memoization inside access helpers — not exported).

---

## Access exports

### `type DataScopeOptions`

```ts
type DataScopeOptions = {
  createdByField?: string; // default: "createdBy"
  usersCollectionSlug?: string; // default: "users"
};
```

| Option                | Used for                                                             |
| --------------------- | -------------------------------------------------------------------- |
| `createdByField`      | Document ownership field for `own` / `hierarchy` / `all` row filters |
| `usersCollectionSlug` | Users collection slug for hierarchy descendant lookups               |

The plugin uses `createdByField: "id"` on the auth users collection (each user “owns” their own document). For other collections, **you** add a `createdBy` relationship (or equivalent) — see [Ownership field](#ownership-field-required-for-data-scope) under `getPermissionAccess`.

---

### `getPermissionAccess(args)`

Unified entrypoint for Payload `collection.access` handlers. Pass `featureCode` and `actionCode` on every call; add `options` and/or `mode` depending on the operation.

`featureCode` / `actionCode` must match `permission-features.code` and `permission-actions.code`. The user must have an **enabled** row in `roles-permissions` for a matching active `permissions` record (unless super admin).

> **Before wiring access:** every collection you protect with row-level rules (`dataScope`: `own` / `hierarchy` / `all`) needs an **ownership field** on the document — Payload does not add this for you. Add a relationship to your auth users collection (commonly named `createdBy`), set it when a record is created, then point `getPermissionAccess` at that field via `options.createdByField` (defaults to `"createdBy"`). Permission-only checks (`create`, or `read` without `options`) do not require an ownership field.

#### Which arguments to pass

| Operation | Arguments | What you get back |
| --------- | --------- | ----------------- |
| `create`, `readVersions`, `unlock`, … | `featureCode` + `actionCode` only | `boolean` — user has the permission or not |
| `read` (with row-level filter) | above + `options` | `boolean` or a Payload `Where` — permission check, then data-scope filter |
| `update`, `delete` | above + `mode: "modify"` (+ `options` when ownership field ≠ `createdBy`) | `boolean` — loads the target document, then checks permission + scope for that row |

#### Ownership field (required for data scope)

For each **app collection** you want to permission with `dataScope`, add a field that stores **who owns the document** (who created it or who it belongs to). This is separate from `getPermissionAccess` — the helper only reads the field you configure; it does not create it.

**Minimum setup per collection:**

1. **Add a relationship field** to your auth users collection (`users`, or `config.admin.user` if custom).
2. **Set it on create** — typically a `beforeChange` hook that assigns `req.user.id` (use `createdByOnCreateBeforeChangeHook` or your own hook for custom field names).
3. **Wire `getPermissionAccess`** — pass `options` on `read` / `update` / `delete` so the helper knows which field to use.

Recommended field name: **`createdBy`**. You may use any name (`author`, `owner`, `assignedTo`, …) as long as it holds a user id and you pass `createdByField` in `options`.

| Your field name | What to pass to `getPermissionAccess` |
| --------------- | ------------------------------------- |
| `createdBy` (recommended) | `options: {}` on `read`, or omit `options` on `update` / `delete` — `createdByField` defaults to `"createdBy"` |
| Any other name (e.g. `author`, `owner`) | `options: { createdByField: "yourFieldName" }` on `read`, `update`, and `delete` |

`usersCollectionSlug` defaults to `"users"`. Pass `options: { usersCollectionSlug: "…" }` when your auth collection slug differs from `config.admin.user` (e.g. `"accounts"`).

**Rules:**

- Do **not** pass `collectionSlug` unless `mode` is `"modify"`.
- On `update` / `delete`, omit `collectionSlug` when it matches `featureCode` (same as the collection `slug`) — it defaults to `featureCode`. Pass `collectionSlug` only when the collection slug differs from the permission feature code.
- Add an ownership field + create hook **before** wiring `options` on `read` / `update` / `delete` — without it, scope checks cannot attribute documents to a user.
- Pass `options` on `read` when roles use `dataScope`. Use `options: {}` when the field is named `createdBy`; set `createdByField` when it is not.
- On `update` / `delete`, omit `options` when the field is `createdBy`; pass `createdByField` for any other ownership field name.
- Omit `options` on `create` — creation is permission-only; set the ownership field in `beforeChange` so later reads/updates can resolve scope.

On the **users** collection the plugin uses `createdByField: "id"` (each user owns their own row) — see `src/collections/users/index.ts`.

#### Full collection example (`createdBy`)

```ts
const FEATURE_CODE = "posts";

export const Posts: CollectionConfig = {
  slug: FEATURE_CODE,
  access: {
  // Permission only — no row filter needed
  create: getPermissionAccess({
    featureCode: FEATURE_CODE,
    actionCode: "create",
  }),

  // Read: pass options: {} — createdByField defaults to "createdBy"
  read: getPermissionAccess({
    featureCode: FEATURE_CODE,
    actionCode: "read",
    options: {},
  }),

  // Update/delete: omit options when ownership field is "createdBy"
  update: getPermissionAccess({
    featureCode: FEATURE_CODE,
    actionCode: "update",
    mode: "modify",
  }),
  delete: getPermissionAccess({
    featureCode: FEATURE_CODE,
    actionCode: "delete",
    mode: "modify",
  }),
  },
  // You must add this field — Payload does not create it for you
  fields: [
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [createdByOnCreateBeforeChangeHook],
  },
};
```

Or import the hook explicitly:

```ts
import {
  getPermissionAccess,
  createdByOnCreateBeforeChangeHook,
} from "@zealamic/payload-plugin-rbac";
```

Full working collection: `dev/collections/posts.ts`. Users collection wiring (with `createdByField: "id"`): `src/collections/users/index.ts`.

#### Custom ownership field name (`author`)

When the creator is stored under a different relationship field, pass `createdByField` in `options`:

```ts
const FEATURE_CODE = "articles";

export const Articles: CollectionConfig = {
  slug: FEATURE_CODE,
  access: {
    create: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "create",
    }),
    read: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "read",
      options: { createdByField: "author" },
    }),
    update: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "update",
      mode: "modify",
      options: { createdByField: "author" },
    }),
    delete: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "delete",
      mode: "modify",
      options: { createdByField: "author" },
    }),
  },
  fields: [
    {
      name: "author",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, data, operation }) => {
        if (operation === "create" && req.user?.id && !data?.author) {
          return { ...data, author: req.user.id };
        }
        return data;
      },
    ],
  },
};
```

#### How each mode behaves at runtime

1. Deny if `req.user` is missing (read-scope returns a filter that matches nothing when unauthenticated).
2. **Super admin** (`req.user.isSuperAdmin` or persisted check) → allow / `true` Where.
3. Resolve permission via active `permissions` + enabled `roles-permissions`.
4. **Read-scope:** return `getDataScopeReadWhere` (`true` or `Where`).
5. **Modify:** `findByID` target doc, then `canAccessDocumentByDataScope`.

#### Request-scoped caching

Within a single Payload request, repeated calls reuse cached results for:

- Super-admin DB fallback
- Permission checks (`featureCode` + `actionCode` + user id)
- Effective data scope (per `options`)
- Hierarchy visible user IDs (per `options`)

Safe for access handlers; cache is discarded when the request ends.

#### Common mistakes

- Using `mode: "modify"` on `read` or `create` — modify mode is only for `update` / `delete`
- Passing `collectionSlug` without `mode: "modify"` — invalid config; IDE/type-check should flag this
- Expecting filtered list results on `read` without `options` — you get permission-only, no row filter
- Using `dataScope` without adding an ownership relationship field on the collection
- Not setting the ownership field on create — scope checks cannot attribute documents to a user
- Using a custom field name but omitting `createdByField` in `options` — helper looks at `createdBy` by default
- `featureCode` / `actionCode` not matching seeded `permission-features` / `permission-actions` codes

---

### `getSuperAdminAccess({ req })`

Allow only super admins. Checks `req.user.isSuperAdmin` first, then queries the users collection.

Used as default access on all five RBAC plugin collections.

---

### `getAuthenticatedOrSuperAdminAccess`

Payload `Access` helper: allow if `req.user.id === id`, or user is super admin.

---

### `resolveEffectiveDataScope(req, options?)`

Returns `own` | `hierarchy` | `all` from the user's active roles. Widest wins: `all > hierarchy > own`.

- Super admin → `all`
- Uses inline `dataScope` on populated role refs when every role ref is an object with `dataScope`; otherwise loads roles from DB
- Cached per request (per `options`)

---

### `getHierarchyVisibleUserIds(req, options?)`

Returns user IDs visible under **hierarchy** scope: current user + descendants matched via `parent` and `parentPath` on the users collection.

Cached per request (per `options`).

---

### `getDataScopeReadWhere(req, options?)`

Builds a read `Where` clause (or `true` for no extra filter).

| Case              | Result                                           |
| ----------------- | ------------------------------------------------ |
| No user           | `{ [createdByField]: { equals: "___none___" } }` |
| Super admin       | `true`                                           |
| Scope `all`       | `true`                                           |
| Scope `own`       | `{ [createdByField]: { equals: userId } }`       |
| Scope `hierarchy` | `{ [createdByField]: { in: visibleUserIds } }`   |

---

### `isProtectedSuperAdminUserDoc(doc)`

Returns `true` when `doc.isSuperAdmin === true`.

Used inside `canAccessDocumentByDataScope`: even with `dataScope: all`, non–super-admins cannot target super-admin user documents on the users collection.

---

### `canAccessDocumentByDataScope({ req, doc, featureCode, actionCode, collectionSlug, options? })`

Low-level per-document check: RBAC permission + data scope against a document already in memory.

Use directly in custom hooks/endpoints; for collection `access`, prefer `getPermissionAccess({ mode: "modify", ... })`.

---

### `mergeDataScopeWhere(base, scopeWhere)`

Combine an existing query `Where` with a scope filter.

```ts
const scopeWhere = await getDataScopeReadWhere(req, {
  createdByField: "createdBy",
});
const where = mergeDataScopeWhere(
  { status: { equals: "published" } },
  scopeWhere,
);
```

| `scopeWhere` | Result                                            |
| ------------ | ------------------------------------------------- |
| `true`       | `base ?? {}`                                      |
| `Where`      | `{ and: [base, scopeWhere] }` when both non-empty |

---

## Data exports

### `toID(value?)`

Normalize relationship values to a string id (empty string when missing).

```ts
toID("507f1f77bcf86cd799439011"); // "507f1f77bcf86cd799439011"
toID({ id: "507f1f77bcf86cd799439011" }); // "507f1f77bcf86cd799439011"
toID(undefined); // ""
```

---

## Fields exports

Used internally by plugin collections; also exported for advanced customization.

### `getMergedFieldAffectingData({ fields, defaultField })`

Merge one plugin default field with a host override **by matching `name`**.

- Top-level: `{ ...defaultField, ...yourField }`
- `admin`: deep merge (`{ ...defaultAdmin, ...yourAdmin }`)
- `admin.components`: deep merge (override one component key without losing default `Field`)

### `getArrayOfMergedFieldAffectingData({ fields, defaultFields })`

Build final `fields` array:

1. Merge each default by name
2. Append unmatched host fields (new data fields + layout fields)

See [COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md#field-merge-rules).

### `resolveUsersCollectionSlug(adminUser?)`

Returns the auth users collection slug: `adminUser || "users"`. The plugin uses `config.admin.user` when registering collections — use the same helper in your app code when building `relationTo` or `getPermissionAccess` options.

```ts
import { resolveUsersCollectionSlug } from "@zealamic/payload-plugin-rbac";

const usersSlug = resolveUsersCollectionSlug(config.admin?.user);
```

### `getCreatedByRelationshipField(usersCollectionSlug)`

Returns a hidden `createdBy` relationship field definition (`relationTo: usersCollectionSlug`). Used by plugin RBAC collections; safe to reuse in your collections.

```ts
import {
  getCreatedByRelationshipField,
  resolveUsersCollectionSlug,
} from "@zealamic/payload-plugin-rbac";

fields: [
  getCreatedByRelationshipField(resolveUsersCollectionSlug("members")),
],
```

For a visible, read-only field in Admin (typical app collections), define the field inline instead — see [Full collection example](#full-collection-example-createdby).

### `mergeBeforeListTable(pluginComponent, consumerComponents?)`

Prepends a plugin list component before consumer `beforeListTable` entries. Used internally by reorder clients; exported for custom plugins.

---

## Hooks exports

### `createdByOnCreateBeforeChangeHook`

Payload `CollectionBeforeChangeHook` that sets `createdBy` to `req.user.id` on **create** when the field is not already set. Pair with a `createdBy` relationship field and `getPermissionAccess` data-scope options.

```ts
import {
  createdByOnCreateBeforeChangeHook,
  getPermissionAccess,
} from "@zealamic/payload-plugin-rbac";

export const Posts: CollectionConfig = {
  slug: "posts",
  hooks: {
    beforeChange: [createdByOnCreateBeforeChangeHook],
  },
  access: {
    read: getPermissionAccess({
      featureCode: "posts",
      actionCode: "read",
      options: {},
    }),
  },
  fields: [
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
    },
  ],
};
```

**Notes:**

- Only sets the field named **`createdBy`** — for `author` / other names, write a custom hook (see [Custom ownership field](#custom-ownership-field-name-author)).
- No-op when `req.user` is missing or `data.createdBy` is already set.
- The plugin uses this hook on RBAC collections (`permission-actions`, `roles`, …) and on the auth users collection via `mergeUserCollectionHooks`.

---

## Localization exports

Used by the plugin to merge `translations` config; safe to reuse in custom plugins.

### `type TranslationValue`

```ts
type TranslationValue = Record<string, TranslationValue> | string | undefined;
```

### `toLocaleRecord(locales, getValue)`

Build `{ [locale]: string }` for Payload field labels (skips empty values).

### `toSelectPlaceholder(locales, getValue)`

Serializable select placeholders for Payload 3 / Next.js (plain strings, not functions).

### `getMergedTranslations({ defaultTranslations, translations })`

Deep-merge translation trees; override leaves replace defaults.

### `getAllTranslationsOfSpecificObject({ translations, path, locales? })`

Extract a nested branch per locale, e.g. `path: "collections.roles"`. `locales: "all"` (default) or `["en", "vi"]`.

---

## Constants (`CONSTANTS`)

Exported from `@zealamic/payload-plugin-rbac` (not `@zealamic/payload-plugin-rbac/utils` only — main package re-exports utils).

```ts
import { CONSTANTS } from "@zealamic/payload-plugin-rbac";

CONSTANTS.ROLE.DATA_SCOPE; // { ALL, OWN, HIERARCHY }
CONSTANTS.ROLE.STATUS; // { ACTIVE, INACTIVE }
CONSTANTS.PERMISSION.STATUS;
CONSTANTS.PERMISSION_ACTION.TYPE; // { MAIN, SUB }
CONSTANTS.PERMISSION_ACTION.STATUS;
CONSTANTS.PERMISSION_FEATURE.STATUS;
CONSTANTS.USER.PARENT_PATH_SEPARATOR;
CONSTANTS.USER.DEFAULT_USERS_COLLECTION_SLUG; // "users"
CONSTANTS.GENERAL.RBAC_PREFIX;
```

---

## Quick reference

| Task                              | Helper / pattern                                               |
| --------------------------------- | -------------------------------------------------------------- |
| Collection CRUD access            | `getPermissionAccess` — see table above per operation          |
| Ownership field for data scope    | Add `createdBy` relationship + `createdByOnCreateBeforeChangeHook` (or custom hook) on each protected collection |
| Auth users slug                   | `resolveUsersCollectionSlug(config.admin?.user)`                                                                 |
| RBAC collections (admin only)     | `getSuperAdminAccess`                                          |
| Custom row-level read filter      | `getPermissionAccess` + `options` on `read`                      |
| Custom document update/delete     | `getPermissionAccess` + `mode: "modify"` (+ `collectionSlug` only when ≠ `featureCode`) |
| Combine scope + business `where`  | `mergeDataScopeWhere`                                          |
| Override plugin collection fields | `getArrayOfMergedFieldAffectingData`                           |
| Plugin translation merge          | `getMergedTranslations` / `getAllTranslationsOfSpecificObject` |

---

## Related docs

- [README](https://github.com/zealamic/payload-plugin-rbac/blob/main/README.md) — install and quick start
- [COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md) — collection schemas, `dataScope`, field overrides
- [TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md) — i18n keys
