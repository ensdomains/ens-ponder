import { ponder } from "ponder:registry";
import { domain, ownedResolver, registryDatabase } from "ponder:schema";
import { ethers, id } from "ethers";
import { db } from "ponder:api";
import { eq } from "ponder";
function generateTokenId(label: string): string {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(label));
    
    // Convert the hash to BigInt and perform the bitwise operation
    const hashBigInt = BigInt(hash);
    const mask = BigInt(0x7);
    const tokenId = hashBigInt & ~mask; // Equivalent to & ~0x7        
    console.log("generateTokenId", label, hash, tokenId);
    return tokenId.toString();
}

ponder.on("RegistryDatastore:SubregistryUpdate", async ({ event, context }) => {
    console.log("RegistryDatastore:SubregistryUpdate", event.args);
    const timestamp = event.block.timestamp
    await context.db.insert(registryDatabase).values({
      id: event.args.registry.toString(),
      labelHash: event.args.labelHash.toString(),
      subregistry: event.args.subregistry,
      flags: event.args.flags,
      createdAt: timestamp,
      updatedAt: timestamp
    });
});

ponder.on("RegistryDatastore:ResolverUpdate", async ({ event, context }) => {
    console.log("RegistryDatastore:ResolverUpdate", event.args);
    const timestamp = event.block.timestamp
    const record2 = await context.db.find(registryDatabase, {id: event.args.registry.toString()});
    if (record2) {
        console.log("RegistryDatastore:ResolverUpdate", "Record found", record2);
        await context.db
        .update(registryDatabase, {id:record2.id})
        .set({...record2, resolver: event.args.resolver.toString()})

        const record3 = await context.db.find(ownedResolver, {id: event.args.resolver.toString()});
        if (record3) {
            console.log("RegistryDatastore:ResolverUpdate", "Record found", record3);
        } else {
            console.log("RegistryDatastore:ResolverUpdate", "No record found, creating new record");
            await context.db.insert(ownedResolver).values({
                id: event.args.resolver.toString(),
                createdAt: timestamp,
                updatedAt: timestamp
            });
        }

    } else {
        console.log("RegistryDatastore:ResolverUpdate", "No record found");
    }
});

ponder.on("EthRegistry:TransferSingle", async ({ event, context }) => {
    console.log("EthRegistry:TransferSingle", event.transaction.to);
    const timestamp = event.block.timestamp
    const labelHash = event.args.id.toString()
    const domainId = event.transaction.to + '-' + labelHash
    await context.db.insert(domain).values({
      id: domainId,
      labelHash: labelHash,
      owner: event.args.to.toString(),
      registry: event.transaction.to?.toString(),
      createdAt: timestamp,
      updatedAt: timestamp
    });
});

ponder.on("EthRegistry:NewSubname", async ({ event, context }) => {
    console.log("EthRegistry:NewSubname", event.transaction.to);
    const tokenId = generateTokenId(event.args.label);
    const registryId = event.transaction.to?.toString()
    
    const LABEL_HASH_MASK = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000n;
    const domainId = registryId + '-' + tokenId
    const labelHash = BigInt(tokenId) & LABEL_HASH_MASK;

    console.log("EthRegistry:NewSubname2", tokenId, labelHash);
    const record = await context.db.find(domain, { id: domainId });
    if (record) {
        console.log("EthRegistry:NewSubname3", record);

        const record2 = await context.db.sql.query
            .registryDatabase
            .findFirst({where: eq(registryDatabase.labelHash, labelHash.toString())});

        if (record2) {
            console.log("RegistryDatastore:SubregistryUpdate", "Record found", record2);
            await context.db
                .update(registryDatabase, {id:record2.id})
                .set({...record2, label: event.args.label})
        } else {
            console.log("RegistryDatastore:SubregistryUpdate", "No record found");
        }

        // Update the record with new data
        const newRecord = {
            ...record,
            label: event.args.label,
            labelHash: tokenId,
            updatedAt: event.block.timestamp
        };
        console.log("EthRegistry:NewSubname5", newRecord);
        await context.db
            .update(domain, {id:domainId})
            .set(newRecord)

        console.log("EthRegistry:NewSubname5", "Updated record");
    } else {
        console.log("EthRegistry:NewSubname4", "No record found");
    }
});

ponder.on("RootRegistry:TransferSingle", async ({ event, context }) => {
    const timestamp = event.block.timestamp;
    const tokenId = event.args.id.toString()
    const registryId = event.transaction.to?.toString()
    const domainId = registryId + '-' + tokenId
    const values = {
        id: domainId,
        labelHash: tokenId,
        owner: event.args.to.toString(),
        registry: registryId,
        createdAt: timestamp,
        updatedAt: timestamp
    }
    console.log("RootRegistry:TransferSingle", values);
    await context.db.insert(domain).values(values);
});

ponder.on("RootRegistry:NewSubname", async ({ event, context }) => {
    console.log("RootRegistry:NewSubname", event.transaction.to);
    const tokenId = generateTokenId(event.args.label);
    const registryId = event.transaction.to?.toString()
    const domainId = registryId + '-' + tokenId
    const LABEL_HASH_MASK = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000n;
    const labelHash = BigInt(tokenId) & LABEL_HASH_MASK;
    console.log("RootRegistry:NewSubname2", tokenId, labelHash);
    const record = await context.db.find(domain, { id: domainId });
    if (record) {
        console.log("RootRegistry:NewSubname3", record);

        const record2 = await context.db.sql.query
            .registryDatabase
            .findFirst({where: eq(registryDatabase.labelHash, labelHash.toString())});

        if (record2) {
            console.log("RegistryDatastore:SubregistryUpdate", "Record found", record2);
            await context.db
                .update(registryDatabase, {id:record2.id})
                .set({...record2, label: event.args.label})
        } else {
            console.log("RegistryDatastore:SubregistryUpdate", "No record found");
        }

        // Update the record with new data
        const newRecord = {
            ...record,
            label: event.args.label,
            labelHash: tokenId,
            updatedAt: event.block.timestamp
        };
        console.log("RootRegistry:NewSubname5", newRecord);
        await context.db
            .update(domain, {id:domainId})
            .set(newRecord)

        console.log("RootRegistry:NewSubname5", "Updated record");
    } else {
        console.log("RootRegistry:NewSubname4", "No record found");
    }
});

ponder.on("OwnedResolver:AddressChanged", async ({ event, context }) => {
    const timestamp = event.block.timestamp
    const resolverId = event.transaction.to?.toString()
    console.log("OwnedResolver:AddressChanged", event.args, resolverId);
    const record = await context.db.find(ownedResolver, {id: resolverId});
    if (record) {
        console.log("OwnedResolver:AddressChanged", "Record found", record);
        await context.db
            .update(ownedResolver, {id:record.id})
            .set({
                ...record,
                address: event.args.newAddress.toString(),
                updatedAt: timestamp,
                node: event.args.node.toString()
            })
    } else {
        console.log("OwnedResolver:AddressChanged", "No record found");
    }
});
