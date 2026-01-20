-- Migration script to integrate returns into shipments
-- Date: 2026-01-20
-- Description: Remove separate Return entity and add return fields to shipments

BEGIN;

-- Step 1: Add new columns to shipment_items table
ALTER TABLE shipment_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'SHIPMENT' NOT NULL;
ALTER TABLE shipment_items ADD COLUMN IF NOT EXISTS return_reason VARCHAR(50);

-- Step 2: Add new columns to shipments table for return information
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS return_date DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS return_notes TEXT;

-- Step 3: Migrate existing return data to shipment_items
-- For each return item, create a corresponding shipment item with itemType = RETURN
INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_price, total_price, item_type, return_reason, notes)
SELECT
    r.shipment_id,
    ri.product_id,
    ri.quantity,
    ri.unit_price,
    ri.total_amount,
    'RETURN',
    ri.reason,
    ri.notes
FROM return_items ri
JOIN returns r ON ri.return_id = r.id
WHERE r.status != 'CANCELLED';

-- Step 4: Update shipments table with return dates from returns
UPDATE shipments s
SET return_date = r.return_date,
    return_notes = r.notes
FROM returns r
WHERE s.id = r.shipment_id
  AND r.status != 'CANCELLED'
  AND r.return_date IS NOT NULL;

-- Step 5: Drop old return tables (with cascade to remove foreign keys)
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS returns CASCADE;

COMMIT;

-- Verification queries (run after migration):
-- SELECT COUNT(*) FROM shipment_items WHERE item_type = 'RETURN';
-- SELECT * FROM shipments WHERE return_date IS NOT NULL;
-- SELECT s.shipment_number, si.item_type, p.name, si.quantity, si.total_price
-- FROM shipments s
-- JOIN shipment_items si ON s.id = si.shipment_id
-- JOIN products p ON si.product_id = p.id
-- WHERE si.item_type = 'RETURN'
-- ORDER BY s.shipment_date DESC, s.id;
