-- Initialize database with test data
-- Drop and recreate schema (already done)

-- 1. USERS (1 Admin, 1 Accountant, 3 Drivers)
-- Password for all users: admin
INSERT INTO users (username, password, full_name, email, phone, whatsapp_number, role, active, created_at, updated_at) VALUES
('admin', '$2a$10$YlofXZjuIuozMh9P8JHI.OagjBQQ8OP8yYzDeETqi8LkmwEEiErM.', 'Administrator', 'admin@bakery.com', '+39 333 1234567', '+39 333 1234567', 'ADMIN', true, NOW(), NOW()),
('ragioniere', '$2a$10$YlofXZjuIuozMh9P8JHI.OagjBQQ8OP8yYzDeETqi8LkmwEEiErM.', 'Mario Bianchi', 'mario.bianchi@bakery.com', '+39 333 2345678', '+39 333 2345678', 'ACCOUNTANT', true, NOW(), NOW()),
('driver1', '$2a$10$YlofXZjuIuozMh9P8JHI.OagjBQQ8OP8yYzDeETqi8LkmwEEiErM.', 'Giuseppe Verdi', 'giuseppe.verdi@bakery.com', '+39 333 3456789', '+39 333 3456789', 'DRIVER', true, NOW(), NOW()),
('driver2', '$2a$10$YlofXZjuIuozMh9P8JHI.OagjBQQ8OP8yYzDeETqi8LkmwEEiErM.', 'Antonio Rossi', 'antonio.rossi@bakery.com', '+39 333 4567890', '+39 333 4567890', 'DRIVER', true, NOW(), NOW()),
('driver3', '$2a$10$YlofXZjuIuozMh9P8JHI.OagjBQQ8OP8yYzDeETqi8LkmwEEiErM.', 'Francesco Neri', 'francesco.neri@bakery.com', '+39 333 5678901', '+39 333 5678901', 'DRIVER', true, NOW(), NOW());

-- 2. SHOPS (10 shops)
INSERT INTO shops (code, name, address, city, province, zip_code, phone, whatsapp_number, email, contact_person, active, created_at, updated_at) VALUES
('PAN001', 'Panificio Napoletano', 'Via Roma 123', 'Napoli', 'NA', '80100', '+39 081 1234567', '+39 333 6789012', 'info@panificionapoletano.it', 'Giovanni Esposito', true, NOW(), NOW()),
('PAN002', 'Panetteria Centro', 'Corso Umberto 45', 'Napoli', 'NA', '80138', '+39 081 2345678', '+39 333 7890123', 'info@panetteriacentro.it', 'Maria Russo', true, NOW(), NOW()),
('PAN003', 'Forno del Vesuvio', 'Via Vesuvio 78', 'Portici', 'NA', '80055', '+39 081 3456789', '+39 333 8901234', 'info@fornodelvesuvio.it', 'Luigi Ferrari', true, NOW(), NOW()),
('PAN004', 'Panificio Tradizionale', 'Via Garibaldi 90', 'Caserta', 'CE', '81100', '+39 0823 456789', '+39 333 9012345', 'info@panificiotradizionale.it', 'Anna Ricci', true, NOW(), NOW()),
('PAN005', 'Forno Santa Lucia', 'Via Santa Lucia 12', 'Napoli', 'NA', '80132', '+39 081 5678901', '+39 334 0123456', 'info@fornosantalucia.it', 'Carlo Marino', true, NOW(), NOW()),
('PAN006', 'Panetteria del Porto', 'Via Caracciolo 56', 'Napoli', 'NA', '80122', '+39 081 6789012', '+39 334 1234567', 'info@panetteriadeiporto.it', 'Rosa Gallo', true, NOW(), NOW()),
('PAN007', 'Forno Antico', 'Via Toledo 234', 'Napoli', 'NA', '80134', '+39 081 7890123', '+39 334 2345678', 'info@fornoantico.it', 'Paolo Conti', true, NOW(), NOW()),
('PAN008', 'Panificio Moderno', 'Viale Europa 88', 'Pomigliano', 'NA', '80038', '+39 081 8901234', '+39 334 3456789', 'info@panificiomoderno.it', 'Laura Costa', true, NOW(), NOW()),
('PAN009', 'Forno del Sole', 'Via del Sole 15', 'Aversa', 'CE', '81031', '+39 081 9012345', '+39 334 4567890', 'info@fornodelsole.it', 'Marco Mancini', true, NOW(), NOW()),
('PAN010', 'Panetteria Fratelli Rossi', 'Corso Italia 67', 'Acerra', 'NA', '80011', '+39 081 0123456', '+39 334 5678901', 'info@fratellirossi.it', 'Sara Fontana', true, NOW(), NOW());

