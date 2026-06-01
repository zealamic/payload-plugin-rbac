# Translation Guide

This guide explains how to customize Admin UI labels, placeholders, select options, and component text for the RBAC plugin.

## Overview

Translations are passed through the plugin's `translations` option:

```ts
import type { RBACTranslations } from "@zealamic/payload-auth-rbac-plugin/types";
import { payloadAuthRbacPlugin } from "@zealamic/payload-auth-rbac-plugin";

const translations: RBACTranslations = {
  en: {
    collections: {
      permissionActions: {
        labels: { singular: "Action", plural: "Actions" },
      },
    },
  },
};

export default buildConfig({
  plugins: [payloadAuthRbacPlugin({ translations })],
});
```

Type definition: import `RBACTranslations` from `@zealamic/payload-auth-rbac-plugin/types`.

## How translations are applied

The plugin uses translations in two places:

| Layer | Purpose | Source |
|---|---|---|
| **Collection config** | Field labels, placeholders, select option labels, admin group | Plugin defaults merged with your overrides, applied per locale |
| **Payload `config.i18n.translations`** | Role-permission matrix UI strings (`useTranslation` keys) | Registered under `components.rolePermissionMatrix` |

Merge order when the plugin loads:

```
plugin English defaults
  → deep-merge your pluginOptions.translations
    → deep-merge into existing config.i18n.translations
```

**Deep merge** means you only need to override the keys you change — untouched keys keep the plugin's built-in English defaults.

### Auto-sync with Payload `i18n`

You **do not** need to copy plugin translations into `config.i18n.translations` yourself. When the plugin loads, it automatically registers its strings into Payload's i18n system:

```
your pluginOptions.translations
  → merged with plugin English defaults
    → merged into config.i18n.translations (alongside any existing project translations)
```

Pass everything through **`payloadAuthRbacPlugin({ translations })`** only.

**You still configure Payload `i18n` for:**

- `supportedLanguages` — which locales the Admin UI can switch to
- `fallbackLanguage` — fallback when a key is missing

**You do not need to:**

```ts
// ❌ Redundant — plugin already writes RBAC strings to config.i18n.translations
export default buildConfig({
  i18n: {
    supportedLanguages: { en, vi },
    translations: {
      en: {
        collections: {
          permissionActions: { /* duplicate of plugin config */ },
        },
        components: {
          rolePermissionMatrix: { /* duplicate */ },
        },
      },
    },
  },
  plugins: [
    payloadAuthRbacPlugin({
      translations: { en: { /* same keys again */ } },
    }),
  ],
});
```

**Correct pattern:**

```ts
export default buildConfig({
  i18n: {
    supportedLanguages: { en, vi },
    fallbackLanguage: "en",
    // optional: your own non-RBAC project strings only
    translations: {
      en: {
        general: { myAppTitle: "My App" },
      },
    },
  },
  plugins: [
    payloadAuthRbacPlugin({
      translations: {
        en: { collections: { permissionActions: { /* RBAC overrides */ } } },
        vi: { /* ... */ },
      },
    }),
  ],
});
```

RBAC collection labels, field labels, and matrix UI strings are owned by the plugin config. Your project's `i18n.translations` can hold unrelated app copy — the plugin deep-merges RBAC entries on top without duplication.

### Serializable data only (Payload v3 / Next.js)

Plugin config crosses the **Server → Client** boundary in Payload v3 (Admin UI runs in Next.js). The `translations` object must be **pure, static, JSON-like data**.

**Do:**

```ts
translations: {
  en: {
    collections: {
      roles: {
        labels: { singular: "Role", plural: "Roles" },
      },
    },
  },
}
```

**Do not:**

```ts
// ❌ Functions — cannot serialize to the client
labels: { singular: () => "Role" }

// ❌ Calling i18n libraries at config time
labels: { singular: t("roles.singular") }

// ❌ Dynamic logic or class instances
admin: { group: getGroupLabel() }
```

