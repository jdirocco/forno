# 🚀 Istruzioni di Deployment - Sistema Resi Integrati

## Data: 2026-01-20

Questa guida contiene le istruzioni passo-passo per applicare il refactoring del sistema resi integrati.

---

## ⚠️ IMPORTANTE - Backup

Prima di procedere, eseguire **SEMPRE** un backup del database:

```bash
# Backup del database
docker exec bakery-postgres pg_dump -U bakery_user bakery_warehouse > backup_$(date +%Y%m%d_%H%M%S).sql

# In caso di necessità, ripristinare con:
# docker exec -i bakery-postgres psql -U bakery_user bakery_warehouse < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📋 Checklist Pre-Deployment

- [ ] Backup database eseguito
- [ ] Container Docker attivi (`docker ps`)
- [ ] Accesso al database PostgreSQL verificato
- [ ] Progetto compilato con successo
- [ ] File JAR generato in `target/warehouse-1.0.0.jar`

---

## 🔧 Passo 1: Applicare la Migrazione Database

### Opzione A: Via Docker (Consigliata)

```bash
# 1. Copiare lo script di migrazione nel container PostgreSQL
docker cp /Users/juridirocco/Desktop/mucci/bakery-warehouse/migrate_returns_to_shipments.sql bakery-postgres:/tmp/

# 2. Eseguire la migrazione
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -f /tmp/migrate_returns_to_shipments.sql

# 3. Verificare la migrazione
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "SELECT COUNT(*) as resi_migrati FROM shipment_items WHERE item_type = 'RETURN';"
```

### Opzione B: Comando Diretto

```bash
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "
BEGIN;

-- Add new columns to shipment_items
ALTER TABLE shipment_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'SHIPMENT' NOT NULL;
ALTER TABLE shipment_items ADD COLUMN IF NOT EXISTS return_reason VARCHAR(50);

-- Add new columns to shipments
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS return_date DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS return_notes TEXT;

-- Migrate existing return data (if any)
INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_price, total_price, item_type, return_reason, notes)
SELECT
    r.shipment_id,
    ri.product_id,
    ri.quantity,
    ri.unit_price,
    ri.total_amount,
    'RETURN',
    ri.reason,
    ri.notes
FROM return_items ri
JOIN returns r ON ri.return_id = r.id
WHERE r.status != 'CANCELLED'
ON CONFLICT DO NOTHING;

-- Update shipments with return dates
UPDATE shipments s
SET return_date = r.return_date,
    return_notes = r.notes
FROM returns r
WHERE s.id = r.shipment_id
  AND r.status != 'CANCELLED'
  AND r.return_date IS NOT NULL;

-- Drop old tables
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS returns CASCADE;

COMMIT;
"
```

### Verificare il Successo della Migrazione

```bash
# 1. Verificare che le nuove colonne esistano
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "\d shipment_items"

# 2. Verificare che le vecchie tabelle siano state eliminate
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "\dt" | grep -i return

# 3. Contare i resi migrati (se ce n'erano)
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "SELECT COUNT(*) FROM shipment_items WHERE item_type = 'RETURN';"

# 4. Visualizzare esempi di dati migrati
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "
SELECT s.shipment_number, si.item_type, p.name, si.quantity, si.total_price
FROM shipments s
JOIN shipment_items si ON s.id = si.shipment_id
JOIN products p ON si.product_id = p.id
WHERE si.item_type = 'RETURN'
LIMIT 5;
"
```

---

## 📦 Passo 2: Riavviare i Container Docker

```bash
cd /Users/juridirocco/Desktop/mucci/bakery-warehouse

# 1. Fermare i container
docker-compose down

# 2. Riavviare con rebuild
docker-compose up -d --build

# 3. Verificare che i container siano attivi
docker-compose ps

# Dovresti vedere:
# NAME                    STATUS
# bakery-app             Up
# bakery-postgres        Up
```

---

## 📊 Passo 3: Verificare i Log

```bash
# Visualizzare i log dell'applicazione
docker-compose logs -f app

# Cercare messaggi di errore:
# - ✅ "Started BakeryWarehouseApplication" = OK
# - ❌ Exception o Error = PROBLEMA
```

**Se vedi errori:**
1. Verificare che la migrazione database sia andata a buon fine
2. Controllare che tutte le colonne siano state aggiunte correttamente
3. Verificare i permessi del database

---

## 🧪 Passo 4: Test Funzionalità

### Test 1: Accesso all'Applicazione

```bash
# Verificare che l'applicazione risponda
curl -I http://localhost:8080

# Dovrebbe rispondere: HTTP/1.1 200 OK o redirect to login
```

### Test 2: Login e Navigazione

1. Aprire browser: `http://localhost:8080`
2. Login come admin
3. Verificare che il menu appaia correttamente
4. Navigare in "Spedizioni"

### Test 3: Visualizzare Spedizione

1. Aprire una spedizione esistente
2. Verificare che si veda:
   - Tabella prodotti spediti
   - Sezione resi (anche se vuota)
   - Totale netto
3. **Non** dovrebbero esserci errori JavaScript in console

### Test 4: Creare Nuova Spedizione

1. Cliccare "Nuova Spedizione"
2. Selezionare negozio
3. Assegnare autista
4. Aggiungere prodotti
5. Salvare
6. Confermare spedizione
7. Verificare generazione PDF

### Test 5: Aggiungere Resi

