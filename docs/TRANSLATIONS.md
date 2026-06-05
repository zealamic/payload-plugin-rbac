# Translations guide

Customize Admin labels, placeholders, select options, and permission-matrix UI text via the plugin `translations` option.

```ts
import type { RBACTranslations } from "@zealamic/payload-auth-rbac-plugin/types";
import { payloadAuthRbacPlugin } from "@zealamic/payload-auth-rbac-plugin";

export default buildConfig({
  i18n: {
    supportedLanguages: { en, vi },
    fallbackLanguage: "en",
  },
  plugins: [
    payloadAuthRbacPlugin({
      translations: {
        en: {
          /* partial overrides OK */
        },
        vi: {
          /* provide full strings for vi */
        },
      },
    }),
  ],
});
```

---

## How it works

Translations are used in **two places**:

| Layer                          | What it affects                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| **Collection config**          | Sidebar group, collection labels, field labels, placeholders, select option labels   |
| **`config.i18n.translations`** | Permission matrix UI (`useTranslation` keys under `components.rolePermissionMatrix`) |

**Merge order when the plugin loads:**

```
Plugin English defaults
  → deep-merge your pluginOptions.translations
    → deep-merge into existing config.i18n.translations
```

You only pass RBAC strings to **`payloadAuthRbacPlugin({ translations })`**. The plugin registers them into Payload i18n automatically — do **not** duplicate the same keys in `config.i18n.translations`.

Your project's `config.i18n` still owns:

- `supportedLanguages`
- `fallbackLanguage`
- Non-RBAC app strings (optional)

### Locale merge behavior

| Locale            | Behavior                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `en`              | Partial overrides OK — missing keys inherit plugin English defaults                                          |
| Other (e.g. `vi`) | **No** auto-fill from `en` — provide complete strings for that locale, or rely on Payload `fallbackLanguage` |

### Serializable values only (Payload 3 / Next.js)

Use **plain strings** (and nested objects of strings) only:

```ts
// ✅
labels: { singular: "Role", plural: "Roles" }

// ❌ functions, i18n library calls, class instances
labels: { singular: () => "Role" }
```

---

## Config shape

Top-level keys = **locale codes** (`en`, `vi`, …). Must match `i18n.supportedLanguages`.

```ts
type RBACTranslations = {
  [locale: string]: {
    collections?: {
      permissionActions?: CollectionTranslations;
      permissionFeatures?: CollectionTranslations;
      permissions?: CollectionTranslations;
      roles?: CollectionTranslations;
      rolesPermissions?: CollectionTranslations;
      users?: UsersFieldTranslations; // fields only
    };
    components?: {
      rolePermissionMatrix?: MatrixTranslations;
    };
  };
};
```

### Collection config keys (camelCase)

| Config key           | Collection slug                        |
| -------------------- | -------------------------------------- |
| `permissionActions`  | `permission-actions`                   |
| `permissionFeatures` | `permission-features`                  |
| `permissions`        | `permissions`                          |
| `roles`              | `roles`                                |
| `rolesPermissions`   | `roles-permissions`                    |
| `users`              | Your auth collection (plugin-modified) |

Every collection block supports:

```ts
{
  labels?: { singular?: string; plural?: string };
  admin?: { group?: string };
  fields?: { [fieldName]: FieldTranslation };
}
```

### Common field keys

| Key           | Used on              |
| ------------- | -------------------- |
| `label`       | All fields           |
| `placeholder` | Text, number, select |

### Select option labels

Pattern: **`{value}Label`** where `{value}` is the stored option value.

```ts
// status: active | inactive
status: {
  label: "Status",
  placeholder: "Select status",
  activeLabel: "Active",
  inactiveLabel: "Inactive",
}

// permission-actions type: main | sub
type: {
  mainLabel: "Main",
  subLabel: "Sub",
}

// roles dataScope: own | hierarchy | all
dataScope: {
  ownLabel: "Own",
  hierarchyLabel: "Hierarchy",
  allLabel: "All",
}
```

---

## Per-collection field keys

All keys are optional. Defaults live in `src/collections/*/default-data.ts`.

### `permissionActions`

