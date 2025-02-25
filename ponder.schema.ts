import { onchainTable, relations } from "ponder";

export const domain = onchainTable("domain", (t) => ({
  id: t.text().primaryKey(),
  label: t.text(),
  owner: t.text(),
  registry: t.text(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const domainRelations = relations(domain, ({ one }) => ({
  registry: one(registryDatabase, {
    fields: [domain.registry],
    references: [registryDatabase.id],
  }),
}));

export const registryDatabase = onchainTable("registryDatabase", (t) => ({
  id: t.text().primaryKey(),
  labelHash: t.text(),
  label: t.text(),
  subregistry: t.text(),
  flags: t.bigint(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const registryDatabaseRelations = relations(registryDatabase, ({ one }) => ({
  registry: one(registryDatabase, {
    fields: [registryDatabase.subregistry],
    references: [registryDatabase.id],
  }),
}));
