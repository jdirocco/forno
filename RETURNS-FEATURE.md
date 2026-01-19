# Returns Management Feature

## Overview

Complete returns management system for handling product returns from shops, linked to specific shipments and shipment items.

## Features Implemented

### Backend Components

#### 1. Entities
- **Return Entity** (`Return.java`)
  - Linked to Shipment and Shop
  - Status workflow: PENDING → APPROVED → PROCESSED
  - Track return date, reason, notes
  - Auto-generated return number (RET-YYYYMMDD-XXXXX)
  - Audit fields (createdBy, processedBy, timestamps)

- **ReturnItem Entity** (`ReturnItem.java`)
  - Links to ShipmentItem and Product
  - Tracks quantity returned, unit price, total amount
  - Return reasons: DAMAGED, EXPIRED, WRONG_PRODUCT, EXCESS_QUANTITY, QUALITY_ISSUE, OTHER
  - Item-specific notes

#### 2. Repository
- **ReturnRepository** with queries:
  - Find by shop ID
  - Find by shipment ID
  - Find by status
  - Find by date range
  - Find by shop and date range

#### 3. Service Layer
- **ReturnService** with operations:
  - Create return with items
  - Get all returns / by ID / by shop / by shipment / by status
  - Update return status with workflow validation
  - Update return details
  - Delete return (only PENDING/REJECTED/CANCELLED)

#### 4. REST API Controller
- **ReturnController** endpoints:
  - `POST /api/returns` - Create return (ADMIN, SHOP, ACCOUNTANT)
  - `GET /api/returns` - Get all returns with filters (ADMIN, ACCOUNTANT)
  - `GET /api/returns/{id}` - Get return details
  - `GET /api/returns/shop/{shopId}` - Get shop returns (ADMIN, SHOP, ACCOUNTANT)
  - `GET /api/returns/shipment/{shipmentId}` - Get returns for shipment (ADMIN, ACCOUNTANT)
  - `PUT /api/returns/{id}/status` - Update status (ADMIN, ACCOUNTANT)
  - `PUT /api/returns/{id}` - Update return (ADMIN, ACCOUNTANT)
  - `DELETE /api/returns/{id}` - Delete return (ADMIN only)

### Frontend Components

#### 1. UI Sections
- **Returns List Page**
  - Table view with return number, date, shipment, shop, status
  - Action buttons: View Details, Approve, Reject, Process, Delete
  - Role-based button visibility

#### 2. Modals
- **Create Return Modal** (XL size)
  - Select delivered shipment from dropdown
  - Shop auto-populated from shipment
  - Dynamic list of shipment items
  - For each item:
    - Shows delivered quantity (readonly)
    - Input return quantity (0 to delivered qty)
    - Select return reason
    - Add item notes
  - Only items with qty > 0 are included in the return
  - General return reason and notes

- **Return Details Modal**
  - Complete return information
  - Return number, date, shipment, shop, status
  - Table of returned items with quantities, prices, reasons
  - Total amount calculation
  - Processing information (who/when)

#### 3. Navigation
- New "Resi" menu item with return-left icon
- Integrated with existing navigation system

### Workflow

#### Return Creation
1. User selects a DELIVERED shipment
2. System loads all items from that shipment
3. User specifies quantity to return for each item (with reason)
4. System creates return with PENDING status
5. Return number automatically generated

#### Return Processing
1. **PENDING** → Admin/Accountant can APPROVE or REJECT
2. **APPROVED** → Admin/Accountant can mark as PROCESSED
3. **REJECTED** → Can be deleted by Admin
4. **PROCESSED** → Final state, tracked who processed and when

### Status Badge Colors
- **PENDING**: Yellow (⚠️ waiting for approval)
- **APPROVED**: Green (✓ approved, ready to process)
- **REJECTED**: Red (✗ rejected)
- **PROCESSED**: Blue (✓✓ completed)
- **CANCELLED**: Red (✗ cancelled)

### Role-Based Access

#### ADMIN
- View all returns
- Create returns
- Approve/Reject/Process returns
- Update return details
- Delete returns (PENDING/REJECTED only)

#### ACCOUNTANT
- View all returns
- Create returns
- Approve/Reject/Process returns
- Update return details

#### SHOP
- View their shop's returns
- Create returns for their shop
- View return details

#### DRIVER
- No access to returns (not relevant to their role)

## Database Schema

### `returns` Table
- id (PK)
- return_number (unique)
- shipment_id (FK → shipments)
- shop_id (FK → shops)
- return_date
- status (PENDING, APPROVED, REJECTED, PROCESSED, CANCELLED)
- reason (text)
- notes (text)
- processed_by (FK → users)
- processed_at (timestamp)
- created_by (FK → users)
- created_at (timestamp)
- updated_at (timestamp)

### `return_items` Table
- id (PK)
- return_id (FK → returns)
- shipment_item_id (FK → shipment_items)
- product_id (FK → products)
- quantity (decimal)
- unit_price (decimal)
- total_amount (decimal, calculated)
- reason (enum: DAMAGED, EXPIRED, etc.)
- notes (text)

## API Examples

### Create Return
```bash
POST /api/returns
Authorization: Bearer {token}
Content-Type: application/json

{
  "shipmentId": 1,
  "shopId": 1,
  "returnDate": "2026-01-20",
  "reason": "Alcuni prodotti danneggiati durante il trasporto",
  "notes": "Controllare imballaggio per prossime consegne",
  "items": [
    {
      "shipmentItemId": 1,
      "productId": 1,
      "quantity": 2.5,
      "reason": "DAMAGED",
      "notes": "Confezione rotta"
    }
  ]
}
```

### Get All Returns
```bash
GET /api/returns
Authorization: Bearer {token}
```

### Get Returns by Status
```bash
GET /api/returns?status=PENDING
Authorization: Bearer {token}
```

### Approve Return
```bash
PUT /api/returns/1/status?status=APPROVED
Authorization: Bearer {token}
```

## Testing

The application is ready for testing at http://localhost:8080

1. **Login as admin** (admin/admin123)
2. **Navigate to "Resi"** in the menu
3. **Click "Nuovo Reso"** to create a return
4. **Select a delivered shipment**
5. **Specify quantities and reasons** for items to return
6. **Submit the return**
7. **View, approve, and process** the return

## Integration Points

- **Shipments**: Returns are linked to delivered shipments
- **Products**: Return items reference products with prices
- **Shops**: Returns are associated with specific shops
- **Users**: Tracks who created and who processed returns
- **Audit Trail**: Complete history of return lifecycle

## Future Enhancements

Potential improvements for the returns system:

- [ ] PDF generation for return documents
- [ ] Email notifications for return status changes
- [ ] Credit notes generation
- [ ] Inventory adjustment on return processing
- [ ] Return analytics and reporting
- [ ] Batch return processing
- [ ] Return approval workflow with multiple approvers
- [ ] Photo attachment for damaged items
- [ ] Integration with accounting system
- [ ] Refund processing

## Technical Details

- **Java Version**: 17
- **Spring Boot**: 3.2.1
- **Database**: PostgreSQL (production), H2 (dev)
- **Frontend**: Vanilla JavaScript + Bootstrap 5
- **Icons**: Bootstrap Icons
- **Validation**: Jakarta Validation
- **ORM**: Hibernate/JPA with lazy loading
- **JSON**: Jackson with Hibernate proxy handling

---

**Feature Status**: ✅ Complete and Ready for Testing

**Date**: 2026-01-19
**Version**: v1.2.0
