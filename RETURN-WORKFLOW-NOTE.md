# Return Workflow - Important Note

## Issue: Empty Shipments List When Creating Returns

### Root Cause
The return creation modal filters shipments to only show those with status `DELIVERED`. If there are no delivered shipments in the system, the dropdown will be empty.

### Business Logic
**Returns can only be created for DELIVERED shipments** because:
- You can only return products that have already been delivered to the shop
- Returns are linked to specific shipment items that were received
- The return workflow requires confirmation that goods were actually delivered before allowing returns

### Shipment Status Workflow
1. **DRAFT** - Created but not confirmed
2. **CONFIRMED** - Ready for delivery
3. **IN_TRANSIT** - Picked up by driver
4. **DELIVERED** - Delivered to shop ✅ **(Required for returns)**
5. **CANCELLED** - Cancelled shipment

### Solution: Mark Shipments as Delivered

#### Option 1: Via UI (Recommended)
1. Navigate to **Spedizioni** (Shipments)
2. Find the shipment you want to mark as delivered
3. Click the appropriate status update buttons:
   - If CONFIRMED: Click "In Consegna" (In Transit) button
   - If IN_TRANSIT: Click "Consegnato" (Delivered) button
4. The shipment will now appear in the returns dropdown

#### Option 2: Via Database (For Testing)
```sql
-- Update a specific shipment to DELIVERED
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "UPDATE shipments SET status = 'DELIVERED' WHERE id = 1;"

-- Check all shipments and their statuses
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "SELECT id, shipment_number, status FROM shipments;"
```

#### Option 3: Via API
```bash
# Update shipment status to IN_TRANSIT (if CONFIRMED)
curl -X PUT http://localhost:8080/api/shipments/1/status?status=IN_TRANSIT \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update shipment status to DELIVERED (if IN_TRANSIT)
curl -X PUT http://localhost:8080/api/shipments/1/status?status=DELIVERED \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Current Database State (After Fix)
```
 id |  shipment_number   |  status
----+--------------------+-----------
  1 | SHP-20260119-67990 | DELIVERED  ✅
  2 | SHP-20260119-68480 | DRAFT
```

### User Experience Improvements Implemented
The code now includes:
1. **Console logging**: Check browser console to see loaded and filtered shipments
2. **Empty state message**: Shows "Nessuna spedizione consegnata disponibile" if no delivered shipments
3. **Alert notification**: Warns user that at least one DELIVERED shipment is required
4. **Better error handling**: Shows specific error messages if API call fails

### Testing the Return Feature
1. Ensure at least one shipment has `DELIVERED` status
2. Click "Nuovo Reso" button in the Resi section
3. The dropdown should now show the delivered shipment(s)
4. Select a shipment to see its items
5. Specify quantities and reasons for return
6. Submit the return

### Role-Based Permissions
- **DRIVER**: Can update shipment status to IN_TRANSIT and DELIVERED
- **ADMIN/ACCOUNTANT**: Can update shipment status and create returns
- **SHOP**: Can only create returns for their own shop

---

**Note**: This is expected behavior, not a bug. The system correctly enforces that returns can only be created for delivered shipments. Make sure to follow the proper shipment workflow before creating returns.
