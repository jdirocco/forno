# Bakery Warehouse Management System

Sistema di gestione magazzino per panifici con gestione documenti di trasporto, notifiche email e WhatsApp.

## 📋 Changelog

### Version 1.3.1 - Returns Bug Fix & Driver Permissions (2026-01-19)

#### 🐛 Bug Fixes
- **Fixed Returns Creation Error**: Resolved validation error when creating returns
  - Added `ShipmentItemRepository` injection in `ReturnController`
  - Fixed missing `shipmentItem` assignment in `ReturnItem` entity
  - Returns now correctly link to specific shipment items
- **Enhanced Debugging**: Added detailed API call logging for troubleshooting
  - Token presence verification
  - Request headers logging
  - Improved error messages

#### 🔐 Role-Based Access Updates
- **DRIVER Role**: Added permission to create returns
  - Drivers can now register returns directly from delivered shipments
  - Updated `@PreAuthorize` annotation to include DRIVER role

#### 🔧 Technical Changes
- Added `ShipmentItemRepository` import and dependency injection
- Modified `createReturn` method to fetch and assign `ShipmentItem` entities
- Enhanced frontend logging for JWT token verification

---

### Version 1.3.0 - UI Enhancements with DataTables & Datepicker (2026-01-19)

#### ✨ New Features
- **DataTables.js Integration**: Professional table features for all data grids
  - Real-time search across all columns
  - Column sorting (ascending/descending)
  - Pagination with configurable page sizes (10, 25, 50, 100)
  - Responsive design for mobile devices
  - Italian language localization
- **Bootstrap Datepicker**: Enhanced date selection with calendar popup
  - Visual calendar interface
  - Today highlighting
  - Italian localization
  - Auto-close on selection
  - Keyboard navigation
- **Form Validation Enhancements**: Visual feedback with Bootstrap validation
  - Green checkmarks for valid inputs
  - Red error indicators for invalid inputs
  - Inline validation messages
- **UX Improvements**:
  - Icon-only buttons in tables for better mobile experience
  - Tooltips on all action buttons
  - Improved loading states
  - Better data ordering (dates, prices)
  - Enhanced CSS styling for DataTables and Datepicker

#### 📊 Tables Enhanced
- **Shipments Table**: Search, sort, paginate with 6 columns
- **Shops Table**: Search by code, name, city, address
- **Products Table**: Sort by price with proper numeric formatting
- **Returns Table**: Filter by return number, status, date

#### 🎨 UI/UX Improvements
- Rounded borders on search inputs
- Primary color focus states
- Shadow on calendar popup
- Centered loading spinners
- Mobile-responsive table controls
- Smooth animations and transitions

#### 🔧 Technical Details
- **jQuery 3.7.1**: Required for DataTables and Datepicker
- **DataTables 1.13.7**: Core table library
- **Bootstrap Datepicker 1.10.0**: Calendar widget
- **~200KB additional bundle size** (minified, from CDN)
- All libraries loaded from CDN with browser caching

#### 📚 Documentation
- **UI-ENHANCEMENTS.md**: Complete documentation of UI improvements
- Usage examples for search, sort, pagination
- Browser compatibility matrix
- Accessibility features
- Performance metrics

---

### Version 1.2.0 - Returns Management System (2026-01-19)

#### ✨ New Features
- **Complete Returns Management**: Full workflow for handling product returns from shops
- **Return Tracking**: Returns linked to specific shipments and shipment items
- **Return Workflow**: Status progression (PENDING → APPROVED → REJECTED → PROCESSED)
- **Auto-Generated Return Numbers**: Format RET-YYYYMMDD-XXXXX for easy tracking
- **Return Reasons**: 6 categorized return reasons (DAMAGED, EXPIRED, WRONG_PRODUCT, EXCESS_QUANTITY, QUALITY_ISSUE, OTHER)
- **Audit Trail**: Complete tracking of who created and who processed each return
- **Dynamic Return UI**: Select shipment and specify return quantities for each item
- **Return Details Modal**: View complete return information with items and total amounts

#### 🗄️ Database Schema
- **Returns Table**: Tracks return header (return_number, shipment, shop, status, dates, audit fields)
- **Return Items Table**: Tracks individual returned items (quantity, price, reason, notes)
- **Foreign Keys**: Proper relationships to shipments, shops, products, and users
- **Status Validation**: Database-level enum constraints for return statuses
- **Quantity Tracking**: Decimal precision for accurate quantity management

