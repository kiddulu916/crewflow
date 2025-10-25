"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = void 0;
exports.hasPermission = hasPermission;
exports.requirePermission = requirePermission;
var Permission;
(function (Permission) {
    Permission["VIEW_OWN_TIME"] = "view:own_time";
    Permission["EDIT_OWN_TIME"] = "edit:own_time";
    Permission["VIEW_CREW_TIME"] = "view:crew_time";
    Permission["APPROVE_TIME"] = "approve:time";
    Permission["VIEW_ALL_TIME"] = "view:all_time";
    Permission["MANAGE_PROJECTS"] = "manage:projects";
    Permission["MANAGE_TIMECARDS"] = "manage:timecards";
    Permission["MANAGE_USERS"] = "manage:users";
    Permission["VIEW_FINANCIALS"] = "view:financials";
    Permission["EXPORT_PAYROLL"] = "export:payroll";
    Permission["MANAGE_INTEGRATIONS"] = "manage:integrations";
})(Permission || (exports.Permission = Permission = {}));
const rolePermissions = {
    FIELD_WORKER: [
        Permission.VIEW_OWN_TIME,
        Permission.EDIT_OWN_TIME
    ],
    FOREMAN: [
        Permission.VIEW_OWN_TIME,
        Permission.EDIT_OWN_TIME,
        Permission.VIEW_CREW_TIME,
        Permission.APPROVE_TIME
    ],
    PROJECT_MANAGER: [
        Permission.VIEW_ALL_TIME,
        Permission.APPROVE_TIME,
        Permission.MANAGE_PROJECTS,
        Permission.MANAGE_TIMECARDS,
        Permission.VIEW_FINANCIALS
    ],
    ADMIN: [
        Permission.VIEW_ALL_TIME,
        Permission.APPROVE_TIME,
        Permission.MANAGE_PROJECTS,
        Permission.MANAGE_TIMECARDS,
        Permission.MANAGE_USERS,
        Permission.VIEW_FINANCIALS,
        Permission.EXPORT_PAYROLL,
        Permission.MANAGE_INTEGRATIONS
    ],
    OWNER: Object.values(Permission)
};
function hasPermission(role, permission) {
    return rolePermissions[role]?.includes(permission) || false;
}
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!hasPermission(req.user.role, permission)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
//# sourceMappingURL=rbac.js.map