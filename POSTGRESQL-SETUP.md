# PostgreSQL Database Setup

Your bakery warehouse application is now using a containerized PostgreSQL database for persistent data storage.

## Database Information

- **Container Name**: `bakery-postgres`
- **Database**: `bakery_warehouse`
- **User**: `bakery_user`
- **Password**: `bakery123`
- **Port**: `5433` (host) → `5432` (container)
- **Volume**: `bakery-postgres-data` (persistent storage)

## Current Setup

✅ PostgreSQL container is running
✅ Application connected to PostgreSQL
✅ All tables created automatically
✅ Data persists across application restarts

### Database Contents

```
Users:          2 (admin, driver1)
Shops:          2 (Milano, Roma)
Products:       4 (Pane, Baguette, Cornetti, Pizza)
Shipments:      1 (with 3 items)
```

## Managing the Database

Use the provided management script:

```bash
./manage-db.sh [command]
```

### Available Commands

**Container Management:**
- `start` - Start PostgreSQL container
- `stop` - Stop PostgreSQL container
- `restart` - Restart PostgreSQL container
- `status` - Show container status
- `logs` - Show container logs (follow mode)

**Database Operations:**
- `shell` - Open PostgreSQL interactive shell
- `stats` - Show database statistics (row counts)
- `backup` - Create database backup (SQL file)
- `restore <file>` - Restore from backup file
- `clean` - Remove all data (keeps structure)
- `remove` - Remove container and all data (⚠️ destructive)

### Examples

**View database statistics:**
```bash
./manage-db.sh stats
```

**Access database shell:**
```bash
./manage-db.sh shell
# Then run SQL commands:
SELECT * FROM shops;
\dt        # List tables
\q         # Quit
```

**Create backup:**
```bash
./manage-db.sh backup
# Creates: backup_YYYYMMDD_HHMMSS.sql
```

**Restore from backup:**
```bash
./manage-db.sh restore backup_20260119_102730.sql
```

**View logs:**
```bash
./manage-db.sh logs
```

## Direct Database Access

### Using psql (from host):
```bash
docker exec -it bakery-postgres psql -U bakery_user -d bakery_warehouse
```

### Using DBeaver/DataGrip:
- **Host**: localhost
- **Port**: 5433
- **Database**: bakery_warehouse
- **User**: bakery_user
- **Password**: bakery123

### Connection URL:
```
jdbc:postgresql://localhost:5433/bakery_warehouse
```

## Application Profiles

The application now runs with the `prod` profile:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

**Development (H2)**: `-Dspring-boot.run.profiles=dev`
**Production (PostgreSQL)**: `-Dspring-boot.run.profiles=prod`

## Data Persistence

✅ **Container restarts**: Data persists (stored in volume)
✅ **Application restarts**: Data persists
✅ **System reboots**: Container auto-restarts (if configured)

To ensure container starts on boot:
```bash
docker update --restart unless-stopped bakery-postgres
```

## Backup Strategy

### Automatic Backups (Recommended)

Create a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /Users/juridirocco/Desktop/mucci/bakery-warehouse && ./manage-db.sh backup
```

### Manual Backups

**Before important changes:**
```bash
./manage-db.sh backup
```

**Before updates:**
```bash
./manage-db.sh backup
# Then update application
```

## Troubleshooting

### Container not starting
```bash
# Check if port is available
lsof -i :5433

# Check container logs
./manage-db.sh logs

# Restart container
./manage-db.sh restart
```

### Connection refused
```bash
# Check container is running
./manage-db.sh status

# Check application.yml has correct settings
cat src/main/resources/application-prod.yml
```

### Database corruption
```bash
# Restore from backup
./manage-db.sh restore backup_file.sql
```

### Reset everything
```bash
# Remove container and data
./manage-db.sh remove

# Start fresh
./manage-db.sh start

# Restart application to recreate tables
```

## Migration from H2 to PostgreSQL

If you have data in H2 (dev mode) and want to migrate to PostgreSQL:

1. Export data from H2:
   - Start app in dev mode
   - Use API to export data (or manual SQL export)

2. Import to PostgreSQL:
   - Start app in prod mode
   - Use API to import data
   - Or use SQL restore

## Security Notes

⚠️ **For Production Deployment:**

1. **Change default password:**
   ```bash
   # Stop container
   ./manage-db.sh stop

   # Remove and recreate with new password
   ./manage-db.sh remove

   # Edit manage-db.sh and update DB_PASSWORD
   # Then start again
   ./manage-db.sh start
   ```

2. **Don't expose port publicly**
   - Current setup: localhost only (safe)
   - For remote access: Use SSH tunnel or VPN

3. **Enable SSL/TLS** (for production)

4. **Regular backups** (automated)

5. **Monitor disk space:**
   ```bash
   docker system df -v
   ```

## PostgreSQL vs H2

| Feature | H2 (dev) | PostgreSQL (prod) |
|---------|----------|-------------------|
| Data persistence | ❌ Lost on restart | ✅ Persistent |
| Performance | Fast (in-memory) | Fast (on disk) |
| Production-ready | ❌ No | ✅ Yes |
| Backup | ❌ Difficult | ✅ Easy |
| Concurrent users | Limited | Excellent |
| Data integrity | Basic | Advanced |

## Next Steps

1. ✅ PostgreSQL is running
2. ✅ Application connected
3. ✅ Test data created
4. 📝 Configure automated backups
5. 📝 Set up monitoring
6. 📝 Update password for production
7. 📝 Configure email/WhatsApp (optional)
8. 📝 Deploy to VPS (when ready)

## Useful SQL Queries

```sql
-- View all shops
SELECT * FROM shops;

-- View all shipments with shop info
SELECT s.id, s.shipment_number, s.status, sh.name as shop_name
FROM shipments s
JOIN shops sh ON s.shop_id = sh.id;

-- View shipment items with details
SELECT si.*, p.name as product_name, p.unit_price
FROM shipment_items si
JOIN products p ON si.product_id = p.id;

-- Count records
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM shops) as shops,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM shipments) as shipments;
```

## Support

For issues with PostgreSQL:
- Check logs: `./manage-db.sh logs`
- Check status: `./manage-db.sh status`
- PostgreSQL docs: https://www.postgresql.org/docs/