-- 3. PRODUCTS (20 products)
INSERT INTO products (code, name, description, unit_price, unit, category, active, created_at, updated_at) VALUES
('PANE001', 'Pane Cafone', 'Pane tradizionale napoletano da 1kg', 3.50, 'kg', 'BREAD', true, NOW(), NOW()),
('PANE002', 'Pane Integrale', 'Pane integrale con farina di grano duro', 4.00, 'kg', 'BREAD', true, NOW(), NOW()),
('PANE003', 'Pane ai Cereali', 'Pane multicereali con semi', 4.50, 'kg', 'BREAD', true, NOW(), NOW()),
('PANE004', 'Pane Carasau', 'Pane croccante sardo', 6.00, 'kg', 'BREAD', true, NOW(), NOW()),
('PANE005', 'Ciabatta', 'Ciabatta classica', 3.80, 'kg', 'BREAD', true, NOW(), NOW()),
('CORN001', 'Cornetto Vuoto', 'Cornetto classico', 0.80, 'pz', 'PASTRY', true, NOW(), NOW()),
('CORN002', 'Cornetto Crema', 'Cornetto farcito con crema', 1.20, 'pz', 'PASTRY', true, NOW(), NOW()),
('CORN003', 'Cornetto Cioccolato', 'Cornetto farcito con cioccolato', 1.20, 'pz', 'PASTRY', true, NOW(), NOW()),
('CORN004', 'Cornetto Integrale', 'Cornetto integrale', 1.00, 'pz', 'PASTRY', true, NOW(), NOW()),
('DOLC001', 'Sfogliatella Riccia', 'Sfogliatella napoletana riccia', 1.50, 'pz', 'CAKE', true, NOW(), NOW()),
('DOLC002', 'Sfogliatella Frolla', 'Sfogliatella napoletana frolla', 1.50, 'pz', 'CAKE', true, NOW(), NOW()),
('DOLC003', 'Babà', 'Babà al rhum napoletano', 2.00, 'pz', 'CAKE', true, NOW(), NOW()),
('DOLC004', 'Pastiera', 'Pastiera napoletana', 18.00, 'pz', 'CAKE', true, NOW(), NOW()),
('DOLC005', 'Torta Caprese', 'Torta al cioccolato e mandorle', 15.00, 'pz', 'CAKE', true, NOW(), NOW()),
('TART001', 'Taralli Classici', 'Taralli napoletani classici', 8.00, 'kg', 'COOKIE', true, NOW(), NOW()),
('TART002', 'Taralli al Pepe', 'Taralli con pepe nero', 9.00, 'kg', 'COOKIE', true, NOW(), NOW()),
('TART003', 'Taralli al Finocchietto', 'Taralli con semi di finocchio', 9.00, 'kg', 'COOKIE', true, NOW(), NOW()),
('BISC001', 'Biscotti Secchi', 'Biscotti tradizionali', 10.00, 'kg', 'COOKIE', true, NOW(), NOW()),
('BISC002', 'Savoiardi', 'Biscotti savoiardi', 12.00, 'kg', 'COOKIE', true, NOW(), NOW()),
('PIZZA001', 'Pizza Margherita', 'Pizza margherita surgelata', 5.00, 'pz', 'PIZZA', true, NOW(), NOW());
