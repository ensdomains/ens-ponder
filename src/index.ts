import { ponder } from "ponder:registry";
import { domain, ownedResolver, registryDatabase, subregistryUpdateEvent } from "ponder:schema";
import { ethers, id } from "ethers";
import { db } from "ponder:api";
import { eq } from "ponder";

// Constants
const LABEL_HASH_MASK = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000n;

// Utility functions
function createEventID(event: any): string {
    return event.block.number
      .toString()
      .concat("-")
      .concat(event.log.logIndex);
  }
function generateTokenId(label: string): string {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(label));
    
    // Convert the hash to BigInt and perform the bitwise operation
    const hashBigInt = BigInt(hash);
    const mask = BigInt(0x7);
    const tokenId = hashBigInt & ~mask; // Equivalent to & ~0x7        
    console.log("generateTokenId", label, hash, tokenId);
    return tokenId.toString();
}

function createDomainId(registryId: string | undefined, tokenId: string): string {
    return `${registryId}-${tokenId}`;
}

async function updateDomainLabel(context: any, domainId: string, label: string, tokenId: string, timestamp: bigint) {
    const record = await context.db.find(domain, { id: domainId });
    if (!record) {
        console.log("Domain not found:", domainId);
        return;
    }
    
    console.log("Updating domain label:", record);
    
    // Update registry database if exists
    const labelHash = BigInt(tokenId) & LABEL_HASH_MASK;
    const record2 = await context.db.sql.query
        .registryDatabase
        .findFirst({where: eq(registryDatabase.labelHash, labelHash.toString())});

    if (record2) {
        console.log("Registry record found:", record2);
        await context.db
            .update(registryDatabase, {id:record2.id})
            .set({...record2, label: label});
    }

    // Update the domain record
    const newRecord = {
        ...record,
        label: label,
        labelHash: tokenId,
        updatedAt: timestamp
    };
    
    await context.db
        .update(domain, {id: domainId})
        .set(newRecord);
    
    console.log("Domain updated:", domainId);
}

// Registry Datastore handlers
ponder.on("RegistryDatastore:SubregistryUpdate", async ({ event, context }) => {
    console.log("RegistryDatastore:SubregistryUpdate", event.args);
    const timestamp = event.block.timestamp
    await context.db.insert(registryDatabase).values({
      id: event.args.registry.toString(),
      labelHash: event.args.labelHash.toString(),
      subregistryId: event.args.subregistry,
      flags: event.args.flags,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    console.log(event);
    const eventId = createEventID(event);
    await context.db.insert(subregistryUpdateEvent).values({
      id: eventId,
      registryId: event.args.registry.toString(),
      labelHash: event.args.labelHash.toString(),
      subregistryId: event.args.subregistry,
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
        if (!record3) {
            console.log("RegistryDatastore:ResolverUpdate", "Creating new resolver record");
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

// ETH Registry handlers
ponder.on("EthRegistry:TransferSingle", async ({ event, context }) => {
    console.log("EthRegistry:TransferSingle", event.transaction.to);
    const timestamp = event.block.timestamp
    const labelHash = event.args.id.toString()
    const domainId = createDomainId(event.transaction.to?.toString(), labelHash);
    
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
    const registryId = event.transaction.to?.toString();
    const domainId = createDomainId(registryId, tokenId);
    
    await updateDomainLabel(context, domainId, event.args.label, tokenId, event.block.timestamp);
});

// Root Registry handlers
ponder.on("RootRegistry:TransferSingle", async ({ event, context }) => {
    const timestamp = event.block.timestamp;
    const tokenId = event.args.id.toString()
    const registryId = event.transaction.to?.toString()
    const domainId = createDomainId(registryId, tokenId);
    
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
    const registryId = event.transaction.to?.toString();
    const domainId = createDomainId(registryId, tokenId);
    
    await updateDomainLabel(context, domainId, event.args.label, tokenId, event.block.timestamp);
});

// Resolver handlers
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
