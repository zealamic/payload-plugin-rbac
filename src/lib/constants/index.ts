import * as general from "./general.js";
import * as permission from "./permission.js";
import * as permissionAction from "./permission-action.js";
import * as permissionFeature from "./permission-feature.js";
import * as role from "./role.js";
import * as user from "./user.js";

export const CONSTANTS = {
  GENERAL: general,
  PERMISSION: permission,
  PERMISSION_FEATURE: permissionFeature,
  PERMISSION_ACTION: permissionAction,
  ROLE: role,
  USER: user,
} as const;