1. Aprire spedizione confermata (stato: IN_CONSEGNA o CONSEGNATA)
2. Cliccare "Aggiungi Resi"
3. Selezionare prodotti da restituire
4. Specificare quantità e motivo
5. Salvare
6. Verificare che i resi appaiano nella spedizione
7. Verificare calcolo totale netto

### Test 6: Report

1. Navigare in "Report"
2. Verificare che i report si carichino senza errori
3. Controllare che i totali siano corretti
4. Verificare filtri per date

---

## 🔍 Diagnostica Problemi Comuni

### Problema: Applicazione non si avvia

**Sintomi:**
- Container `bakery-app` in stato `Exited` o `Restarting`

**Soluzione:**
```bash
# Visualizzare i log
docker-compose logs app

# Verificare connessione database
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "SELECT 1;"

# Ricostruire immagine
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Problema: Errore "column does not exist"

**Sintomi:**
- Errore SQL: `ERROR: column "item_type" does not exist`

**Soluzione:**
```bash
# La migrazione non è stata applicata correttamente
# Eseguire nuovamente il Passo 1

# Verificare lo stato delle colonne
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "\d shipment_items"
```

### Problema: Frontend mostra errori JavaScript

**Sintomi:**
- Errori in Console Browser
- Modal non si apre
- Funzioni non definite

**Soluzione:**
```bash
# Pulire cache browser (Ctrl+Shift+R o Cmd+Shift+R)
# Verificare che app.js sia stato aggiornato correttamente

# Riavviare container per ricaricare static files
docker-compose restart app
```

### Problema: PDF non viene generato

**Sintomi:**
- PDF path è NULL
- Email non viene inviata

**Soluzione:**
```bash
# Verificare permessi directory PDF
docker exec bakery-app ls -la /app/pdfs

# Creare directory se non esiste
docker exec bakery-app mkdir -p /app/pdfs

# Riavviare
docker-compose restart app
```

---

## 📈 Monitoraggio Post-Deployment

### Verifiche da eseguire nelle prime 24 ore:

- [ ] Tutte le spedizioni esistenti sono visibili
- [ ] È possibile creare nuove spedizioni
- [ ] È possibile aggiungere resi
- [ ] I totali sono calcolati correttamente
- [ ] I report funzionano
- [ ] Le email vengono inviate
- [ ] I PDF vengono generati
- [ ] Gli utenti SHOP vedono solo i propri dati
- [ ] Gli autisti possono gestire le consegne

### Log da monitorare:

```bash
# Errori applicazione
docker-compose logs app | grep -i error

# Errori database
docker-compose logs postgres | grep -i error

# Attività recente
docker-compose logs --tail=100 -f
```

---

## 🔄 Rollback (In caso di problemi critici)

### Opzione 1: Ripristino Database

```bash
# 1. Fermare applicazione
docker-compose down

# 2. Ripristinare backup
docker exec -i bakery-postgres psql -U bakery_user bakery_warehouse < backup_YYYYMMDD_HHMMSS.sql

# 3. Riavviare con versione precedente
# (Se disponibile, usare JAR precedente)
```

### Opzione 2: Ripristino Completo

```bash
# 1. Fermare tutto
docker-compose down -v

# 2. Ripristinare da backup completo
# 3. Riavviare con versione stabile precedente
```

---

## ✅ Checklist Post-Deployment

- [ ] Migrazione database completata senza errori
- [ ] Applicazione avviata correttamente
- [ ] Login funzionante
- [ ] Spedizioni visualizzabili
- [ ] Possibile creare nuove spedizioni
- [ ] Possibile aggiungere resi
- [ ] Report accessibili
- [ ] Email/PDF funzionanti
- [ ] Permessi utenti corretti (ADMIN, SHOP, DRIVER, ACCOUNTANT)
- [ ] Performance accettabili
- [ ] Nessun errore nei log

---

## 📚 Documentazione Correlata

- [REFACTORING_RESI_INTEGRATI.md](./REFACTORING_RESI_INTEGRATI.md) - Dettagli tecnici del refactoring
- [CAMPO_NEGOZIO_UTENTI.md](./CAMPO_NEGOZIO_UTENTI.md) - Campo negozio per utenti
- [INTEGRAZIONE_COMPLETATA.md](./INTEGRAZIONE_COMPLETATA.md) - Funzionalità precedenti

---

## 🆘 Supporto

In caso di problemi:

1. Verificare i log: `docker-compose logs -f`
2. Controllare stato database: `docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -c "SELECT version();"`
3. Verificare connettività: `docker exec bakery-app curl -I http://localhost:8080`
4. Consultare documentazione tecnica in `REFACTORING_RESI_INTEGRATI.md`

---

## 🎯 Prossimi Sviluppi Pianificati

Dopo aver verificato che tutto funzioni correttamente, i prossimi sviluppi includono:

1. **Reports Avanzati:**
   - Aggiungere colonne: N° Prodotti, Totale Prodotti, N° Resi, Totale Resi
   - Filtro stato multi-select
   - Righe cliccabili per dettagli

2. **Export Excel:**
   - Libreria SheetJS/XLSX
   - Export dati filtrati

3. **Grafici Chart.js:**
   - Grafici a barre mensili/settimanali/annuali
   - Totali spedizioni, resi, netto

---

**Versione:** 3.0.0
**Data Deployment:** 2026-01-20
**Sistema:** Bakery Warehouse Management - Resi Integrati
**Developer:** Claude Code Assistant