| Field       | Keys                                                   |
| ----------- | ------------------------------------------------------ |
| `code`      | `label`, `placeholder`                                 |
| `type`      | `label`, `placeholder`, `mainLabel`, `subLabel`        |
| `sortOrder` | `label`, `placeholder`                                 |
| `status`    | `label`, `placeholder`, `activeLabel`, `inactiveLabel` |

### `permissionFeatures`

| Field       | Keys                                                   |
| ----------- | ------------------------------------------------------ |
| `code`      | `label`, `placeholder`                                 |
| `sortOrder` | `label`, `placeholder`                                 |
| `status`    | `label`, `placeholder`, `activeLabel`, `inactiveLabel` |

### `permissions`

| Field               | Keys                                                   |
| ------------------- | ------------------------------------------------------ |
| `name`              | `label`, `placeholder`                                 |
| `permissionFeature` | `label`, `placeholder`                                 |
| `permissionAction`  | `label`, `placeholder`                                 |
| `sortOrder`         | `label`, `placeholder`                                 |
| `status`            | `label`, `placeholder`, `activeLabel`, `inactiveLabel` |

### `roles`

| Field                         | Keys                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `code`, `name`, `description` | `label`, `placeholder`                                                           |
| `status`                      | `label`, `placeholder`, `activeLabel`, `inactiveLabel`                           |
| `dataScope`                   | `label`, `placeholder`, `ownLabel`, `hierarchyLabel`, `allLabel`                 |
| `permissionMatrix`            | `label`, `placeholder` — **label only** for schema field `permissionMatrixDraft` |

> **Field name vs translation key:** schema field = `permissionMatrixDraft`; translation key = `permissionMatrix`. For `collections.roles.fields` overrides, use schema name `permissionMatrixDraft`.

### `rolesPermissions`

| Field                | Keys                   |
| -------------------- | ---------------------- |
| `role`, `permission` | `label`, `placeholder` |
| `enabled`            | `label`, `placeholder` |

### `users` (fields only)

| Field          | Keys                   |
| -------------- | ---------------------- |
| `isSuperAdmin` | `label`                |
| `roles`        | `label`, `placeholder` |
| `parent`       | `label`, `placeholder` |

No collection `labels` — the users collection belongs to your app.

---

## Permission matrix UI

**Config path:** `translations.<locale>.components.rolePermissionMatrix`

Registered as Payload i18n keys: `components:rolePermissionMatrix:…`

| Key                            | Description                                                     |
| ------------------------------ | --------------------------------------------------------------- |
| `title`                        | Matrix heading                                                  |
| `viewInUpdateScreenOnly.label` | Shown on create screen                                          |
| `loading.placeholder`          | Loading state                                                   |
| `features.label`               | Features column header                                          |
| `features.{code}`              | Label for main feature with matching `permission-features.code` |
| `actions.label`                | Actions column header                                           |
| `actions.{code}`               | Label for main action with matching `permission-actions.code`   |

### Features (dynamic)

The matrix resolves feature row labels via:

```
components:rolePermissionMatrix:features:{featureCode}
```

`{featureCode}` must match **`permission-features.code` exactly** (case-sensitive).

Add one key per feature code under `translations.<locale>.components.rolePermissionMatrix.features`:

```ts
payloadAuthRbacPlugin({
  translations: {
    en: {
      components: {
        rolePermissionMatrix: {
          features: {
            label: "Features",
            users: "Users", // permission-features.code = "users" (plugin default)
            posts: "Posts", // permission-features.code = "posts"
          },
        },
      },
    },
  },
});
```

If a key is missing, the UI falls back to `feature.id` (not `feature.code`).

### Main action labels (dynamic)

Main actions (`type: "main"`) resolve checkbox labels via:

```
components:rolePermissionMatrix:actions:{actionCode}
```

`{actionCode}` must match **`permission-actions.code` exactly**.

```ts
payloadAuthRbacPlugin({
  translations: {
    en: {
      components: {
        rolePermissionMatrix: {
          actions: {
            label: "Actions",
            create: "Create", // permission-actions.code = "create" (plugin default)
            read: "Read",
            update: "Update",
            delete: "Delete",
            publish: "Publish", // permission-actions.code = "publish" (custom)
          },
        },
      },
    },
  },
});
```

If a key is missing, the UI falls back to `action.id` (not `action.code`).

### Sub-action labels (limitation)

Sub-actions (`type: "sub"`) **do not** use `useTranslation` — the UI shows raw `permission-actions.code`.

