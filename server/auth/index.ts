// Domínio auth: identidade, papéis e permissões.
// Outros domínios importam só deste arquivo, nunca de arquivos internos.
export { PERMISSIONS, ALL_PERMISSIONS, DEFAULT_ROLES, isPermissionKey, type PermissionKey } from "@/server/auth/permissions"
export { ensureBaseData, registerUser, listPublicRoles, registerInputSchema, type RegisterInput } from "@/server/auth/service"
export { requirePermission, assertPermission, hasPermission } from "@/server/auth/guard"
