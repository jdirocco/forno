#!/bin/bash

# Bakery Warehouse - PostgreSQL Database Management Script

CONTAINER_NAME="bakery-postgres"
DB_NAME="bakery_warehouse"
DB_USER="bakery_user"
DB_PASSWORD="bakery123"
DB_PORT="5433"

case "$1" in
  start)
    echo "Starting PostgreSQL container..."
    docker start $CONTAINER_NAME 2>/dev/null || \
    docker run -d \
      --name $CONTAINER_NAME \
      -e POSTGRES_DB=$DB_NAME \
      -e POSTGRES_USER=$DB_USER \
      -e POSTGRES_PASSWORD=$DB_PASSWORD \
      -p $DB_PORT:5432 \
      -v bakery-postgres-data:/var/lib/postgresql/data \
      postgres:15-alpine
    echo "PostgreSQL started on port $DB_PORT"
    ;;

  stop)
    echo "Stopping PostgreSQL container..."
    docker stop $CONTAINER_NAME
    echo "PostgreSQL stopped"
    ;;

  restart)
    echo "Restarting PostgreSQL container..."
    docker restart $CONTAINER_NAME
    echo "PostgreSQL restarted"
    ;;

  status)
    docker ps -a | grep $CONTAINER_NAME
    ;;

  logs)
    docker logs -f $CONTAINER_NAME
    ;;

  shell)
    docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
    ;;

  backup)
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "Creating backup: $BACKUP_FILE"
    docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE
    echo "Backup created: $BACKUP_FILE"
    ;;

  restore)
    if [ -z "$2" ]; then
      echo "Usage: $0 restore <backup_file.sql>"
      exit 1
    fi
    echo "Restoring from: $2"
    docker exec -i $CONTAINER_NAME psql -U $DB_USER $DB_NAME < $2
    echo "Restore completed"
    ;;

  stats)
    echo "=== Database Statistics ==="
    docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "
      SELECT 'Users' as table_name, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'Shops', COUNT(*) FROM shops
      UNION ALL
      SELECT 'Products', COUNT(*) FROM products
      UNION ALL
      SELECT 'Shipments', COUNT(*) FROM shipments
      UNION ALL
      SELECT 'Shipment Items', COUNT(*) FROM shipment_items;
    "
    ;;

  clean)
    echo "WARNING: This will delete ALL data in the database!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "
        TRUNCATE TABLE shipment_items CASCADE;
        TRUNCATE TABLE shipments CASCADE;
        TRUNCATE TABLE products CASCADE;
        TRUNCATE TABLE shops CASCADE;
        TRUNCATE TABLE users CASCADE;
      "
      echo "Database cleaned"
    else
      echo "Cancelled"
    fi
    ;;

  remove)
    echo "WARNING: This will remove the container AND all data!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      docker stop $CONTAINER_NAME 2>/dev/null
      docker rm $CONTAINER_NAME 2>/dev/null
      docker volume rm bakery-postgres-data 2>/dev/null
      echo "Container and data removed"
    else
      echo "Cancelled"
    fi
    ;;

  *)
    echo "Bakery Warehouse - Database Management"
    echo ""
    echo "Usage: $0 {command}"
    echo ""
    echo "Commands:"
    echo "  start    - Start PostgreSQL container"
    echo "  stop     - Stop PostgreSQL container"
    echo "  restart  - Restart PostgreSQL container"
    echo "  status   - Show container status"
    echo "  logs     - Show container logs (follow mode)"
    echo "  shell    - Open psql shell"
    echo "  backup   - Create database backup"
    echo "  restore  - Restore database from backup file"
    echo "  stats    - Show database statistics"
    echo "  clean    - Remove all data (keep structure)"
    echo "  remove   - Remove container and all data"
    echo ""
    echo "Connection Info:"
    echo "  Host: localhost"
    echo "  Port: $DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Password: $DB_PASSWORD"
    ;;
esac
