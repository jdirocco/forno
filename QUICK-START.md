# Bakery Warehouse - Quick Start Guide

## 🚀 Application is Running!

**Web Interface**: http://localhost:8080
**Database**: PostgreSQL (containerized, persistent)
**Status**: ✅ READY

---

## 🔑 Login Credentials

```
Username: admin
Password: admin123
```

---

## 🐘 PostgreSQL Database

**Container**: `bakery-postgres` (running on port 5433)
**Data**: Persistent (survives restarts)

### Quick Commands

```bash
# Database statistics
./manage-db.sh stats

# Database shell
./manage-db.sh shell

# Backup
./manage-db.sh backup

# View all commands
./manage-db.sh
```

---

## 🎯 Current Data

- **Users**: 2 (admin, driver1)
- **Shops**: 3 (Milano, Roma, Napoli)
- **Products**: 4 (Bread, Pastries, Pizza)
- **Shipments**: 1 (confirmed, with PDF)

---

## 📱 Start/Stop Application

**Start with PostgreSQL:**
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

**Start with H2 (development):**
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Stop:**
```bash
lsof -ti:8080 | xargs kill -9
```

---

## 🔧 Quick Tests

**Test API:**
```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get shops
TOKEN="your-token-here"
curl http://localhost:8080/api/shops \
  -H "Authorization: Bearer $TOKEN"
```

**View Generated PDFs:**
```bash
ls -lh storage/pdfs/
```

---

## 📚 Documentation

- [README.md](README.md) - Full documentation
- [POSTGRESQL-SETUP.md](POSTGRESQL-SETUP.md) - Database guide
- [TEST-RESULTS.md](TEST-RESULTS.md) - Test results

---

## 🐳 Docker Status

```bash
# Check PostgreSQL
docker ps | grep bakery-postgres

# View logs
docker logs -f bakery-postgres

# Stop database
docker stop bakery-postgres

# Start database
docker start bakery-postgres
```

---

## 🎨 Test Data Scripts

```bash
# Create test shops and products
./test-data.sh

# Create test shipment
./create-shipment.sh
```

---

## ⚙️ Configuration

**PostgreSQL Settings:**
- File: `src/main/resources/application-prod.yml`
- Port: 5433
- Database: bakery_warehouse

**H2 Settings:**
- File: `src/main/resources/application-dev.yml`
- Console: http://localhost:8080/h2-console

---

## 🚨 Troubleshooting

**Port already in use:**
```bash
lsof -ti:8080 | xargs kill -9
```

**Database not responding:**
```bash
./manage-db.sh restart
```

**Reset everything:**
```bash
./manage-db.sh clean  # Keeps structure
# or
./manage-db.sh remove  # Deletes everything
```

---

## 📦 Next Steps

### For Development:
1. ✅ PostgreSQL is running
2. ✅ Application connected
3. ✅ Test data loaded
4. 📝 Start building features

### For Production:
1. ✅ PostgreSQL configured
2. 📝 Configure email (Gmail)
3. 📝 Configure WhatsApp (Twilio)
4. 📝 Set strong passwords
5. 📝 Deploy to VPS with Docker Compose
6. 📝 Set up automated backups
7. 📝 Configure HTTPS with Nginx

---

## 🎉 Features Working

- ✅ User authentication (JWT)
- ✅ Shop management
- ✅ Product catalog
- ✅ Shipment creation
- ✅ PDF generation
- ✅ Database persistence
- ✅ Role-based access
- ⏳ Email notifications (not configured)
- ⏳ WhatsApp notifications (not configured)

---

## 💾 Backup Reminder

**Create backups regularly:**
```bash
./manage-db.sh backup
```

Backups are saved as `backup_YYYYMMDD_HHMMSS.sql`

---

## 🔗 Useful Links

- PostgreSQL Docs: https://www.postgresql.org/docs/
- Spring Boot Docs: https://spring.io/projects/spring-boot
- Twilio (WhatsApp): https://www.twilio.com/whatsapp
- iText PDF: https://itextpdf.com/

---

## 📞 Support

Check logs when issues occur:
```bash
# Application logs
tail -f /tmp/bakery-app-prod.log

# Database logs
./manage-db.sh logs
```
