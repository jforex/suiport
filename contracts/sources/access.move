/// SuiPort access control for Seal-encrypted documents.
module suiport::access;

use sui::event;

const ENotOwner: u64 = 0;
const ENoAccess: u64 = 1;
const EAlreadyMember: u64 = 2;
const ENotMember: u64 = 3;

public struct DocumentRegistry has key {
    id: UID,
    container_id: ID,
    admin: address,
    allowlist: vector<address>,
}

public struct RegistryCreated has copy, drop {
    registry_id: ID,
    container_id: ID,
    admin: address,
}

public struct MemberAdded has copy, drop {
    registry_id: ID,
    member: address,
}

public struct MemberRemoved has copy, drop {
    registry_id: ID,
    member: address,
}

public entry fun create_registry(container_id: ID, ctx: &mut TxContext) {
    let admin = ctx.sender();
    let registry = DocumentRegistry {
        id: object::new(ctx),
        container_id,
        admin,
        allowlist: vector[admin],
    };
    event::emit(RegistryCreated {
        registry_id: object::id(&registry),
        container_id,
        admin,
    });
    transfer::share_object(registry);
}

public entry fun add_member(
    registry: &mut DocumentRegistry,
    member: address,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == registry.admin, ENotOwner);
    assert!(!registry.allowlist.contains(&member), EAlreadyMember);
    registry.allowlist.push_back(member);
    event::emit(MemberAdded {
        registry_id: object::id(registry),
        member,
    });
}

public entry fun remove_member(
    registry: &mut DocumentRegistry,
    member: address,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == registry.admin, ENotOwner);
    let (found, idx) = registry.allowlist.index_of(&member);
    assert!(found, ENotMember);
    registry.allowlist.remove(idx);
    event::emit(MemberRemoved {
        registry_id: object::id(registry),
        member,
    });
}

entry fun seal_approve(
    id: vector<u8>,
    registry: &DocumentRegistry,
    ctx: &TxContext,
) {
    let registry_id_bytes = object::id(registry).to_bytes();
    assert!(is_prefix(&registry_id_bytes, &id), ENoAccess);
    assert!(registry.allowlist.contains(&ctx.sender()), ENoAccess);
}

fun is_prefix(prefix: &vector<u8>, full: &vector<u8>): bool {
    let plen = prefix.length();
    if (plen > full.length()) return false;
    let mut i = 0;
    while (i < plen) {
        if (prefix[i] != full[i]) return false;
        i = i + 1;
    };
    true
}

public fun allowlist(r: &DocumentRegistry): vector<address> { r.allowlist }
public fun admin(r: &DocumentRegistry): address { r.admin }
public fun is_member(r: &DocumentRegistry, who: address): bool {
    r.allowlist.contains(&who)
}
