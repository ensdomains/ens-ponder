import { onchainTable, relations } from "ponder";

export const domain = onchainTable("domain", (t) => ({
  id: t.text().primaryKey(),
  label: t.text(),
  labelHash: t.text(),
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
  subregistryId: t.text(),
  resolver: t.text(),
  flags: t.bigint(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const registryDatabaseRelations = relations(registryDatabase, ({ one }) => ({
  subregistry: one(registryDatabase, {
    fields: [registryDatabase.subregistryId],
    references: [registryDatabase.id],
  }),
}));

export const ownedResolver = onchainTable("ownedResolver", (t) => ({
  id: t.text().primaryKey(),
  address: t.text(),
  node: t.text(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const registryDatabaseResolverRelations = relations(registryDatabase, ({ one }) => ({
  resolver: one(ownedResolver, {
    fields: [registryDatabase.resolver],
    references: [ownedResolver.id],
  }),
}));
