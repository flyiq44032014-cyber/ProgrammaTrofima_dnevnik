import bcrypt from "bcrypt";
import { getPool, closePool } from "./pool";
import { syncFamilyParents, FAMILY_PARENT_PASSWORD } from "./syncFamilyParents";

async function main(): Promise<void> {
  const pool = getPool();
  const passwordHash = await bcrypt.hash(FAMILY_PARENT_PASSWORD, 10);
  const r = await syncFamilyParents(pool, { passwordHash });
  console.log(`[seedFamilyParents] families: ${r.families}`);
  console.log(`[seedFamilyParents] parent accounts rebuilt: ${r.parents}`);
  console.log(`[seedFamilyParents] children linked: ${r.linkedChildren}`);
  console.log(`[seedFamilyParents] default password: ${FAMILY_PARENT_PASSWORD}`);
  await closePool();
}

main().catch(async (e) => {
  console.error("[seedFamilyParents] error", e);
  await closePool();
  process.exit(1);
});
