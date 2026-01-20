#!/usr/bin/env python3
import random
from datetime import datetime, timedelta

# Configuration
NUM_SHIPMENTS = 50
SHOPS = list(range(11, 21))  # 10 shops (IDs 11-20)
DRIVERS = [8, 9, 10]  # 3 drivers (user IDs)
PRODUCTS = list(range(1, 21))  # 20 products
ADMIN_ID = 6

# Product prices (matching the SQL)
PRODUCT_PRICES = {
    1: 3.50, 2: 4.00, 3: 4.50, 4: 6.00, 5: 3.80,
    6: 0.80, 7: 1.20, 8: 1.20, 9: 1.00, 10: 1.50,
    11: 1.50, 12: 2.00, 13: 18.00, 14: 15.00, 15: 8.00,
    16: 9.00, 17: 9.00, 18: 10.00, 19: 12.00, 20: 5.00
}

STATUSES = ['BOZZA', 'IN_CONSEGNA', 'CONSEGNATA']
RETURN_REASONS = ['DAMAGED', 'EXPIRED', 'WRONG_PRODUCT', 'EXCESS_QUANTITY', 'QUALITY_ISSUE', 'OTHER']

# Generate shipments
shipments_sql = []
shipment_items_sql = []
returns_sql = []
return_items_sql = []

shipment_id = 1
shipment_item_id = 1
return_id = 1
return_item_id = 1

for i in range(NUM_SHIPMENTS):
    # Random date in last 60 days
    days_ago = random.randint(0, 60)
    shipment_date = datetime.now() - timedelta(days=days_ago)
    shipment_date_str = shipment_date.strftime('%Y-%m-%d')

    # Random shop and driver
    shop_id = random.choice(SHOPS)
    driver_id = random.choice(DRIVERS)

    # Status: older shipments more likely to be delivered
    if days_ago > 30:
        status = 'CONSEGNATA'
    elif days_ago > 10:
        status = random.choice(['IN_CONSEGNA', 'CONSEGNATA'])
    else:
        status = random.choice(STATUSES)

    # Generate shipment number
    shipment_number = f"SHP-{shipment_date.strftime('%Y%m%d')}-{10000 + i}"

    # Create shipment
    shipments_sql.append(
        f"INSERT INTO shipments (id, shipment_number, shop_id, driver_id, shipment_date, status, "
        f"notes, email_sent, whatsapp_sent, created_by, created_at, updated_at) VALUES "
        f"({shipment_id}, '{shipment_number}', {shop_id}, {driver_id}, '{shipment_date_str}', '{status}', "
        f"'Consegna standard', false, false, {ADMIN_ID}, NOW(), NOW());"
    )

    # Create 3-8 random items for this shipment
    num_items = random.randint(3, 8)
    selected_products = random.sample(PRODUCTS, num_items)

    for product_id in selected_products:
        quantity = round(random.uniform(1, 20), 2)
        unit_price = PRODUCT_PRICES[product_id]
        total_price = round(quantity * unit_price, 2)

        shipment_items_sql.append(
            f"INSERT INTO shipment_items (id, shipment_id, product_id, quantity, unit_price, total_price) VALUES "
            f"({shipment_item_id}, {shipment_id}, {product_id}, {quantity}, {unit_price}, {total_price});"
        )
        shipment_item_id += 1

    # 30% chance of having a return if status is CONSEGNATA
    if status == 'CONSEGNATA' and random.random() < 0.3:
        return_date = shipment_date + timedelta(days=random.randint(1, 5))
        return_date_str = return_date.strftime('%Y-%m-%d')
        return_number = f"RET-{return_date.strftime('%Y%m%d')}-{10000 + return_id}"
        return_status = random.choice(['PENDING', 'APPROVED', 'PROCESSED'])
        reason = random.choice(RETURN_REASONS)

        returns_sql.append(
            f"INSERT INTO returns (id, return_number, shipment_id, shop_id, return_date, status, "
            f"reason, created_by, created_at, updated_at) VALUES "
            f"({return_id}, '{return_number}', {shipment_id}, {shop_id}, '{return_date_str}', '{return_status}', "
            f"'{reason}', {ADMIN_ID}, NOW(), NOW());"
        )

        # Return 1-3 items from this shipment
        # Get some of the shipment items for return
        num_return_items = min(random.randint(1, 3), num_items)
        start_item_id = shipment_item_id - num_items

        for j in range(num_return_items):
            item_id = start_item_id + j
            product_id = selected_products[j]
            return_quantity = round(random.uniform(0.5, 5), 2)
            unit_price = PRODUCT_PRICES[product_id]
            total_amount = round(return_quantity * unit_price, 2)
            item_reason = random.choice(RETURN_REASONS)

            return_items_sql.append(
                f"INSERT INTO return_items (id, return_id, shipment_item_id, product_id, quantity, "
                f"unit_price, total_amount, reason) VALUES "
                f"({return_item_id}, {return_id}, {item_id}, {product_id}, {return_quantity}, "
                f"{unit_price}, {total_amount}, '{item_reason}');"
            )
            return_item_id += 1

        return_id += 1

    shipment_id += 1

# Write to file
with open('/Users/juridirocco/Desktop/mucci/bakery-warehouse/generated_data.sql', 'w') as f:
    f.write("-- Generated shipments and returns data\n\n")
    f.write("-- SHIPMENTS\n")
    for sql in shipments_sql:
        f.write(sql + "\n")

    f.write("\n-- SHIPMENT ITEMS\n")
    for sql in shipment_items_sql:
        f.write(sql + "\n")

    f.write("\n-- RETURNS\n")
    for sql in returns_sql:
        f.write(sql + "\n")

    f.write("\n-- RETURN ITEMS\n")
    for sql in return_items_sql:
        f.write(sql + "\n")

    f.write("\n-- Update sequences\n")
    f.write(f"SELECT setval('shipments_id_seq', {shipment_id}, true);\n")
    f.write(f"SELECT setval('shipment_items_id_seq', {shipment_item_id}, true);\n")
    f.write(f"SELECT setval('returns_id_seq', {return_id}, true);\n")
    f.write(f"SELECT setval('return_items_id_seq', {return_item_id}, true);\n")

print(f"Generated {len(shipments_sql)} shipments with {len(shipment_items_sql)} items")
print(f"Generated {len(returns_sql)} returns with {len(return_items_sql)} items")
print("SQL file saved to: generated_data.sql")