#### 🔐 Role-Based Access
- **ADMIN**: Full access (create, approve, process, delete returns)
- **ACCOUNTANT**: Create and approve returns, view all returns
- **SHOP**: Create returns for their shop, view their shop's returns
- **DRIVER**: Can create returns for delivered shipments

#### 📊 API Endpoints
- `POST /api/returns` - Create new return with items
- `GET /api/returns` - Get all returns with optional filters (status, date range)
- `GET /api/returns/{id}` - Get return details
- `GET /api/returns/shop/{shopId}` - Get returns for specific shop
- `GET /api/returns/shipment/{shipmentId}` - Get returns for specific shipment
- `PUT /api/returns/{id}/status` - Update return status (approve/reject/process)
- `PUT /api/returns/{id}` - Update return details
- `DELETE /api/returns/{id}` - Delete return (PENDING/REJECTED only)

#### 🎨 UI Components
- **Returns List Page**: Table view with return number, date, shipment, shop, status
- **Create Return Modal**: XL modal with shipment selection and dynamic item list
- **Return Details Modal**: Complete return information with items and calculations
- **Status Badges**: Color-coded status indicators (PENDING=yellow, APPROVED=green, REJECTED=red, PROCESSED=blue)
- **Action Buttons**: Role-based visibility (Approve, Reject, Process, Delete)
- **Navigation**: New "Resi" menu item with return-left icon

#### 🔧 Technical Implementation
- **Return Entity**: JPA entity with lazy loading and Hibernate proxy handling
- **ReturnItem Entity**: Nested entity with cascade operations
- **ReturnRepository**: Custom query methods for filtering by shop, shipment, status, date range
- **ReturnService**: Business logic with workflow validation
- **ReturnController**: REST API with role-based security annotations
- **ReturnRequest DTO**: Clean API contract for creating returns

#### 📚 Documentation
- **RETURNS-FEATURE.md**: Complete feature documentation with examples
- **API Examples**: cURL examples for all endpoints
- **Workflow Diagrams**: Visual representation of return lifecycle
- **Database Schema**: Detailed table structure documentation
- **Future Enhancements**: Roadmap for return feature improvements

---

### Version 1.1.0 - UI Enhancement & Bug Fixes (2026-01-19)

#### ✨ New Features
- **Complete CRUD UI**: Fully functional forms for all entities (Shops, Products, Shipments)
- **Mobile-First Design**: Responsive interface optimized for smartphones and tablets
- **Touch-Optimized**: 44px minimum touch targets, 16px inputs to prevent iOS zoom
- **Bootstrap Modals**: Professional modal dialogs replacing placeholder alerts
- **Dynamic Shipment Creation**: Add/remove multiple products with live UI updates
- **Role-Based UI**: Show/hide features based on user permissions
- **Bootstrap Icons**: Professional icon set for better UX
- **Status Badges**: Color-coded shipment status indicators

#### 🐛 Critical Bug Fixes
- **Fixed Hibernate Lazy Loading**: Resolved Jackson serialization error with lazy-loaded entities
  - Added `@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})` to Shipment, Shop, and User entities
  - Fixed 403 error on `/api/shipments` endpoint caused by serialization failure
- **Security Configuration**: Removed conflicting method security annotations
- **JWT Debug Logging**: Enhanced logging for authentication troubleshooting

#### 🎨 UI Improvements
- **Shop Modal**: 11-field form with complete shop information
- **Product Modal**: 7-field form with category selection
- **Shipment Modal**: Extra-large modal with dynamic product list
- **Shipment Details Modal**: Read-only view with complete shipment info
- **Responsive Tables**: Mobile-optimized with horizontal scroll
- **Loading States**: Spinner indicators during data fetch
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages for all operations

#### 📱 Mobile Optimization
- Touch-friendly buttons (44x44px minimum)
- 16px font size on inputs (prevents iOS zoom)
- Full-width modals on mobile
- Single-column forms on small screens
- Collapsible hamburger navigation
- Swipe-friendly tables
- Optimized for both iOS and Android

#### 🔧 Technical Improvements
- Enhanced JWT authentication filter with debug logging
- Improved error handling in API calls
- Better CORS configuration
- Optimized Hibernate fetch strategies
- Production-ready logging configuration

---

### Version 1.0.0 - Initial Release (2026-01-19)

