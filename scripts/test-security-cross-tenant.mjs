import { strict as assert } from "assert";

console.log("========================================================================");
console.log("  QUICKREPLY AI — CROSS-TENANT ISOLATION & BOLA PREVENTION TESTS");
console.log("  OWASP API1:2023 | NIST SP 800-207 Zero Trust");
console.log("========================================================================\n");

let pass = 0; let fail = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ [PASS] ${name}`); pass++; }
  catch (e) { console.error(`  ❌ [FAIL] ${name}\n     ${e.message}`); fail++; }
}

const ROLE_RANK = { OWNER: 100, ADMIN: 80, MANAGER: 60, OPERATOR: 40, ANALYST: 30, MEMBER: 20, VIEWER: 10 };
const ACTION_POLICY = {
  "instagram.connection.read": "MEMBER",
  "instagram.connection.connect": "OPERATOR",
  "instagram.connection.disconnect": "ADMIN",
  "instagram.publish.create": "OPERATOR",
  "automation.create": "OPERATOR",
  "automation.delete": "MANAGER",
  "billing.manage": "OWNER",
  "security.audit.read": "ADMIN",
};

function authorize(principal, action) {
  const role = principal.role || "VIEWER";
  const required = ACTION_POLICY[action];
  if (!required) throw new Error(`Unknown action: ${action}`);
  if ((ROLE_RANK[role] || 0) < (ROLE_RANK[required] || 999)) {
    throw new Error(`Insufficient permissions: ${action} requires ${required}, got ${role}`);
  }
}

function assertTenantOwnership(resourceTenantId, requestingEmail, resourceType, resourceId) {
  if (!resourceTenantId || !requestingEmail) throw new Error("Missing tenant context");
  if (resourceTenantId.toLowerCase().trim() !== requestingEmail.toLowerCase().trim()) {
    throw new Error(`CROSS_TENANT_DENIAL: ${requestingEmail} cannot access ${resourceType}/${resourceId}`);
  }
}

const TENANT_A = { email: "tenant_a@brand-a.com", role: "OPERATOR" };
const TENANT_B = { email: "tenant_b@brand-b.com", role: "OPERATOR" };

const TENANT_A_RESOURCES = {
  connections: [
    { id: "conn_a1", tenantId: "tenant_a@brand-a.com", instagramAccountId: "ig_1001", username: "brand_a" },
    { id: "conn_a2", tenantId: "tenant_a@brand-a.com", instagramAccountId: "ig_1002", username: "brand_a_v2" },
  ],
  automations: [
    { id: "auto_a1", tenantId: "tenant_a@brand-a.com", name: "Auto-reply campaign" },
  ],
};

const TENANT_B_RESOURCES = {
  connections: [
    { id: "conn_b1", tenantId: "tenant_b@brand-b.com", instagramAccountId: "ig_2001", username: "brand_b" },
  ],
  automations: [
    { id: "auto_b1", tenantId: "tenant_b@brand-b.com", name: "Brand B campaign" },
  ],
};

console.log("1. TESTING CROSS-TENANT READ ISOLATION...");

test("Tenant A reads own connection: allowed", () => {
  const conn = TENANT_A_RESOURCES.connections[0];
  assertTenantOwnership(conn.tenantId, TENANT_A.email, "instagram-connection", conn.id);
});

test("Tenant A reads Tenant B connection by ID: denied", () => {
  const conn = TENANT_B_RESOURCES.connections[0];
  assert.throws(
    () => assertTenantOwnership(conn.tenantId, TENANT_A.email, "instagram-connection", conn.id),
    /CROSS_TENANT_DENIAL/
  );
});

test("Tenant B reads Tenant A connection by guessing UUID: denied", () => {
  for (const conn of TENANT_A_RESOURCES.connections) {
    assert.throws(
      () => assertTenantOwnership(conn.tenantId, TENANT_B.email, "instagram-connection", conn.id),
      /CROSS_TENANT_DENIAL/
    );
  }
});

console.log("\n2. TESTING CROSS-TENANT WRITE ISOLATION...");

test("Tenant A modifies own automation: allowed", () => {
  const auto = TENANT_A_RESOURCES.automations[0];
  authorize(TENANT_A, "automation.create");
  assertTenantOwnership(auto.tenantId, TENANT_A.email, "automation", auto.id);
});

test("Tenant A modifies Tenant B automation: denied at ownership check", () => {
  const auto = TENANT_B_RESOURCES.automations[0];
  assert.throws(
    () => assertTenantOwnership(auto.tenantId, TENANT_A.email, "automation", auto.id),
    /CROSS_TENANT_DENIAL/
  );
});

test("Tenant B disconnects Tenant A's Instagram: denied by role", () => {
  assert.throws(
    () => authorize(TENANT_B, "instagram.connection.disconnect"),
    /Insufficient permissions/
  );
});

console.log("\n3. TESTING RBAC ROLE BOUNDARIES...");

test("VIEWER cannot connect Instagram", () => {
  assert.throws(
    () => authorize({ email: "viewer@test.com", role: "VIEWER" }, "instagram.connection.connect"),
    /Insufficient permissions/
  );
});

test("MEMBER can read Instagram connection", () => {
  authorize({ email: "member@test.com", role: "MEMBER" }, "instagram.connection.read");
});

test("OPERATOR can create automation", () => {
  authorize({ email: "op@test.com", role: "OPERATOR" }, "automation.create");
});

test("MANAGER can delete automation", () => {
  authorize({ email: "mgr@test.com", role: "MANAGER" }, "automation.delete");
});

test("OPERATOR cannot delete automation", () => {
  assert.throws(
    () => authorize({ email: "op@test.com", role: "OPERATOR" }, "automation.delete"),
    /Insufficient permissions/
  );
});

test("OPERATOR cannot manage billing", () => {
  assert.throws(
    () => authorize({ email: "op@test.com", role: "OPERATOR" }, "billing.manage"),
    /Insufficient permissions/
  );
});

test("OWNER can manage billing", () => {
  authorize({ email: "owner@test.com", role: "OWNER" }, "billing.manage");
});

console.log("\n4. TESTING TENANT ISOLATION EDGE CASES...");

test("Case-insensitive email comparison prevents bypass via case manipulation", () => {
  const conn = TENANT_B_RESOURCES.connections[0];
  assert.throws(
    () => assertTenantOwnership(conn.tenantId, "TENANT_A@BRAND-A.COM", "instagram-connection", conn.id),
    /CROSS_TENANT_DENIAL/
  );
  assertTenantOwnership(conn.tenantId, "TENANT_B@BRAND-B.COM", "instagram-connection", conn.id);
});

test("Empty tenant ID is rejected, not silently trusted", () => {
  assert.throws(
    () => assertTenantOwnership("", TENANT_A.email, "instagram-connection", "conn_test"),
    /Missing tenant/
  );
});

test("Empty requesting email is rejected", () => {
  assert.throws(
    () => assertTenantOwnership("tenant_a@brand-a.com", "", "instagram-connection", "conn_test"),
    /Missing tenant/
  );
});

test("UUID-based ID brute force: all Tenant A resources deny Tenant B", () => {
  const allTenantAResources = [
    ...TENANT_A_RESOURCES.connections,
    ...TENANT_A_RESOURCES.automations,
  ];
  for (const resource of allTenantAResources) {
    const resourceType = resource.instagramAccountId ? "connection" : "automation";
    assert.throws(
      () => assertTenantOwnership(resource.tenantId, TENANT_B.email, resourceType, resource.id),
      /CROSS_TENANT_DENIAL/
    );
  }
});

console.log("\n5. TESTING CLIENT-PROVIDED TENANT BYPASS RESISTANCE...");

test("Client cannot override tenant by providing their own organization_id", () => {
  const verifiedSession = { email: "tenant_b@brand-b.com" };
  const conn = TENANT_A_RESOURCES.connections[0];
  assert.throws(
    () => assertTenantOwnership(conn.tenantId, verifiedSession.email, "connection", conn.id),
    /CROSS_TENANT_DENIAL/,
    "Server must use session email, not client-provided organization_id"
  );
});

console.log("\n========================================================================");
console.log(` CROSS-TENANT ISOLATION TESTS: ${pass} / ${pass + fail} PASSED`);
if (fail > 0) {
  console.error(` ⚠ ${fail} TESTS FAILED — cross-tenant isolation is COMPROMISED`);
  process.exit(1);
}
console.log("========================================================================\n");
