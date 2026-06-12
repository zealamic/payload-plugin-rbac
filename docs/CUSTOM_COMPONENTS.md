# Custom components guide

Replace the default permission matrix UI (checkboxes, search input) with your own React renderers while keeping plugin data loading, draft sync, and i18n behavior.

**Matrix labels** (feature names, action names, placeholders) come from [`translations`](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md) — not from this guide.

**Matrix widgets** (how checkboxes/inputs look) are customized here via client-only components.

---

## Important constraints (Payload 3 / Next.js)

| ✅ Works | ❌ Does not work |
| -------- | ---------------- |
| Client component that passes `components` to `RolePermissionMatrixClient` | Passing `renderCheckbox` / `renderTextInput` through `payloadPluginRBAC()` on the server |
| Import-map path string to your `"use client"` field module | Serializing render functions from plugin init into the Admin bundle |

Render functions must live in a **client module** in your app. The plugin only stores a **string path** to that module in collection config.

---

## After you customize

> **Restart the dev server** so Payload/Next.js picks up new client components and import map entries:
>
> ```bash
> yarn dev
> # or
> yarn payload
> ```
>
> In your own app, use the equivalent dev command (`next dev`, `payload dev`, etc.).

If you **added or changed** the Field component path in plugin config, also regenerate the import map before restarting:

```bash
# This repo
yarn generate:importmap
# or: yarn dev:generate-importmap

# Generic Payload CLI (set PAYLOAD_CONFIG_PATH to your config)
payload generate:importmap
```

