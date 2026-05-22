/// SuiPort access control for Seal-encrypted documents.
///
/// Role model (real-world):
///   - Carrier (shipping line) issues the BoL to the shipper.
///   - Shipper holds the title and engages C&F agents. The shipper is the
///     `admin` of this registry and its first active member.
///   - C&F agents are engaged members who clear the container at port.
///
/// Engagement lifecycle:
///   - Shipper engages an agent (admin-gated).
///   - An engaged member ends their OWN engagement via complete_task or
///     cancel_engagement. The shipper CANNOT force-remove an active agent
///     mid-task (protects the agent against revocation while on the job).
///
/// Note: deactivation prevents FUTURE decryption only. It cannot claw back
/// plaintext an agent already decrypted — true of all access control.
module suiport::access;

use sui::event;

// ===== Errors =====
const ENotAdmin: u64 = 0;
const ENoAccess: u64 = 1;
const EAlreadyMember: u64 = 2;
const ENotMember: u64 = 3;

// ===== Objects =====

/// One engagement entry in a registry.
public struct Member has store, drop {
    addr: address,
    active: bool,
}

/// A per-container registry of engagements allowed to decrypt its documents.
/// Shared so Seal key servers can read it during seal_approve evaluation.
public struct DocumentRegistry has key {
    id: UID,
    container_id: ID,
    /// The shipper who holds the title and manages engagements.
    admin: address,
    members: vector<Member>,
}

// ===== Events =====

public struct RegistryCreated has copy, drop {
    registry_id: ID,
    container_id: ID,
    admin: address,
}

public struct AgentEngaged has copy, drop {
    registry_id: ID,
    agent: address,
}

public struct EngagementEnded has copy, drop {
    registry_id: ID,
    agent: address,
    cancelled: bool,
}

// ===== Helpers =====

fun find_member(members: &vector<Member>, who: address): (bool, u64) {
    let n = members.length();
    let mut i = 0;
    while (i < n) {
        if (members[i].addr == who) return (true, i);
        i = i + 1;
    };
    (false, 0)
}

fun is_active_member(registry: &DocumentRegistry, who: address): bool {
    let (found, idx) = find_member(&registry.members, who);
    if (!found) return false;
    registry.members[idx].active
}

// ===== Create =====

/// Create a registry for a container. Caller (shipper) becomes admin and
/// first active member.
public entry fun create_registry(container_id: ID, ctx: &mut TxContext) {
    let admin = ctx.sender();
    let mut members = vector<Member>[];
    members.push_back(Member { addr: admin, active: true });

    let registry = DocumentRegistry {
        id: object::new(ctx),
        container_id,
        admin,
        members,
    };

    event::emit(RegistryCreated {
        registry_id: object::id(&registry),
        container_id,
        admin,
    });

    transfer::share_object(registry);
}

// ===== Engagement management =====

/// Shipper engages a C&F agent. Admin-gated.
public entry fun engage_agent(
    registry: &mut DocumentRegistry,
    agent: address,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == registry.admin, ENotAdmin);
    let (found, idx) = find_member(&registry.members, agent);
    if (found) {
        // Re-engage a previously inactive agent.
        assert!(!registry.members[idx].active, EAlreadyMember);
        registry.members[idx].active = true;
    } else {
        registry.members.push_back(Member { addr: agent, active: true });
    };
    event::emit(AgentEngaged {
        registry_id: object::id(registry),
        agent,
    });
}

/// Caller marks their OWN engagement complete (task done). Deactivates self.
public entry fun complete_task(registry: &mut DocumentRegistry, ctx: &TxContext) {
    end_own_engagement(registry, ctx.sender(), false);
}

/// Caller withdraws their OWN engagement. Deactivates self.
public entry fun cancel_engagement(registry: &mut DocumentRegistry, ctx: &TxContext) {
    end_own_engagement(registry, ctx.sender(), true);
}

fun end_own_engagement(
    registry: &mut DocumentRegistry,
    caller: address,
    cancelled: bool,
) {
    let (found, idx) = find_member(&registry.members, caller);
    assert!(found, ENotMember);
    assert!(registry.members[idx].active, ENotMember);
    registry.members[idx].active = false;
    event::emit(EngagementEnded {
        registry_id: object::id(registry),
        agent: caller,
        cancelled,
    });
}

// ===== Seal access policy =====

/// Seal calls this during decryption. `id` must be prefixed by this registry's
/// object ID, and ctx.sender() (the SessionKey signer) must be an ACTIVE member.
entry fun seal_approve(
    id: vector<u8>,
    registry: &DocumentRegistry,
    ctx: &TxContext,
) {
    let registry_id_bytes = object::id(registry).to_bytes();
    assert!(is_prefix(&registry_id_bytes, &id), ENoAccess);
    assert!(is_active_member(registry, ctx.sender()), ENoAccess);
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

// ===== Views =====

public fun admin(r: &DocumentRegistry): address { r.admin }

public fun active_members(r: &DocumentRegistry): vector<address> {
    let mut out = vector<address>[];
    let n = r.members.length();
    let mut i = 0;
    while (i < n) {
        if (r.members[i].active) out.push_back(r.members[i].addr);
        i = i + 1;
    };
    out
}

public fun is_member(r: &DocumentRegistry, who: address): bool {
    is_active_member(r, who)
}
