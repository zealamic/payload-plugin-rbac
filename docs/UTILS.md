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
| `collections`  | `src/lib/utils/collections.ts`  | Users slug resolution, `getCreatedByRelationshipField`, list UI merge |
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

The plugin uses `createdByField: "id"` on the auth users collection. For other collections, add a field storing the creator’s user id — see [Ownership field](#ownership-field-required-for-data-scope).

---

### `getPermissionAccess(args)`

Unified entrypoint for Payload `collection.access` handlers. Pass `featureCode` and `actionCode` on every call; add `options` and/or `mode` depending on the operation.

`featureCode` / `actionCode` must match seeded `permission-features` / `permission-actions` codes. User needs an enabled `roles-permissions` row (unless super admin).

Payload does **not** add an ownership field. For `dataScope`, store the creator’s user **id** on each document and point `getPermissionAccess` at it via `options.createdByField` (default `"createdBy"`). See [Ownership field](#ownership-field-required-for-data-scope).

#### Which arguments to pass

| Operation | Arguments | What you get back |
| --------- | --------- | ----------------- |
| `create`, `readVersions`, `unlock`, … | `featureCode` + `actionCode` only | `boolean` — user has the permission or not |
| `read` (with row-level filter) | above + `options` | `boolean` or a Payload `Where` — permission check, then data-scope filter |
| `update`, `delete` | above + `mode: "modify"` (+ `options` when ownership field ≠ `createdBy`) | `boolean` — loads the target document, then checks permission + scope for that row |

#### Ownership field (required for data scope)

RBAC only needs the **user document id** on each record. **`text`** + `req.user.id` on create is the default; **`relationship`** is optional (Admin UI / populate). Access helpers normalize both via `toID()`. Plugin RBAC collections use hidden `text` for audit `createdBy`.

`options.usersCollectionSlug` is for **hierarchy** lookups only — it does not require `createdBy` to be a relationship.

**Setup:** (1) ownership field (`createdBy` or custom name), (2) create hook (`createdByOnCreateBeforeChangeHook` or custom), (3) `getPermissionAccess` with `options` on `read` / `update` / `delete`.

| Field name | `getPermissionAccess` |
| ---------- | --------------------- |
| `createdBy` | `options: {}` on `read`; omit `options` on `update` / `delete` |
| Custom (e.g. `author`) | `options: { createdByField: "author" }` on `read`, `update`, `delete` |

**Rules:** no `options` on `create` (permission-only). `collectionSlug` only with `mode: "modify"` when slug ≠ `featureCode`. Users collection uses `createdByField: "id"` — see `src/collections/users/index.ts`.

#### Example — `text` `createdBy` (default)

```ts
const FEATURE_CODE = "posts";

export const Posts: CollectionConfig = {
  slug: FEATURE_CODE,
  access: {
    create: getPermissionAccess({ featureCode: FEATURE_CODE, actionCode: "create" }),
    read: getPermissionAccess({ featureCode: FEATURE_CODE, actionCode: "read", options: {} }),
    update: getPermissionAccess({ featureCode: FEATURE_CODE, actionCode: "update", mode: "modify" }),
    delete: getPermissionAccess({ featureCode: FEATURE_CODE, actionCode: "delete", mode: "modify" }),
  },
  fields: [{ name: "createdBy", type: "text", admin: { readOnly: true } }],
  hooks: { beforeChange: [createdByOnCreateBeforeChangeHook] },
};
```

#### Example — `relationship` `createdBy` (optional, Admin UI)

Same access wiring; use `type: "relationship"` + `relationTo` matching `config.admin.user`. Full demo: `dev/collections/posts.ts`.

#### Example — custom field name (`author`)

When the creator is stored under a different field name, pass `createdByField` in `options` and use a custom create hook:

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

- `mode: "modify"` only on `update` / `delete`; `read` without `options` = permission-only, no row filter
- `createdBy` as `text` is valid — relationship not required for data scope
- Missing ownership field or create hook — scope checks cannot attribute documents
- Custom field name without `createdByField` in `options`
- `featureCode` / `actionCode` mismatch with seeded data

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

Returns the auth users collection slug: `adminUser || "users"`. The plugin uses `config.admin.user` for hierarchy lookups and default users access — use the same helper when building `relationTo` on **relationship** ownership fields or `getPermissionAccess` `options.usersCollectionSlug`.

```ts
import { resolveUsersCollectionSlug } from "@zealamic/payload-plugin-rbac";

const usersSlug = resolveUsersCollectionSlug(config.admin?.user);
```

### `getCreatedByRelationshipField(params?)`

Builds a **hidden** ownership field. Default (no `usersCollectionSlug`) → **`text`**; pass `usersCollectionSlug` only when you want a hidden **`relationship`**.

```ts
getCreatedByRelationshipField(params?: {
  createdByFieldName?: string | null;  // default: "createdBy"
  usersCollectionSlug?: string | null; // omitted → text; set → relationship + relationTo
}): Field
```

| Param | Default | Effect |
| ----- | ------- | ------ |
| `createdByFieldName` | `"createdBy"` | Field `name`. Custom names need a custom create hook (`createdByOnCreateBeforeChangeHook` only sets `createdBy`). |
| `usersCollectionSlug` | — (→ `text`) | When set: `type: "relationship"`, `relationTo: slug`, `admin.hidden: true`. When omitted: `type: "text"`, `admin.hidden: true`. |

**Examples:**

```ts
// Plugin default — hidden text (permission-actions, roles, users, …)
fields: [getCreatedByRelationshipField()],
hooks: { beforeChange: [createdByOnCreateBeforeChangeHook] },

// Hidden relationship (uncommon — only if you need relationTo on a hidden field)
fields: [
  getCreatedByRelationshipField({
    usersCollectionSlug: resolveUsersCollectionSlug(config.admin?.user),
  }),
],

// Custom name — hidden text + custom hook + createdByField in options
fields: [getCreatedByRelationshipField({ createdByFieldName: "author" })],
```

For **visible** fields in Admin, define inline (see examples above). `options.usersCollectionSlug` on `getPermissionAccess` is separate — hierarchy only.

### `mergeBeforeListTable(pluginComponent, consumerComponents?)`

Prepends a plugin list component before consumer `beforeListTable` entries. Used internally by reorder clients; exported for custom plugins.

---

## Hooks exports

### `createdByOnCreateBeforeChangeHook`

Sets `createdBy` to `req.user.id` on **create** (works with `text` or `relationship`). No-op when `req.user` is missing or `createdBy` is already set. For other field names (`author`, …), use a custom hook — see [Example — custom field name](#example--custom-field-name-author).

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
| Ownership field | `text` `createdBy` + hook, or [`getCreatedByRelationshipField()`](#getcreatedbyrelationshipfieldparams) for hidden fields |
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
