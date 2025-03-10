import { ponder } from "ponder:registry";
import { domain, resolver, registry, subregistryUpdateEvent, resolverUpdateEvent, newSubnameEvent, transferSingleEvent } from "ponder:schema";
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

async function updateDomainLabel(context: any, domainId: string, label: string, tokenId: string, timestamp: bigint, event: any, source: string) {
    const domainRecord = await context.db.find(domain, { id: domainId });
    if (!domainRecord) {
        console.log("Domain not found:", domainId);
        return;
    }
    
    console.log("Updating domain label:", domainRecord);
    
    // Update registry database if exists
    const labelHash = BigInt(tokenId) & LABEL_HASH_MASK;
    const registryRecord = await context.db.sql.query
        .registry
        .findFirst({where: eq(registry.labelHash, labelHash.toString())});

    if (registryRecord) {
        console.log("Registry record found:", registryRecord);
        await context.db
            .update(registry, {id:registryRecord.id})
            .set({...registryRecord, label: label});
    }
    let name = label;
    if (source != "RootRegistry") {
        let currentRegistryId = registryRecord.id;
        let currentName = name;

        while (true) {
            const parentRegistryRecord = await context.db.sql.query
                .registry
                .findFirst({where: eq(registry.subregistryId, currentRegistryId)});

            if (!parentRegistryRecord) {
                break; // We've reached the top level
            }

            console.log("Parent registry record found:", parentRegistryRecord);
            let parentDomainRecord = await context.db.sql.query.domain.findFirst({
                where: eq(domain.registry, parentRegistryRecord.id)
            });

            if (!parentDomainRecord) {
                break;
            }

            console.log("Parent domain record found:", parentDomainRecord);
            
            if (parentDomainRecord.isTld) {
                currentName = currentName + "." + parentDomainRecord.label;
                console.log("Reached TLD. Final name:", currentName);
                break;
            }

            currentName = currentName + "." + parentDomainRecord.label;
            currentRegistryId = parentRegistryRecord.id;
            console.log("Current name:", currentName);
        }

        name = currentName;
    }
    // Update the domain record
    const nameArray = domainRecord.name ? [...domainRecord.name, name] : [name];
    const newDomainRecord = {
        ...domainRecord,
        label: label,
        name: nameArray,
        labelHash: tokenId,
        isTld: source === "RootRegistry" ? true : false,
        updatedAt: timestamp
    };
    
    await context.db
        .update(domain, {id: domainId})
        .set(newDomainRecord);

    // Store the event data
    const eventId = createEventID(event);
    await context.db.insert(newSubnameEvent).values({
        id: eventId,
        registryId: domainRecord.registry,
        label: label,
        labelHash: tokenId,
        source: source,
        createdAt: timestamp,
        updatedAt: timestamp
    });
    
    console.log("Domain updated:", domainId);
}

// Registry Datastore handlers
ponder.on("RegistryDatastore:SubregistryUpdate", async ({ event, context }) => {
    console.log("RegistryDatastore:SubregistryUpdate", event.args);
    const timestamp = event.block.timestamp
    await context.db.insert(registry).values({
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
    const record2 = await context.db.find(registry, {id: event.args.registry.toString()});
    if (record2) {
        console.log("RegistryDatastore:ResolverUpdate", "Record found", record2);
        await context.db
        .update(registry, {id:record2.id})
        .set({...record2, resolver: event.args.resolver.toString()})

        const record3 = await context.db.find(resolver, {id: event.args.resolver.toString()});
        if (!record3) {
            console.log("RegistryDatastore:ResolverUpdate", "Creating new resolver record");
            await context.db.insert(resolver).values({
                id: event.args.resolver.toString(),
                createdAt: timestamp,
                updatedAt: timestamp
            });
        }
    } else {
        console.log("RegistryDatastore:ResolverUpdate", "No record found");
    }
    
    // Store the event data
    const eventId = createEventID(event);
    await context.db.insert(resolverUpdateEvent).values({
      id: eventId,
      registryId: event.args.registry.toString(),
      labelHash: event.args.labelHash.toString(),
      resolverId: event.args.resolver.toString(),
      flags: event.args.flags,
      createdAt: timestamp,
      updatedAt: timestamp
    });
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
    
    // Store the event data
    const eventId = createEventID(event);
    await context.db.insert(transferSingleEvent).values({
      id: eventId,
      registryId: event.transaction.to?.toString(),
      tokenId: event.args.id.toString(),
      from: event.args.from.toString(),
      to: event.args.to.toString(),
      value: event.args.value,
      source: "EthRegistry",
      createdAt: timestamp,
      updatedAt: timestamp
    });
});

ponder.on("EthRegistry:NewSubname", async ({ event, context }) => {
    console.log("EthRegistry:NewSubname", event.transaction.to);
    const tokenId = generateTokenId(event.args.label);
    const registryId = event.transaction.to?.toString();
    const domainId = createDomainId(registryId, tokenId);
    
    await updateDomainLabel(context, domainId, event.args.label, tokenId, event.block.timestamp, event, "EthRegistry");
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
    
    // Store the event data
    const eventId = createEventID(event);
    await context.db.insert(transferSingleEvent).values({
      id: eventId,
      registryId: registryId,
      tokenId: tokenId,
      from: event.args.from.toString(),
      to: event.args.to.toString(),
      value: event.args.value,
      source: "RootRegistry",
      createdAt: timestamp,
      updatedAt: timestamp
    });
});

ponder.on("RootRegistry:NewSubname", async ({ event, context }) => {
    console.log("RootRegistry:NewSubname", event.transaction.to);
    const tokenId = generateTokenId(event.args.label);
    const registryId = event.transaction.to?.toString();
    const domainId = createDomainId(registryId, tokenId);
    
    await updateDomainLabel(context, domainId, event.args.label, tokenId, event.block.timestamp, event, "RootRegistry");
});

// Resolver handlers
ponder.on("OwnedResolver:AddressChanged", async ({ event, context }) => {
    const timestamp = event.block.timestamp
    const resolverId = event.transaction.to?.toString()
    console.log("OwnedResolver:AddressChanged", event.args, resolverId);
    const record = await context.db.find(resolver, {id: resolverId});
    if (record) {
        console.log("OwnedResolver:AddressChanged", "Record found", record);
        await context.db
            .update(resolver, {id:record.id})
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
