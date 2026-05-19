/// SuiPort: Verifiable document custody for global trade.
/// A Container is a digital twin of a physical shipping container,
/// owned and transferred on-chain, with documents stored on Walrus.
module suiport::container;

use std::string::String;
use sui::event;

// ===== Status constants =====
// Public so the frontend can import them via the SDK.
public fun status_registered(): u8 { 0 }
public fun status_in_transit(): u8 { 1 }
public fun status_at_port(): u8 { 2 }
public fun status_cleared(): u8 { 3 }
public fun status_delivered(): u8 { 4 }

// ===== Core Object =====

/// A shipping container as a Sui object.
public struct Container has key, store {
    id: UID,
    container_id: String,
    origin: String,
    destination: String,
    status: u8,
    lat_micro: u64,
    lng_micro: u64,
    lat_negative: bool,
    lng_negative: bool,
    weight_kg: u64,
    document_blob_ids: vector<String>,
    creator: address,
    created_at_ms: u64,
}

// ===== Events =====

public struct ContainerMinted has copy, drop {
    container_object_id: ID,
    container_id: String,
    creator: address,
}

public struct StatusUpdated has copy, drop {
    container_object_id: ID,
    new_status: u8,
    updated_by: address,
}

public struct LocationUpdated has copy, drop {
    container_object_id: ID,
    lat_micro: u64,
    lng_micro: u64,
}

public struct DocumentAttached has copy, drop {
    container_object_id: ID,
    blob_id: String,
}

public struct ContainerTransferred has copy, drop {
    container_object_id: ID,
    from: address,
    to: address,
}

// ===== Public Functions =====

/// Mint a new container and return it. Composable: callers can chain operations
/// (e.g., mint + attach_document + transfer) in a single transaction block.
public fun mint(
    container_id: String,
    origin: String,
    destination: String,
    weight_kg: u64,
    ctx: &mut TxContext,
): Container {
    let sender = ctx.sender();
    let container = Container {
        id: object::new(ctx),
        container_id,
        origin,
        destination,
        status: 0,
        lat_micro: 0,
        lng_micro: 0,
        lat_negative: false,
        lng_negative: false,
        weight_kg,
        document_blob_ids: vector[],
        creator: sender,
        created_at_ms: tx_context::epoch_timestamp_ms(ctx),
    };

    event::emit(ContainerMinted {
        container_object_id: object::id(&container),
        container_id: container.container_id,
        creator: sender,
    });

    container
}

/// Convenience wrapper: mint and transfer to caller in one call.
/// Lint is suppressed because self-transfer is the whole point of this helper.
#[allow(lint(self_transfer))]
public fun mint_to_sender(
    container_id: String,
    origin: String,
    destination: String,
    weight_kg: u64,
    ctx: &mut TxContext,
) {
    let container = mint(container_id, origin, destination, weight_kg, ctx);
    transfer::public_transfer(container, ctx.sender());
}

/// Update the container's status. Only the owner can call this
/// (Move's type system enforces this — only the owner can pass `&mut Container`).
public fun update_status(container: &mut Container, new_status: u8, ctx: &TxContext) {
    container.status = new_status;
    event::emit(StatusUpdated {
        container_object_id: object::id(container),
        new_status,
        updated_by: ctx.sender(),
    });
}

/// Update the container's GPS location. Called by the off-chain GPS oracle.
public fun update_location(
    container: &mut Container,
    lat_micro: u64,
    lat_negative: bool,
    lng_micro: u64,
    lng_negative: bool,
) {
    container.lat_micro = lat_micro;
    container.lat_negative = lat_negative;
    container.lng_micro = lng_micro;
    container.lng_negative = lng_negative;

    event::emit(LocationUpdated {
        container_object_id: object::id(container),
        lat_micro,
        lng_micro,
    });
}

/// Attach a Walrus blob ID (a document) to the container.
public fun attach_document(container: &mut Container, blob_id: String) {
    container.document_blob_ids.push_back(blob_id);
    event::emit(DocumentAttached {
        container_object_id: object::id(container),
        blob_id,
    });
}

/// Transfer ownership of the container to a new address.
public fun transfer_container(
    container: Container,
    recipient: address,
    ctx: &TxContext,
) {
    event::emit(ContainerTransferred {
        container_object_id: object::id(&container),
        from: ctx.sender(),
        to: recipient,
    });
    transfer::public_transfer(container, recipient);
}

// ===== View Functions (read-only) =====

public fun status(c: &Container): u8 { c.status }
public fun container_id(c: &Container): String { c.container_id }
public fun creator(c: &Container): address { c.creator }
public fun document_count(c: &Container): u64 { c.document_blob_ids.length() }