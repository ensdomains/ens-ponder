import { ponder } from "ponder:registry";
import { domain, registryDatabase, rootRegistry } from "ponder:schema";
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

ponder.on("EthRegistry:TransferSingle", async ({ event, context }) => {
    console.log("EthRegistry:TransferSingle", event.transaction.to);
    const timestamp = event.block.timestamp
    await context.db.insert(domain).values({
      id: event.args.id.toString(),
      owner: event.args.to.toString(),
      registry: event.transaction.to?.toString(),
      createdAt: timestamp,
      updatedAt: timestamp
    });
});

ponder.on("EthRegistry:NewSubname", async ({ event, context }) => {
    console.log("EthRegistry:NewSubname", event.transaction.to);
    const tokenId = generateTokenId(event.args.label);
    
    const LABEL_HASH_MASK = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000n;
    const labelHash = BigInt(tokenId) & LABEL_HASH_MASK;
    console.log("EthRegistry:NewSubname2", tokenId, labelHash);
    const record = await context.db.find(domain, { id: tokenId });
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
            updatedAt: event.block.timestamp
        };
        console.log("EthRegistry:NewSubname5", newRecord);
        await context.db
            .update(domain, {id:tokenId})
            .set(newRecord)

        console.log("EthRegistry:NewSubname5", "Updated record");
    } else {
        console.log("EthRegistry:NewSubname4", "No record found");
    }
});

ponder.on("RootRegistry:TransferSingle", async ({ event, context }) => {
    
    const timestamp = event.block.timestamp;
    const values = {
        id: event.args.id.toString(),
        owner: event.args.to.toString(),
        registry: event.transaction.to?.toString(),
        createdAt: timestamp,
        updatedAt: timestamp
      }
      console.log("RootRegistry:TransferSingle", values);
    await context.db.insert(domain).values(values);
});

ponder.on("RootRegistry:NewSubname", async ({ event, context }) => {
    console.log("RootRegistry:NewSubname", event.transaction.to);
    const tokenId = generateTokenId(event.args.label);
    
    const LABEL_HASH_MASK = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000n;
    const labelHash = BigInt(tokenId) & LABEL_HASH_MASK;
    console.log("RootRegistry:NewSubname2", tokenId, labelHash);
    const record = await context.db.find(domain, { id: tokenId });
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
            updatedAt: event.block.timestamp
        };
        console.log("RootRegistry:NewSubname5", newRecord);
        await context.db
            .update(domain, {id:tokenId})
            .set(newRecord)

        console.log("RootRegistry:NewSubname5", "Updated record");
    } else {
        console.log("RootRegistry:NewSubname4", "No record found");
    }
});