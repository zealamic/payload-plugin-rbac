# Utils reference

This document lists only utilities that are currently exported.

Export sources:

- `@zealamic/payload-plugin-rbac`
- `@zealamic/payload-plugin-rbac/utils`

> Barrel file: `src/lib/utils/index.ts`

---

## Exported modules

`src/lib/utils/index.ts` exports from:

1. `access`
2. `data`
3. `fields`
4. `localization`

---

## Access exports

### `type DataScopeOptions`

```ts
type DataScopeOptions = {
  createdByField?: string; // default: "createdBy"
  usersCollectionSlug?: string; // default: "users"
};
```

Use this to configure ownership field and users slug for hierarchy logic.

### `getPermissionAccess({ featureCode, actionCode, mode?, collectionSlug?, options? })`

Unified access helper for Payload `access` config.

You can use one function for all common access cases:

- permission-only (`create`, `readVersions`, `unlock`, ...)
- read with data-scope filter
- modify (`update` / `delete`) with per-document scope check

Parameters:

- `featureCode` (`string`): feature code in `permission-features.code`
- `actionCode` (`string`): action code in `permission-actions.code`
- `mode` (`"none" | "modify"`, optional):
  - `"none"` (default) = permission check only
  - `"modify"` = check one target document by `id`
- `collectionSlug` (`string`, optional): required when `mode: "modify"`
- `options` (`DataScopeOptions`, optional): data-scope config

What it returns:

- In permission-only mode: Payload access function returning `boolean`
- In read-scope mode (`options` provided): Payload access function returning `boolean | Where`
- In modify mode: Payload access function returning `boolean`

```ts
// 1) permission-only (best for create/readVersions/unlock/etc.)
create: getPermissionAccess({
  featureCode: "posts",
  actionCode: "create",
});

// 2) read + scope (read mode inferred when options exists)
read: getPermissionAccess({
  featureCode: "posts",
  actionCode: "read",
  options: {
    createdByField: "createdBy",
    usersCollectionSlug: "users",
  },
});

// 3) update/delete + document scope (requires mode + collectionSlug)
update: getPermissionAccess({
  featureCode: "posts",
  actionCode: "update",
  mode: "modify",
  collectionSlug: "posts",
  options: { createdByField: "createdBy" },
});
```

How it works internally:

1. deny when `req.user` is missing
2. allow immediately for super admin
3. check RBAC by `featureCode` + `actionCode`
4. if read-scope mode: return scope filter (`true` or `Where`)
5. if modify mode: load target document by `id`, then enforce data scope

When to use each mode:

- **Permission-only**: operations that do not depend on document ownership/hierarchy  
  Example: `create`, `readVersions`, `unlock`
- **Read-scope**: list/read access that must be filtered by owner/hierarchy/all
- **Modify**: `update` and `delete` where permission depends on the specific document

Common mistakes to avoid:

- `mode: "modify"` without `collectionSlug` -> always denied
- expecting read-scope behavior without passing `options`
- `featureCode` / `actionCode` not matching values in your permission collections

### `getSuperAdminAccess`

Allow only super admins.

### `getAuthenticatedOrSuperAdminAccess`

Allow current document owner or super admin.

### `resolveEffectiveDataScope(req, options?)`

Resolve effective scope from roles: `own | hierarchy | all`.
Widest scope wins: `all > hierarchy > own`.

### `getHierarchyVisibleUserIds(req, options?)`

Return visible user IDs in hierarchy scope (self + descendants).

### `getDataScopeReadWhere(req, options?)`

Build data-scope read filter as `Where | true`.

### `isProtectedSuperAdminUserDoc(doc)`

Guard helper for user docs with `isSuperAdmin: true`.

### `canAccessDocumentByDataScope({ req, doc, featureCode, actionCode, collectionSlug, options? })`

Low-level per-document RBAC + data-scope check.

### `mergeDataScopeWhere(base, scopeWhere)`

Merge existing `where` with scope constraints.

```ts
const scopeWhere = await getDataScopeReadWhere(req, {
  createdByField: "createdBy",
});
const where = mergeDataScopeWhere(
  { status: { equals: "published" } },
  scopeWhere,
);
```

---

## Data exports

### `toID(value)`

Normalize relationship/id values to string id.

```ts
toID("507f1f77bcf86cd799439011"); // "507f1f77bcf86cd799439011"
toID({ id: "507f1f77bcf86cd799439011" }); // "507f1f77bcf86cd799439011"
toID(undefined); // ""
```

---

## Fields exports

### `getMergedFieldAffectingData({ fields, defaultField })`

Merge one plugin default field with a user override by matching field name.

### `getArrayOfMergedFieldAffectingData({ fields, defaultFields })`

Build final fields list:

- merge defaults by matching names
- append unmatched custom fields

---

## Localization exports

### `toLocaleRecord(locales, getValue)`

Build `{ [locale]: string }` records from locale list.

### `toSelectPlaceholder(locales, getValue)`

Build serializable select placeholders (safe across Payload v3 server/client boundary).

### `getMergedTranslations({ defaultTranslations, translations })`

Deep-merge translation objects.

### `getAllTranslationsOfSpecificObject({ translations, path, locales? })`

Extract nested translation branch by path (example: `"collections.roles"`).

---

## Commonly paired constant export

Not from `lib/utils`, but often used with access helpers:

```ts
import { CONSTANTS } from "@zealamic/payload-plugin-rbac";

CONSTANTS.ROLE.DATA_SCOPE;
CONSTANTS.ROLE.STATUS;
CONSTANTS.PERMISSION.STATUS;
CONSTANTS.PERMISSION_ACTION.TYPE;
CONSTANTS.USER.PARENT_PATH_SEPARATOR;
```

---

## Related docs

- [README](https://github.com/zealamic/payload-plugin-rbac/blob/main/README.md) — install and quick start
- [COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md) — collection schemas and customization
- [TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md) — i18n keys
