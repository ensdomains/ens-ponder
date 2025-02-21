import { ponder } from "ponder:registry";
import { domain } from "ponder:schema";
import { ethers, id } from "ethers";
import { db } from "ponder:api";
function generateTokenId(label: string): string {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(label));
    
    // Convert the hash to BigInt and perform the bitwise operation
    const hashBigInt = BigInt(hash);
    const mask = BigInt(0x7);
    const tokenId = hashBigInt & ~mask; // Equivalent to & ~0x7        
    return tokenId.toString();
}

ponder.on("EthRegistry:TransferSingle", async ({ event, context }) => {

    console.log("EthRegistry:TransferSingle", event.transaction.hash, event.args);
    const timestamp = event.block.timestamp
    await context.db.insert(domain).values({
      id: event.args.id.toString(),
      owner: event.args.to.toString(),
      createdAt: timestamp,
      updatedAt: timestamp
    });
});

ponder.on("EthRegistry:NewSubname", async ({ event, context }) => {

    console.log("EthRegistry:NewSubname", event.transaction.hash, event.args);
    const tokenId =  generateTokenId(event.args.label, 0);
    console.log("EthRegistry:NewSubname2", tokenId);
    const record = await context.db.find(domain, { id: tokenId });
    if (record) {
        console.log("EthRegistry:NewSubname3", record);
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