**Workaround:** use readable codes when creating sub-actions (`approveDraft`, not `ad`).

---

## Examples

### Partial English override

```ts
payloadAuthRbacPlugin({
  translations: {
    en: {
      collections: {
        permissionActions: {
          admin: { group: "Access Control" },
          fields: {
            code: {
              label: "Action Code",
              placeholder: "e.g. create, read, update, delete",
            },
          },
        },
        roles: {
          fields: {
            permissionMatrix: { label: "Permission Matrix" },
          },
        },
      },
      components: {
        rolePermissionMatrix: {
          title: "Permission Matrix",
        },
      },
    },
  },
});
```

### Bilingual (`en` + `vi`)

```ts
import { en } from "@payloadcms/translations/languages/en";
import { vi } from "@payloadcms/translations/languages/vi";

export default buildConfig({
  i18n: {
    supportedLanguages: { en, vi },
    fallbackLanguage: "en",
  },
  plugins: [
    payloadAuthRbacPlugin({
      translations: {
        en: {
          collections: {
            roles: { labels: { singular: "Role", plural: "Roles" } },
          },
        },
        vi: {
          collections: {
            permissionActions: {
              labels: { singular: "Quyền thao tác", plural: "Quyền thao tác" },
              admin: { group: "Hệ thống" },
              fields: {
                code: { label: "Mã quyền thao tác" },
                status: {
                  activeLabel: "Hoạt động",
                  inactiveLabel: "Ngừng hoạt động",
                },
              },
            },
            roles: {
              labels: { singular: "Vai trò", plural: "Vai trò" },
              fields: {
                permissionMatrix: { label: "Ma trận quyền" },
                dataScope: {
                  ownLabel: "Của mình",
                  hierarchyLabel: "Phân cấp",
                  allLabel: "Tất cả",
                },
              },
            },
            users: {
              fields: {
                isSuperAdmin: { label: "Siêu quản trị" },
                roles: { label: "Vai trò" },
                parent: { label: "Quản lý trực tiếp" },
              },
            },
          },
          components: {
            rolePermissionMatrix: {
              title: "Ma trận quyền",
              loading: { placeholder: "Đang tải..." },
              features: { label: "Tính năng" },
              actions: {
                label: "Hành động",
                create: "Tạo",
                read: "Xem",
                update: "Sửa",
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

Working demo: `dev/rbac.ts`.

---

## TypeScript

```ts
import type { RBACTranslations } from "@zealamic/payload-auth-rbac-plugin/types";

// Per-collection types (value for one locale):
import type { RolesCollectionTranslations } from "@zealamic/payload-auth-rbac-plugin/types";
import type { RolePermissionMatrixClientTranslations } from "@zealamic/payload-auth-rbac-plugin/types";
```

---

## Default English strings

Shipped defaults (override via `translations.en`):

| Source file                                                    | Content               |
| -------------------------------------------------------------- | --------------------- |
| `src/collections/permission-actions/default-data.ts`           | Permission actions    |
| `src/collections/permission-features/default-data.ts`          | Permission features   |
| `src/collections/permissions/default-data.ts`                  | Permissions           |
| `src/collections/roles/default-data.ts`                        | Roles + dataScope     |
| `src/collections/roles-permissions/default-data.ts`            | Role permissions join |
| `src/collections/users/default-data.ts`                        | User fields           |
| `src/components/role-permission-matrix-client/default-data.ts` | Matrix UI             |

---

## Quick reference

| Goal                     | Path                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| Sidebar group            | `translations.<locale>.collections.<key>.admin.group`                       |
| Collection name          | `…labels.singular` / `…labels.plural`                                       |
| Field label              | `…fields.<fieldName>.label`                                                 |
| Select option            | `…fields.<fieldName>.<value>Label`                                          |
| Matrix title             | `…components.rolePermissionMatrix.title`                                    |
| Matrix action column     | `…components.rolePermissionMatrix.actions.<code>`                           |
| Override field in schema | Use **schema field name** (`permissionMatrixDraft`, not `permissionMatrix`) |

---

## Related docs

- [README](../README.md) — install and quick start
- [COLLECTIONS](./COLLECTIONS.md) — collection schemas and customization
- [UTILS](./UTILS.md) — access helpers