Ensure `admin.importMap.baseDir` in `payload.config.ts` resolves paths used in component strings (see [Payload import map](https://payloadcms.com/docs/admin/components#import-map)).

---

## What you can override

Export from `@zealamic/payload-plugin-rbac/client`:

| Hook / helper | Overrides |
| ------------- | --------- |
| `renderCheckbox` | Permission checkboxes and feature **select-all** (supports `partialChecked` for indeterminate state) |
| `renderTextInput` | Feature **search** box above the matrix |

If a renderer is omitted, the matrix falls back to Payload `CheckboxInput` / `TextInput`.

### Types

```ts
import type {
  RolePermissionMatrixCheckboxRenderProps,
  RolePermissionMatrixClientComponents,
  RolePermissionMatrixClientProps,
  RolePermissionMatrixTextInputRenderProps,
} from "@zealamic/payload-plugin-rbac/client";
```

**`RolePermissionMatrixCheckboxRenderProps`**

| Prop | Description |
| ---- | ----------- |
| `checked` | Current checked state |
| `partialChecked` | Indeterminate (feature select-all when some permissions are on) |
| `id`, `name`, `label` | Use for accessible labeling |
| `onToggle(checked)` | Call when the user toggles |
| `readOnly` | Respect when user lacks save permission |

**`RolePermissionMatrixTextInputRenderProps`**

| Prop | Description |
| ---- | ----------- |
| `value`, `onChange` | Controlled search string |
| `placeholder` | Already translated via plugin i18n |
| `path` | Stable path string (`permission-matrix-search`) |

---

## Approach A — Wrapper field (recommended)

### 1. Create a client field component

```tsx
// components/role-permission-matrix-field.tsx
"use client";

import type {
  RolePermissionMatrixClientComponents,
  RolePermissionMatrixClientProps,
} from "@zealamic/payload-plugin-rbac/client";
import { RolePermissionMatrixClient } from "@zealamic/payload-plugin-rbac/client";

const matrixComponents: RolePermissionMatrixClientComponents = {
  renderCheckbox: ({ checked, id, label, name, onToggle, readOnly, partialChecked }) => (
    <label htmlFor={id}>
      <input
        type="checkbox"
        checked={checked}
        id={id}
        name={name}
        readOnly={readOnly}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(partialChecked);
        }}
        onChange={(e) => onToggle(e.target.checked)}
      />
      {label}
    </label>
  ),
  renderTextInput: ({ value, onChange, placeholder, path }) => (
    <input
      type="search"
      value={value}
      placeholder={placeholder}
      name={path}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
};

export const RolePermissionMatrixField = (props: RolePermissionMatrixClientProps) => (
  <RolePermissionMatrixClient {...props} components={matrixComponents} />
);
```

Working copy in this repo: `dev/components/role-permission-matrix-field.tsx`.

### 2. Register the field in plugin config

**Option 1 — plugin shorthand**

```ts
payloadPluginRBAC({
  components: {
    rolePermissionMatrixField:
      "./components/role-permission-matrix-field#RolePermissionMatrixField",
  },
});
```

**Option 2 — `collections.roles.fields` override**

```ts
payloadPluginRBAC({
  collections: {
    roles: {
      fields: [
        {
          name: "permissionMatrixDraft",
          type: "json",
          admin: {
            components: {
              Field: "./components/role-permission-matrix-field#RolePermissionMatrixField",
            },
            condition: (_, __, { operation }) => operation === "update",
          },
        },
      ],
    },
  },
});
```

Use the **schema** field name `permissionMatrixDraft` (not `permissionMatrix`). Include `type: "json"`.

Default when unset: `@zealamic/payload-plugin-rbac/client#RolePermissionMatrixClient`.

### 3. Import map + dev server

```bash
yarn generate:importmap
yarn dev
```

Open **Roles → edit an existing role** (matrix is update-only).

---

## Approach B — `createRolePermissionMatrixClient`

Use when you prefer a factory instead of a hand-written wrapper:

```tsx
"use client";

import {
  createRolePermissionMatrixClient,
  type RolePermissionMatrixClientComponents,
} from "@zealamic/payload-plugin-rbac/client";

const components: RolePermissionMatrixClientComponents = {
  renderCheckbox: (props) => { /* ... */ },
};

export const RolePermissionMatrixField = createRolePermissionMatrixClient(components);
```

Register the exported component the same way as Approach A (`components.rolePermissionMatrixField` or `collections.roles.fields`).

---

## `admin.importMap.baseDir`

Component paths are resolved relative to `baseDir`. In this monorepo dev app:

```ts
// payload.config.ts
admin: {
  importMap: {
    baseDir: path.resolve(dirname), // dev/ folder
  },
},
```

A path like `./components/role-permission-matrix-field#RolePermissionMatrixField` resolves to `dev/components/role-permission-matrix-field.tsx`.

In a consumer app, set `baseDir` to the directory that contains your `components/` folder (often the app root or `src/`).

---

## Checklist

1. [ ] Field module starts with `"use client"`
2. [ ] Named export matches the `#ExportName` suffix in the path string
3. [ ] Plugin config points to that path
4. [ ] `payload generate:importmap` run after path changes
5. [ ] Dev server restarted (`yarn dev` or `yarn dev:payload`)
6. [ ] Test on **role update** screen (not create)
7. [ ] Labels still come from `translations` if you change copy ([TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md))

---

## Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| Default Payload checkboxes still show | Custom field path not registered, import map stale, or dev server not restarted |
| `renderCheckbox` never called | `components` not passed on client — verify wrapper uses `RolePermissionMatrixClient` with `components` prop |
| Matrix missing on create | Expected — field `condition` is `operation === "update"` only |
| Type error on field override | Add `type: "json"` to `permissionMatrixDraft` override |
| Custom UI in plugin `payloadPluginRBAC({ components: { renderCheckbox } })` | Invalid — render functions cannot run from server config |

---

## Related docs

- [COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md) — `permissionMatrixDraft`, field merge, plugin options
- [TRANSLATIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/TRANSLATIONS.md) — matrix strings (`features`, `actions`, `search`, …)
- [README](https://github.com/zealamic/payload-plugin-rbac/blob/main/README.md) — install and quick start
