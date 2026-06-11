import { getPermissionAccess, payloadPluginRBAC } from "@zealamic/payload-plugin-rbac"

export const rbacPlugin = payloadPluginRBAC({
  autoModifyUsersCollection: true,
  collections: {
    // Demo: pass override params for each collection
    permissionActions: {
      // Demo 1: hide sortOrder field in admin form
      // fields: [
      //   {
      //     name: "sortOrder",
      //     type: "number",
      //     admin: {
      //       hidden: true,
      //     },
      //   },
      // ],
      // Demo 2: override collection access rules
      access: {
        read: getPermissionAccess({
          featureCode: "permission-actions",
          actionCode: "read",
        }),
        update: getPermissionAccess({
          featureCode: "permission-actions",
          actionCode: "update",
        }),
      },
    },
  },
  translations: {
    vi: {
      collections: {
        permissionActions: {
          labels: {
            singular: "Quyền thao tác",
            plural: "Quyền thao tác",
          },
          admin: {
            group: "Hệ thống",
          },
          fields: {
            code: {
              label: "Mã quyền thao tác",
              placeholder: "Nhập mã quyền thao tác (vd: create, read, update, delete)",
            },
            type: {
              label: "Loại quyền thao tác",
              placeholder: "Chọn loại quyền thao tác",
              mainLabel: "Chính",
              subLabel: "Phụ",
            },
            sortOrder: {
              label: "Thứ tự hiển thị",
              placeholder: "Nhập thứ tự (số nhỏ hiển trước)",
            },
            status: {
              label: "Trạng thái",
              placeholder: "Chọn trạng thái",
              activeLabel: "Hoạt động",
              inactiveLabel: "Ngừng hoạt động",
            },
          },
        },
      },
      components: {
        rolePermissionMatrix: {
          features: {
            posts: "Bài viết",
          },
        },
      },
    },
    en: {
      collections: {
        permissionActions: {
          labels: {
            singular: "Permission Action",
            plural: "Permission Actions",
          },
          admin: {
            group: "System",
          },
          fields: {
            code: {
              label: "Action Code",
              placeholder: "Enter action code (e.g. create, read, update, delete)",
            },
            type: {
              label: "Action Type",
              placeholder: "Select action type",
              mainLabel: "Main action",
              subLabel: "Sub action",
            },
            sortOrder: {
              label: "Display Order",
              placeholder: "Enter display order",
            },
            status: {
              label: "Status",
              placeholder: "Select status",
              activeLabel: "Active",
              inactiveLabel: "Inactive",
            },
          },
        },
      },
      components: {
        rolePermissionMatrix: {
          features: {
            posts: "Posts",
          },
        },
      },
    },
  },
})
