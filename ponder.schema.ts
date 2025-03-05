import { onchainTable, relations } from "ponder";

export const domain = onchainTable("domain", (t) => ({
  id: t.text().primaryKey(),
  label: t.text(),
  name: t.text().array(), // Will store serialized array as JSON string
  labelHash: t.text(),
  owner: t.text(),
  registry: t.text(),
  isTld: t.boolean(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const domainRelations = relations(domain, ({ one }) => ({
  registry: one(registry, {
    fields: [domain.registry],
    references: [registry.id],
  }),
}));

export const registry = onchainTable("registry", (t) => ({
  id: t.text().primaryKey(),
  labelHash: t.text(),
  label: t.text(),
  subregistryId: t.text(),
  resolver: t.text(),
  flags: t.bigint(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const subregistryUpdateEvent = onchainTable("subregistryUpdateEvent", (t) => ({
  id: t.text().primaryKey(),
  registryId: t.text(),
  labelHash: t.text(),
  subregistryId: t.text(),
  flags: t.bigint(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const resolverUpdateEvent = onchainTable("resolverUpdateEvent", (t) => ({
  id: t.text().primaryKey(),
  registryId: t.text(),
  labelHash: t.text(),
  resolverId: t.text(),
  flags: t.bigint(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const newSubnameEvent = onchainTable("newSubnameEvent", (t) => ({
  id: t.text().primaryKey(),
  registryId: t.text(),
  label: t.text(),
  labelHash: t.text(),
  source: t.text(), // "EthRegistry" or "RootRegistry"
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const registryRelations = relations(registry, ({ one }) => ({
  subregistry: one(registry, {
    fields: [registry.subregistryId],
    references: [registry.id],
  }),
}));

export const resolver = onchainTable("resolver", (t) => ({
  id: t.text().primaryKey(),
  address: t.text(),
  node: t.text(),
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));

export const registryResolverRelations = relations(registry, ({ one }) => ({
  resolver: one(resolver, {
    fields: [registry.resolver],
    references: [resolver.id],
  }),
}));

export const transferSingleEvent = onchainTable("transferSingleEvent", (t) => ({
  id: t.text().primaryKey(),
  registryId: t.text(),
  tokenId: t.text(),
  from: t.text(),
  to: t.text(),
  value: t.bigint(),
  source: t.text(), // "EthRegistry" or "RootRegistry"
  createdAt: t.bigint("createdAt").notNull(),
  updatedAt: t.bigint("updatedAt").notNull(),
}));
