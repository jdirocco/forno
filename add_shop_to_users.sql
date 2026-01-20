-- Add shop_id column to users table for SHOP role users
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id BIGINT;

-- Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT fk_users_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id);

-- Example: Assign a shop user to a shop
-- UPDATE users SET shop_id = 11 WHERE username = 'shop1';
