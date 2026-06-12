# Translations guide

Customize Admin labels, placeholders, select options, and permission-matrix UI text via the plugin `translations` option.

```ts
import type { RBACTranslations } from "@zealamic/payload-plugin-rbac";
import { payloadPluginRBAC } from "@zealamic/payload-plugin-rbac";

export default buildConfig({
  i18n: {
    supportedLanguages: { en, vi },
    fallbackLanguage: "en",
  },
  plugins: [
    payloadPluginRBAC({
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

You only pass RBAC strings to **`payloadPluginRBAC({ translations })`**. The plugin registers them into Payload i18n automatically — do **not** duplicate the same keys in `config.i18n.translations`.

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

`MatrixTranslations` matches `RolePermissionMatrixClientTranslations[string]` — see [Permission matrix UI](#permission-matrix-ui).

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
| `permissionMatrix`            | `label`, `placeholder` — labels the schema field `permissionMatrixDraft` in Admin |

> **Translation key vs schema field name**
>
> | Context | Name |
> | ------- | ---- |
> | `translations.*.collections.roles.fields` | `permissionMatrix` |
> | Collection schema / `collections.roles.fields` override | `permissionMatrixDraft` (`type: "json"`) |

When overriding the matrix field via `payloadPluginRBAC({ collections: { roles: { fields: [...] } } })`, use the **schema** name:

```ts
payloadPluginRBAC({
  collections: {
    roles: {
      fields: [
        {
          name: "permissionMatrixDraft",
          type: "json",
          admin: {
            condition: (_, __, { operation }) => operation === "update",
          },
        },
      ],
    },
  },
});
```

Field overrides are shallow-merged at the top level; `admin` and `admin.components` are deep-merged — you can override `admin.condition` without losing the default `Field` component.

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

### Static keys

| Config key                     | i18n key suffix                    | Description                          |
| ------------------------------ | ---------------------------------- | ------------------------------------ |
| `title`                        | `title`                            | Matrix heading                       |
| `viewInUpdateScreenOnly.label` | `viewInUpdateScreenOnly:label`     | Shown on create screen (no role `id`) |
| `loading.placeholder`          | `loading:placeholder`              | Loading state                        |
| `error.placeholder`            | `error:placeholder`                | Generic error heading when fetch fails |
| `featuresLabel`                | `featuresLabel`                    | Features column header               |
| `actionsLabel`                 | `actionsLabel`                     | Actions column header                |
| `search.placeholder`           | `search:placeholder`               | Feature search input placeholder     |
| `search.noResults`             | `search:noResults`                 | Empty state when search has no match |

On fetch failure, the UI shows `error.placeholder` plus the underlying error message.

### Features (dynamic)

The matrix resolves feature row labels via:

```
components:rolePermissionMatrix:features:{featureCode}
```

`{featureCode}` must match **`permission-features.code` exactly** (case-sensitive).

```ts
payloadPluginRBAC({
  translations: {
    en: {
      components: {
        rolePermissionMatrix: {
          featuresLabel: "Features",
          features: {
            users: "Users", // permission-features.code = "users" (plugin default)
            posts: "Posts", // permission-features.code = "posts"
          },
        },
      },
    },
  },
});
```

**Fallback:** `permission-features.code`, then `feature.id`.

Search matches translated feature label and raw `feature.code`.

### Action labels (dynamic — main and sub)

Both **main** (`type: "main"`) and **sub** (`type: "sub"`) actions resolve checkbox labels via:

```
components:rolePermissionMatrix:actions:{actionCode}
```

`{actionCode}` must match **`permission-actions.code` exactly**.

```ts
payloadPluginRBAC({
  translations: {
    en: {
      components: {
        rolePermissionMatrix: {
          actionsLabel: "Actions",
          actions: {
            create: "Create",
            read: "Read",
            update: "Update",
            delete: "Delete",
            publish: "Publish", // custom permission-actions.code
            approveDraft: "Approve draft", // sub-action example
          },
        },
      },
    },
  },
});
```

**Fallback:** `action.id` (when no translation key exists).

---

## Custom matrix field component (not translations)

Matrix **text** comes from `translations` above. To swap checkbox/search **renderers**, use a client field component — render functions cannot be passed through server plugin config.

**Option A — plugin shorthand:**

```ts
payloadPluginRBAC({
  components: {
    rolePermissionMatrixField:
      "./components/role-permission-matrix-field#RolePermissionMatrixField",
  },
});
```

**Option B — `collections.roles.fields` override** (same as other field overrides; include `type: "json"`).

The wrapper should pass `components` to `RolePermissionMatrixClient` or use `createRolePermissionMatrixClient()` from `@zealamic/payload-plugin-rbac/client`. See `dev/components/role-permission-matrix-field.tsx`.

Default field when unset: `@zealamic/payload-plugin-rbac/client#RolePermissionMatrixClient`.

---

## Examples

### Partial English override

```ts
payloadPluginRBAC({
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
          search: {
            placeholder: "Filter features…",
          },
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
    payloadPluginRBAC({
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
              error: { placeholder: "Không tải được ma trận quyền." },
              featuresLabel: "Tính năng",
              features: {
                posts: "Bài viết",
              },
              actionsLabel: "Hành động",
              search: {
                placeholder: "Tìm tính năng…",
                noResults: "Không có tính năng phù hợp.",
              },
              actions: {
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
import type {
  RBACTranslations,
  RolePermissionMatrixClientTranslations,
  RolesCollectionTranslations,
} from "@zealamic/payload-plugin-rbac";
```

Per-locale matrix strings: `RolePermissionMatrixClientTranslations["en"]`.

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

Default matrix UI includes `search`, `error`, and `features.users` / CRUD `actions` keys.

---

## Quick reference

| Goal                     | Path                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| Sidebar group            | `translations.<locale>.collections.<key>.admin.group`                       |
| Collection name          | `…labels.singular` / `…labels.plural`                                       |
| Field label (roles matrix) | `…collections.roles.fields.permissionMatrix.label`                        |
| Field override in schema | Use **`permissionMatrixDraft`** + `type: "json"`                            |
| Select option            | `…fields.<fieldName>.<value>Label`                                          |
| Matrix title             | `…components.rolePermissionMatrix.title`                                    |
| Matrix search            | `…components.rolePermissionMatrix.search.placeholder`                       |
| Feature row label        | `…components.rolePermissionMatrix.features.<code>`                          |
| Action checkbox label    | `…components.rolePermissionMatrix.actions.<code>` (main and sub)            |
| Custom field component   | `components.rolePermissionMatrixField` or `collections.roles.fields` override |

---

## Related docs

- [README](https://github.com/zealamic/payload-plugin-rbac/blob/main/README.md) — install and quick start
- [COLLECTIONS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/COLLECTIONS.md) — collection schemas and customization
- [UTILS](https://github.com/zealamic/payload-plugin-rbac/blob/main/docs/UTILS.md) — access helpers
