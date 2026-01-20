-- Migration script to update shipment status enum values
-- From: DRAFT, CONFIRMED, IN_TRANSIT, DELIVERED, CANCELLED
-- To: BOZZA, IN_CONSEGNA, CONSEGNATA

UPDATE shipments SET status = 'BOZZA' WHERE status = 'DRAFT';
UPDATE shipments SET status = 'IN_CONSEGNA' WHERE status = 'CONFIRMED';
UPDATE shipments SET status = 'IN_CONSEGNA' WHERE status = 'IN_TRANSIT';
UPDATE shipments SET status = 'CONSEGNATA' WHERE status = 'DELIVERED';
UPDATE shipments SET status = 'BOZZA' WHERE status = 'CANCELLED';