#### ✨ Features
- **User Management**: Sistema di autenticazione JWT con 4 ruoli (Admin, Shop, Driver, Accountant)
- **Shop Management**: Gestione anagrafica negozi con contatti completi
- **Product Catalog**: Catalogo prodotti con prezzi, categorie e unità di misura
- **Shipment Management**: Creazione e gestione spedizioni con workflow completo
- **PDF Generation**: Generazione automatica documenti di trasporto (DDT) in italiano
- **Database Persistence**: PostgreSQL containerizzato con persistenza dati
- **API REST**: API complete per tutte le operazioni CRUD
- **Web Interface**: Interfaccia web Bootstrap 5 per gestione completa

#### 🗄️ Database
- PostgreSQL 15 in container Docker
- H2 in-memory per sviluppo
- Profili configurabili (dev/prod)
- Schema auto-generato con Hibernate
- Supporto per backup e restore

#### 🔐 Security
- JWT token-based authentication
- Password encryption con BCrypt
- Role-based access control (RBAC)
- CORS configurato
- SQL injection protection

#### 📧 Notifications (Ready for Configuration)
- Email support via Spring Mail (SMTP)
- WhatsApp support via Twilio API
- Template-based notifications
- Automatic sending on shipment confirmation

#### 🛠️ Tools & Scripts
- `manage-db.sh`: Script gestione database PostgreSQL
- `test-data.sh`: Creazione dati di test
- `create-shipment.sh`: Test creazione spedizioni
- Docker Compose configuration
- Comprehensive documentation

#### 📦 Deployment
- Docker containerization
- Docker Compose orchestration
- VPS deployment ready
- Environment variable configuration
- Production-ready setup

#### 🐛 Bug Fixes
- Fixed JSON circular reference in ShipmentItem entity with @JsonIgnore
- Resolved PostgreSQL connection configuration
- Fixed JWT token generation and validation

#### 📚 Documentation
- Complete README with setup instructions
- PostgreSQL setup guide
- Quick start reference
- API endpoint documentation
- Troubleshooting guide
- Test results documentation

---

## Caratteristiche

- **4 Ruoli Utente**: Admin, Shop, Driver, Accountant
- **Gestione Spedizioni**: Creazione, conferma e tracciamento delle consegne
- **Gestione Negozi**: Anagrafica negozi con contatti
- **Gestione Prodotti**: Catalogo prodotti con prezzi e categorie
- **PDF Automatici**: Generazione documenti di trasporto in PDF
- **Notifiche**: Email e WhatsApp automatiche
- **API REST**: Backend completamente REST API based
- **Sicurezza**: JWT authentication con controllo ruoli

## Stack Tecnologico

- **Backend**: Spring Boot 3.2.1, Java 17
- **Database**: PostgreSQL (Production), H2 (Development)
- **Frontend**: HTML, JavaScript, Bootstrap 5
- **PDF**: iText 7
- **Email**: Spring Mail
- **WhatsApp**: Twilio API
- **Security**: Spring Security + JWT
- **Deployment**: Docker + Docker Compose

## Requisiti

- Java 17+
- Maven 3.6+
- Docker & Docker Compose (per deployment)
- PostgreSQL (se non si usa Docker)

## Installazione e Avvio

### Sviluppo Locale (H2 Database)

```bash
# Clone il repository
cd bakery-warehouse

# Avvia con profilo dev (usa H2 in-memory)
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

L'applicazione sarà disponibile su: http://localhost:8080

Console H2: http://localhost:8080/h2-console
- JDBC URL: jdbc:h2:mem:bakery_warehouse_dev
- Username: sa
- Password: (vuota)

### Deployment con Docker

```bash
# Crea file .env dalla template
cp .env.example .env

# Modifica .env con le tue credenziali
nano .env

# Avvia con Docker Compose
docker-compose up -d

# Visualizza logs
docker-compose logs -f app
```

### Deployment su VPS (Hetzner/DigitalOcean)

1. **Installa Docker sul VPS**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

2. **Carica il progetto sul VPS**:
```bash
scp -r bakery-warehouse root@your-vps-ip:/root/
```

3. **Configura e avvia**:
```bash
ssh root@your-vps-ip
cd /root/bakery-warehouse
cp .env.example .env
nano .env  # Configura le variabili
docker-compose up -d
```

4. **Configura Nginx (opzionale, per HTTPS)**:
```bash
apt install nginx certbot python3-certbot-nginx
# Configura nginx reverse proxy
certbot --nginx -d yourdomain.com
```

## Configurazione

### Email (Gmail)
1. Abilita autenticazione a 2 fattori su Gmail
2. Genera App Password: https://myaccount.google.com/apppasswords
3. Aggiungi credenziali in `.env`:
```
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### WhatsApp (Twilio)
1. Crea account Twilio: https://www.twilio.com/
2. Configura WhatsApp Sandbox o Business API
3. Aggiungi credenziali in `.env`:
```
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## Utilizzo

### Primo Accesso

L'applicazione non ha utenti pre-configurati. Devi creare il primo admin:

```bash
# Metodo 1: API
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "fullName": "Administrator",
    "email": "admin@bakery.com",
    "role": "ADMIN",
    "active": true
  }'

