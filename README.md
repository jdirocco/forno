# Bakery Warehouse Management System

Sistema di gestione magazzino per panifici con gestione documenti di trasporto, notifiche email e WhatsApp.

## 📋 Changelog

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