Use plain strings (or nested objects of plain strings) only. The plugin builds per-locale label maps as static `{ en: "...", vi: "..." }` records for this reason — dynamic `LabelFunction` values break after serialization.

If you need conditional copy, resolve it **before** `buildConfig` and assign the resulting string literals to `translations`. Never pass runtime hooks into the plugin options object.

## Locale keys

Top-level keys in `translations` are **locale codes** (e.g. `en`, `fr`, `vi`). They must match locales registered in your Payload config:

```ts
import { en } from "@payloadcms/translations/languages/en";

export default buildConfig({
  i18n: {
    supportedLanguages: { en },
    fallbackLanguage: "en",
  },
  plugins: [
    payloadAuthRbacPlugin({
      translations: {
        en: { /* ... */ },
      },
    }),
  ],
});
```

The plugin ships with **English defaults** (`en`). Use `translations.en` to override those defaults, or add other locale keys (e.g. `fr`, `vi`) for additional languages.

Plugin translations are **auto-synced** into `config.i18n.translations` — register locales in `i18n.supportedLanguages`, but put RBAC strings only in `payloadAuthRbacPlugin({ translations })`. See [Auto-sync with Payload `i18n`](#auto-sync-with-payload-i18n).

## Translation shape

```ts
type RBACTranslations = {
  [locale: string]: {
    collections?: {
      permissionActions?: { /* ... */ };
      permissionFeatures?: { /* ... */ };
      permissions?: { /* ... */ };
      roles?: { /* ... */ };
      rolesPermissions?: { /* ... */ };
      users?: { /* ... */ };
    };
    components?: {
      rolePermissionMatrix?: { /* ... */ };
    };
  };
};
```

Collection keys use **camelCase** (not collection slugs):

| Config key | Collection slug |
|---|---|
| `permissionActions` | `permission-actions` |
| `permissionFeatures` | `permission-features` |
| `permissions` | `permissions` |
| `roles` | `roles` |
| `rolesPermissions` | `roles-permissions` |
| `users` | users collection (modified by plugin) |

## Collection translation keys

Every collection translation object supports these top-level groups:

```ts
{
  labels?: {
    singular?: string;
    plural?: string;
  };
  admin?: {
    group?: string;   // Admin sidebar group name
  };
  fields?: {
    [fieldName]: { /* per-field keys */ };
  };
}
```

### Common field keys

| Key | Used on | Description |
|---|---|---|
| `label` | all fields | Field label in Admin |
| `placeholder` | text, number, select | Input / select placeholder |

### Select option keys

For `status` fields (`active` / `inactive` values), use:

```ts
status: {
  label: "Status",
  placeholder: "Select status",
  activeLabel: "Active",      // option value "active"
  inactiveLabel: "Inactive",  // option value "inactive"
}
```

For `type` field on `permission-actions` (`main` / `sub` values):

```ts
type: {
  label: "Type",
  placeholder: "Select type",
  mainLabel: "Main",   // option value "main"
  subLabel: "Sub",     // option value "sub"
}
```

Option label keys follow the pattern `{value}Label`, where `{value}` is the option's stored value (e.g. `active` → `activeLabel`, `main` → `mainLabel`).

---

## Per-collection reference

Each block below is the **object you place under a locale** in plugin config. Replace `<locale>` with your language code (e.g. `en`).

```ts
translations: {
  <locale>: {
    collections: {
      permissionActions: { /* shape below */ },
    },
  },
}
```

All keys are optional unless you need to override that string.

### `permissionActions`

**Config path:** `translations.<locale>.collections.permissionActions`

```ts
{
  labels?: {
    singular?: string;
    plural?: string;
  };
  admin?: {
    group?: string;
  };
  fields?: {
    code?: {
      label?: string;
      placeholder?: string;
    };
    type?: {
      label?: string;
      placeholder?: string;
      mainLabel?: string;
      subLabel?: string;
    };
    sortOrder?: {
      label?: string;
      placeholder?: string;
    };
    status?: {
      label?: string;
      placeholder?: string;
      activeLabel?: string;
      inactiveLabel?: string;
    };
  };
}
```

### `permissionFeatures`

**Config path:** `translations.<locale>.collections.permissionFeatures`

```ts
{
  labels?: {
    singular?: string;
    plural?: string;
  };
  admin?: {
    group?: string;
  };
  fields?: {
    code?: {
      label?: string;
      placeholder?: string;
    };
    sortOrder?: {
      label?: string;
      placeholder?: string;
    };
    status?: {
      label?: string;
      placeholder?: string;
      activeLabel?: string;
      inactiveLabel?: string;
    };
  };
}
```

### `permissions`

**Config path:** `translations.<locale>.collections.permissions`

```ts
{
  labels?: {
    singular?: string;
    plural?: string;
  };
  admin?: {
    group?: string;
  };
  fields?: {
    name?: {
      label?: string;
      placeholder?: string;
    };
    permissionFeature?: {
      label?: string;
      placeholder?: string;
    };
    permissionAction?: {
      label?: string;
      placeholder?: string;
    };
    sortOrder?: {
      label?: string;
      placeholder?: string;
    };
    status?: {
      label?: string;
      placeholder?: string;
      activeLabel?: string;
      inactiveLabel?: string;
    };
  };
}
```

### `roles`

**Config path:** `translations.<locale>.collections.roles`

The matrix field's **schema name** is `permissionMatrixDraft`. Translation config uses the key `permissionMatrix` for its Admin label only — not for `collections.roles.fields` overrides.

```ts
{
  labels?: {
    singular?: string;
    plural?: string;
  };
  admin?: {
    group?: string;
  };
  fields?: {
    code?: {
      label?: string;
      placeholder?: string;
    };
    name?: {
      label?: string;
      placeholder?: string;
    };
    description?: {
      label?: string;
      placeholder?: string;
    };
    status?: {
      label?: string;
      placeholder?: string;
      activeLabel?: string;
      inactiveLabel?: string;
    };
    permissionMatrix?: {
      label?: string;
      placeholder?: string;
    };  // label for schema field permissionMatrixDraft
  };
}
```

### `rolesPermissions`

**Config path:** `translations.<locale>.collections.rolesPermissions`

```ts
{
  labels?: {
    singular?: string;
    plural?: string;
  };
  admin?: {
    group?: string;
  };
  fields?: {
    role?: {
      label?: string;
      placeholder?: string;
    };
    permission?: {
      label?: string;
      placeholder?: string;
    };
    enabled?: {
      label?: string;
      placeholder?: string;
    };
  };
}
```

### `users`

Only field labels (no collection labels — the users collection belongs to your app).

**Config path:** `translations.<locale>.collections.users`

```ts
{
  fields?: {
    isSuperAdmin?: {
      label?: string;
    };
    roles?: {
      label?: string;
    };
  };
}
```

---

## Component translations: role permission matrix

The matrix UI reads strings via Payload's `useTranslation` with keys under `components.rolePermissionMatrix`.

**Config path:** `translations.<locale>.components.rolePermissionMatrix`

```ts
{
  title?: string;
  viewInUpdateScreenOnly?: {
    label?: string;
    placeholder?: string;
  };
  loading?: {
    placeholder?: string;
  };
  features?: {
    label?: string;
  };
  actions?: {
    label?: string;
    create?: string;
    read?: string;
    update?: string;
    delete?: string;
    // add more keys matching permission-actions.code (e.g. publish?: string)
  };
}
```

### Dynamic action labels

Main action column labels are resolved by **action code**:

```
components:rolePermissionMatrix:actions:{actionCode}
```

If you add a custom permission action with `code: "publish"`, add a matching translation:

```ts
actions: {
  label: "Actions",
  create: "Create",
  read: "Read",
  update: "Update",
  delete: "Delete",
  publish: "Publish",   // matches permission-actions.code = "publish"
}
```

### Sub-action labels (limitation and workaround)

Sub-actions (`type: "sub"` on `permission-actions`) are rendered in a secondary row below each feature. Unlike main actions, **sub-action labels are not passed through `useTranslation`** — the matrix displays the raw `permission-actions.code` string.

**Workaround:** treat `code` as the admin-facing label and use human-readable camelCase values when creating sub-actions:

| Avoid | Prefer | Admin display |
|---|---|---|
| `ad` | `approveDraft` | `approveDraft` |
| `x1` | `archive` | `archive` |
| `pub` | `publishLive` | `publishLive` |

Example when seeding or creating sub-actions:

```ts
await payload.create({
  collection: "permission-actions",
  data: {
    code: "approveDraft",
    type: "sub",
    status: "active",
  },
});
```

For main actions, always add a matching entry under `components.rolePermissionMatrix.actions` in `translations`. For sub-actions, rely on readable `code` values until matrix sub-action i18n is added.

---

## Examples

### Single locale (`en`)

Override built-in English defaults. Unspecified keys deep-merge with plugin defaults:

```ts
import { payloadAuthRbacPlugin } from "@zealamic/payload-auth-rbac-plugin";

export const rbacPlugin = payloadAuthRbacPlugin({
  translations: {
    en: {
      collections: {
        permissionActions: {
          labels: {
            singular: "Permission Action",
            plural: "Permission Actions",
          },
          admin: { group: "Access Control" },
          fields: {
            code: {
              label: "Action Code",
              placeholder: "Enter code (e.g. create, read, update, delete)",
            },
            status: {
              label: "Status",
              activeLabel: "Active",
              inactiveLabel: "Inactive",
            },
          },
        },
        roles: {
          labels: { singular: "Role", plural: "Roles" },
          fields: {
            permissionMatrix: { label: "Permission Matrix" }, // → permissionMatrixDraft field
          },
        },
      },
      components: {
        rolePermissionMatrix: {
          title: "Permission Matrix",
          actions: {
            label: "Actions",
            create: "Create",
            read: "Read",
            update: "Update",
            delete: "Delete",
          },
        },
      },
    },
  },
});
```

### Bilingual setup (`en` + `vi`)

Register both locales in Payload `i18n`, then pass both keys in `translations`:

```ts
import { en } from "@payloadcms/translations/languages/en";
import { vi } from "@payloadcms/translations/languages/vi";
import { payloadAuthRbacPlugin } from "@zealamic/payload-auth-rbac-plugin";

export default buildConfig({
  i18n: {
    supportedLanguages: { en, vi },
    fallbackLanguage: "en",
  },
  plugins: [
    payloadAuthRbacPlugin({
      translations: {
        // Partial override: merges with plugin English defaults
        en: {
          collections: {
            permissionActions: {
              admin: { group: "Access Control" },
              fields: {
                code: { label: "Action Code" },
              },
            },
            roles: {
              labels: { singular: "User Role" }, // only this key overridden
              // plural, fields, etc. still come from plugin defaults
            },
          },
          components: {
            rolePermissionMatrix: {
              title: "Permission Matrix",
            },
          },
        },

        // Full locale block: no English default tree under `vi`
        // Provide every string admins will see when UI language is Vietnamese
        vi: {
          collections: {
            permissionActions: {
              labels: {
                singular: "Hành động quyền",
                plural: "Hành động quyền",
              },
              admin: { group: "Kiểm soát truy cập" },
              fields: {
                code: {
                  label: "Mã hành động",
                  placeholder: "Nhập mã (vd: create, read, update, delete)",
                },
                type: {
                  label: "Loại",
                  placeholder: "Chọn loại",
                  mainLabel: "Chính",
                  subLabel: "Phụ",
                },
                status: {
                  label: "Trạng thái",
                  activeLabel: "Hoạt động",
                  inactiveLabel: "Ngừng hoạt động",
                },
              },
            },
            roles: {
              labels: { singular: "Vai trò", plural: "Vai trò" },
              fields: {
                permissionMatrix: { label: "Ma trận quyền" }, // → permissionMatrixDraft field
              },
            },
            users: {
              fields: {
                isSuperAdmin: { label: "Siêu quản trị" },
                roles: { label: "Vai trò được gán" },
              },
            },
          },
          components: {
            rolePermissionMatrix: {
              title: "Ma trận quyền",
              loading: { placeholder: "Đang tải ma trận quyền..." },
              features: { label: "Tính năng" },
              actions: {
                label: "Hành động",
                create: "Tạo mới",
                read: "Xem",
                update: "Cập nhật",
                delete: "Xóa",
              },
            },
          },
        },
      },
    }),
  ],
});
```

**How deep-merge behaves across locales:**

```
Plugin defaults (en only)
        │
        ├─► translations.en  ──deep-merge──► merged en (defaults + your partial overrides)
        │
        └─► translations.vi  ──no en fallback──► vi block is exactly what you provide
```

- **`en`:** safe to override selectively; missing keys inherit plugin English defaults.
- **`vi` (or any non-default locale):** the plugin does not copy missing keys from `en`. Supply complete strings for that locale, or rely on Payload's `fallbackLanguage` for gaps.

Both locales coexist in one config object. The Admin UI shows the block matching the user's selected language.

---

## Partial overrides

You do not need to provide every key. Overrides merge deeply with English defaults:

```ts
translations: {
  en: {
    collections: {
      roles: {
        labels: { singular: "User Role" },  // only override singular label
      },
    },
  },
}
```

Unspecified keys (`plural`, field labels, etc.) fall back to the plugin's built-in English defaults **for the `en` locale only**. For other locales (e.g. `vi`), provide complete coverage — see [Bilingual setup](#bilingual-setup-en--vi).

---

## TypeScript support

Import `RBACTranslations` for the full plugin config shape:

```ts
import type { RBACTranslations } from "@zealamic/payload-auth-rbac-plugin/types";
```

For a single collection, import the matching type. Each type is a map of locale codes to translation objects — the shapes in [Per-collection reference](#per-collection-reference) are the value for one locale:

```ts
import type {
  PermissionActionsCollectionTranslations,
  PermissionFeaturesCollectionTranslations,
  PermissionsCollectionTranslations,
  RolesCollectionTranslations,
  RolesPermissionsCollectionTranslations,
  UsersModificationTranslations,
  RolePermissionMatrixClientTranslations,
} from "@zealamic/payload-auth-rbac-plugin/types";

// Example: type-safe permissionActions block for one locale
const enPermissionActions: PermissionActionsCollectionTranslations["en"] = {
  labels: { singular: "Action", plural: "Actions" },
};
```

Use `RBACTranslations` when configuring the plugin; use collection-specific types when splitting translations into separate files.

---

## `translations` vs `collections` overrides

These are separate customization paths:

| Mechanism | What it changes |
|---|---|
| `translations` | Labels, placeholders, select option text, matrix UI strings |
| `collections.<name>.labels` | Collection labels directly (bypasses translation merge for labels) |
| `collections.<name>.admin` | Admin config directly (group, columns, hidden, etc.) |
| `collections.<name>.fields` | Field schema overrides (hide fields, change validation, etc.) |

Use `translations` for i18n. Use `collections` for structural Admin changes (see [OVERVIEW.md](./OVERVIEW.md)).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Labels not updating | Locale key mismatch | Ensure `translations` locale keys match `i18n.supportedLanguages` |
| Select options untranslated | Missing `{value}Label` keys | Add `activeLabel` / `inactiveLabel` or `mainLabel` / `subLabel` |
| Matrix action shows raw code | No entry under `actions.{code}` | Add key matching `permission-actions.code` |
| Matrix UI crashes on load | Non-serializable translation values (functions, `t()` calls, class instances) | Use static strings only in `translations`; see [Serializable data only](#serializable-data-only-payload-v3--nextjs) |
| Non-English text garbled | Invalid encoding in config strings | Save files as UTF-8 and use proper Unicode characters |
| Changes not visible | Cached Admin bundle | Restart dev server; regenerate import map if needed |

---

## Related docs

- [OVERVIEW.md](./OVERVIEW.md) — plugin setup and options
- [ROLE.md](./ROLE.md) — role matrix behavior