# Metodo 2: Database diretto (PostgreSQL)
docker exec -it bakery-postgres psql -U bakery_user -d bakery_warehouse
INSERT INTO users (username, password, full_name, email, role, active, created_at, updated_at)
VALUES ('admin', '$2a$10$...bcrypt_hash...', 'Administrator', 'admin@bakery.com', 'ADMIN', true, NOW(), NOW());
```

Per generare bcrypt password:
```bash
# Online: https://bcrypt-generator.com/
# O in Java/Spring
```

### Workflow Tipico

1. **Admin/Accountant**:
   - Crea negozi e prodotti
   - Crea nuova spedizione
   - Conferma spedizione (genera PDF, invia notifiche)

2. **Driver**:
   - Visualizza spedizioni del giorno
   - Aggiorna stato a "In consegna"
   - Conferma consegna

3. **Shop**:
   - Visualizza spedizioni ricevute
   - Controlla storico

4. **Accountant**:
   - Visualizza tutte le spedizioni
   - Genera report (da implementare)

## API Endpoints

### Autenticazione
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registrazione

### Spedizioni
- `GET /api/shipments` - Lista spedizioni
- `POST /api/shipments` - Crea spedizione
- `POST /api/shipments/{id}/confirm` - Conferma e invia
- `PUT /api/shipments/{id}/status` - Aggiorna stato
- `GET /api/shipments/driver/today` - Spedizioni driver oggi

### Negozi
- `GET /api/shops` - Lista negozi
- `POST /api/shops` - Crea negozio
- `PUT /api/shops/{id}` - Aggiorna negozio

### Prodotti
- `GET /api/products` - Lista prodotti
- `POST /api/products` - Crea prodotto
- `PUT /api/products/{id}` - Aggiorna prodotto

### Resi
- `GET /api/returns` - Lista resi (con filtri opzionali: status, date range)
- `POST /api/returns` - Crea nuovo reso
- `GET /api/returns/{id}` - Dettagli reso
- `GET /api/returns/shop/{shopId}` - Resi per negozio
- `GET /api/returns/shipment/{shipmentId}` - Resi per spedizione
- `PUT /api/returns/{id}/status` - Aggiorna stato reso
- `DELETE /api/returns/{id}` - Elimina reso (solo PENDING/REJECTED)

## Sviluppi Futuri

- [ ] Modal completi per creazione spedizioni, negozi e prodotti
- [ ] Report e statistiche
- [ ] Export Excel
- [ ] Filtri avanzati
- [ ] Notifiche in-app
- [ ] App mobile (React Native/Flutter)
- [ ] Barcode scanning
- [ ] Firma digitale su consegna

## Troubleshooting

### Errore connessione database
```bash
# Verifica PostgreSQL sia in esecuzione
docker ps
# Controlla credenziali in .env
```

### Email non inviate
```bash
# Verifica credenziali Gmail
# Controlla logs: docker-compose logs app
# Test SMTP manuale
```

### WhatsApp non funziona
```bash
# Verifica Twilio sandbox attivo
# Controlla numero autorizzato
# Logs: docker-compose logs app
```

## Sicurezza

- Cambia `JWT_SECRET` in produzione
- Usa password forti per database
- Configura firewall su VPS
- Abilita HTTPS con Nginx + Certbot
- Backup regolari del database

## Backup Database

```bash
# Backup
docker exec bakery-postgres pg_dump -U bakery_user bakery_warehouse > backup.sql

# Restore
docker exec -i bakery-postgres psql -U bakery_user bakery_warehouse < backup.sql
```

## Licenza

Proprietario - Uso interno

## Supporto

Per supporto, contattare: [your-email]
the application have to manage returns from the shops. (the return is linked to a specific shipment / shipment item/s