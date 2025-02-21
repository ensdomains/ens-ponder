import { onchainTable } from "ponder";

export const domain = onchainTable("domain", (t) => ({
  id: t.text().primaryKey(),
  label: t.text(),
  owner: t.text(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

