#[test_only]
module suiport::container_tests;

use std::string;
use sui::test_scenario as ts;
use suiport::container::{
    Self,
    Container,
};

const EXPORTER: address = @0xE1;
const CARRIER: address = @0xC1;

#[test]
fun test_mint_and_status_lifecycle() {
    let mut scenario = ts::begin(EXPORTER);

    // 1. Exporter mints a container
    {
        container::mint_to_sender(
            string::utf8(b"MSKU1234567"),
            string::utf8(b"Lagos"),
            string::utf8(b"Rotterdam"),
            25000,
            scenario.ctx(),
        );
    };

    // 2. Verify the container exists and starts as REGISTERED (0)
    scenario.next_tx(EXPORTER);
    {
        let c = scenario.take_from_sender<Container>();
        assert!(container::status(&c) == container::status_registered(), 100);
        assert!(container::container_id(&c) == string::utf8(b"MSKU1234567"), 101);
        assert!(container::creator(&c) == EXPORTER, 102);
        assert!(container::document_count(&c) == 0, 103);
        scenario.return_to_sender(c);
    };

    // 3. Exporter updates status to IN_TRANSIT, attaches a document, transfers to carrier
    scenario.next_tx(EXPORTER);
    {
        let mut c = scenario.take_from_sender<Container>();
        container::update_status(&mut c, container::status_in_transit(), scenario.ctx());
        container::attach_document(&mut c, string::utf8(b"walrus_blob_id_abc123"));
        container::transfer_container(c, CARRIER, scenario.ctx());
    };

    // 4. Carrier now owns it. Verify state carried over.
    scenario.next_tx(CARRIER);
    {
        let c = scenario.take_from_sender<Container>();
        assert!(container::status(&c) == container::status_in_transit(), 200);
        assert!(container::document_count(&c) == 1, 201);
        // Creator should still be the original minter, not the new owner.
        assert!(container::creator(&c) == EXPORTER, 202);
        scenario.return_to_sender(c);
    };

    // 5. Carrier updates location (simulating GPS oracle)
    scenario.next_tx(CARRIER);
    {
        let mut c = scenario.take_from_sender<Container>();
        container::update_location(&mut c, 4500000, false, 3200000, false);
        scenario.return_to_sender(c);
    };

    scenario.end();
}