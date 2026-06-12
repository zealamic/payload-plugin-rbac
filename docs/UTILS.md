# Utils reference

Utilities exported from the plugin for access control, field merging, IDs, and translation helpers.

**Import from either:**

```ts
import { getPermissionAccess, CONSTANTS } from "@zealamic/payload-plugin-rbac";
// or
import { getPermissionAccess } from "@zealamic/payload-plugin-rbac/utils";
```

Both resolve to the same barrel: `src/lib/utils/index.ts`.

---

## Exported modules

| Module         | File                            | Purpose                                     |
| -------------- | ------------------------------- | ------------------------------------------- |
| `access`       | `src/lib/utils/access.ts`       | RBAC + data-scope access helpers            |
| `data`         | `src/lib/utils/data.ts`         | ID normalization                            |
| `fields`       | `src/lib/utils/fields.ts`       | Plugin field merge for collection overrides |
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

The plugin uses `createdByField: "id"` on the auth users collection (each user “owns” their own document). App collections typically use `"createdBy"`.

---

### `getPermissionAccess({ featureCode, actionCode, mode?, collectionSlug?, options? })`

Unified entrypoint for Payload `collection.access` handlers.

```ts
getPermissionAccess({
  featureCode: string;
  actionCode: string;
  mode?: "none" | "modify"; // default: "none"
  collectionSlug?: string;   // required when mode === "modify"
  options?: DataScopeOptions;
});
```

#### Modes (how to choose)

| Your goal                  | Config                                            | Return type        |
| -------------------------- | ------------------------------------------------- | ------------------ |
| Permission only            | omit `options`, `mode` stays `"none"`             | `boolean`          |
| Read list + row filter     | pass `options` (non-empty), omit `mode: "modify"` | `boolean \| Where` |
| Update/delete one document | `mode: "modify"` + `collectionSlug` + `options`   | `boolean`          |

`featureCode` / `actionCode` must match `permission-features.code` and `permission-actions.code`. The user must have an **enabled** row in `roles-permissions` for a matching active `permissions` record (unless super admin).

#### Examples

```ts
// 1) Permission-only — create, readVersions, unlock, etc.
create: getPermissionAccess({
  featureCode: "posts",
  actionCode: "create",
}),

// 2) Read + data scope (mode inferred when options is non-empty)
read: getPermissionAccess({
  featureCode: "posts",
  actionCode: "read",
  options: {
    createdByField: "createdBy",
    usersCollectionSlug: "users",
  },
}),

// 3) Update/delete — per-document scope check
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
```

Full working collection: `dev/collections/posts.ts`.

#### Evaluation order

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

- `mode: "modify"` without `collectionSlug` → always denied
- Expecting row filters without passing `options`
- `options: {}` (empty object) → treated as permission-only, not read-scope
- Codes in access config not matching seeded `permission-features` / `permission-actions`

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
CONSTANTS.GENERAL.RBAC_PREFIX;
```

---

## Quick reference

| Task                              | Helper / pattern                                               |
| --------------------------------- | -------------------------------------------------------------- |
| Collection CRUD access            | `getPermissionAccess({ ... })`                                 |
| RBAC collections (admin only)     | `getSuperAdminAccess`                                          |
| Custom row-level read filter      | `getPermissionAccess` + `options`                              |
| Custom document update/delete     | `getPermissionAccess` + `mode: "modify"`                       |
| Combine scope + business `where`  | `mergeDataScopeWhere`                                          |
| Override plugin collection fields | `getArrayOfMergedFieldAffectingData`                           |
| Plugin translation merge          | `getMergedTranslations` / `getAllTranslationsOfSpecificObject` |

---

## Related docs

- [README](https://github.com/zealamic/payload-plugin-rbac/blob/main/README.md) — install and quick start
- [COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md) — collection schemas, `dataScope`, field overrides
- [TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md) — i18n keys
