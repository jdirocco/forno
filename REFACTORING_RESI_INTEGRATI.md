# 🔄 Refactoring: Resi Integrati nella Spedizione

## Data: 2026-01-20

Grande ristrutturazione del sistema di gestione resi. I resi non sono più un'entità separata ma fanno parte integrante della spedizione.

---

## 📋 Obiettivi del Refactoring

### Prima (Sistema Vecchio):
- ❌ Entità `Return` separata con propria tabella
- ❌ `ReturnItem` collegato a `Return`
- ❌ Workflow complesso: creare reso → approvare → processare
- ❌ Resi separati dalle spedizioni

### Dopo (Sistema Nuovo):
- ✅ Resi integrati direttamente nella `Shipment`
- ✅ `ShipmentItem` può essere di tipo `SHIPMENT` o `RETURN`
- ✅ Workflow semplificato: aggiungere resi durante la consegna
- ✅ Un'unica entità contiene prodotti spediti e resi

---

## 🏗️ Modifiche al Database

### 1. Tabella `shipment_items`

**Nuove colonne aggiunte:**
```sql
ALTER TABLE shipment_items ADD COLUMN item_type VARCHAR(20) DEFAULT 'SHIPMENT' NOT NULL;
ALTER TABLE shipment_items ADD COLUMN return_reason VARCHAR(50);
```

**Valori possibili per `item_type`:**
- `SHIPMENT` - Prodotto spedito
- `RETURN` - Prodotto reso

**Valori possibili per `return_reason`:**
- `DAMAGED` - Danneggiato durante il trasporto
- `EXPIRED` - Prodotto scaduto
- `WRONG_PRODUCT` - Prodotto errato
- `EXCESS_QUANTITY` - Quantità eccessiva
- `QUALITY_ISSUE` - Problema di qualità
- `OTHER` - Altro motivo

### 2. Tabella `shipments`

**Nuove colonne aggiunte:**
```sql
ALTER TABLE shipments ADD COLUMN return_date DATE;
ALTER TABLE shipments ADD COLUMN return_notes TEXT;
```

### 3. Tabelle Rimosse

```sql
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
```

---

## 🔧 Modifiche al Backend

### 1. Entity: ShipmentItem.java

**Path:** `src/main/java/com/bakery/warehouse/entity/ShipmentItem.java`

**Aggiunti nuovi campi e enums:**

```java
@Enumerated(EnumType.STRING)
@Column(nullable = false)
private ItemType itemType = ItemType.SHIPMENT;

@Enumerated(EnumType.STRING)
private ReturnReason returnReason;

public enum ItemType {
    SHIPMENT,   // Regular shipment item
    RETURN      // Return item
}

public enum ReturnReason {
    DAMAGED,            // Damaged during transport
    EXPIRED,            // Product expired
    WRONG_PRODUCT,      // Wrong product delivered
    EXCESS_QUANTITY,    // More than ordered
    QUALITY_ISSUE,      // Quality not acceptable
    OTHER               // Other reason (see notes)
}
```

### 2. Entity: Shipment.java

**Path:** `src/main/java/com/bakery/warehouse/entity/Shipment.java`

**Aggiunti campi per informazioni resi:**

```java
private LocalDate returnDate;
private String returnNotes;
```

### 3. DTO: ShipmentRequest.java

**Path:** `src/main/java/com/bakery/warehouse/dto/ShipmentRequest.java`

**Aggiunti campi per gestire resi:**

```java
private LocalDate returnDate;
private String returnNotes;
private List<ShipmentItemRequest> returnItems;

// In ShipmentItemRequest
private String itemType;  // "SHIPMENT" or "RETURN"
private String returnReason;  // For return items
```

### 4. Controller: ShipmentController.java

**Path:** `src/main/java/com/bakery/warehouse/controller/ShipmentController.java`

**Nuovi endpoint aggiunti:**

```java
// Update entire shipment (including items and returns)
@PutMapping("/{id}")
@PreAuthorize("hasAnyRole('ADMIN', 'DRIVER')")
public ResponseEntity<Shipment> updateShipment(@PathVariable Long id, @RequestBody ShipmentRequest request)

// Add return items to existing shipment
@PostMapping("/{id}/returns")
@PreAuthorize("hasAnyRole('ADMIN', 'DRIVER')")
public ResponseEntity<Shipment> addReturnItems(@PathVariable Long id, @RequestBody List<ShipmentRequest.ShipmentItemRequest> returnItems)
```

### 5. Service: ShipmentService.java

**Path:** `src/main/java/com/bakery/warehouse/service/ShipmentService.java`

**Nuovi metodi aggiunti:**

```java
@Transactional
public Shipment updateShipment(Long id, ShipmentRequest request) {
    // Updates shipment fields, items, and return items
    // Can replace or add items and returns
}

@Transactional
public Shipment addReturnItems(Long shipmentId, List<ShipmentRequest.ShipmentItemRequest> returnItems) {
    // Adds return items to an existing shipment
    // Used by drivers during delivery
}
```

### 6. File Rimossi

- ❌ `Return.java` (entity)
- ❌ `ReturnItem.java` (entity)
- ❌ `ReturnController.java`
- ❌ `ReturnService.java`
- ❌ `ReturnRepository.java`
- ❌ `ReturnRequest.java` (DTO)

---

## 💻 Modifiche al Frontend

### 1. File: app.js

**Path:** `src/main/resources/static/js/app.js`

**Funzione `viewShipment(id)` completamente riscritta:**

```javascript
async function viewShipment(id) {
    // Recupera spedizione
    const shipment = await apiCall(`/shipments/${id}`);

    // Separa items di spedizione da items di reso
    const shipmentItems = (shipment.items || []).filter(item => item.itemType === 'SHIPMENT');
    const returnItems = (shipment.items || []).filter(item => item.itemType === 'RETURN');

    // Calcola totali
    const shipmentTotal = shipmentItems.reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0);
    const returnTotal = returnItems.reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0);
    const netTotal = shipmentTotal - returnTotal;

    // Mostra:
    // - Prodotti spediti con totale
    // - Prodotti resi con motivo e totale
    // - Totale netto (Spedizione - Resi)
}
```

**Nuove funzioni aggiunte:**

```javascript
// Mostra modal per aggiungere prodotti al reso
async function showAddReturnItemsModal(shipmentId)

// Toggle visualizzazione dettagli prodotto reso
function toggleReturnItem(index)

// Salva i prodotti resi
async function saveReturnItems(shipmentId, itemCount)
```

**Funzioni già esistenti utilizzate:**
- `translateReturnReason(reason)` - Traduce motivo reso in italiano
- `translateReturnStatus(status)` - Traduce stato reso (ora non più necessario)

### 2. File: index.html

**Path:** `src/main/resources/static/index.html`

**Aggiunto nuovo modal:**

```html
<!-- Add Return Items Modal -->
<div class="modal fade" id="addReturnItemsModal" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="bi bi-arrow-return-left"></i> Aggiungi Resi
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="addReturnItemsBody"></div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
            </div>
        </div>
    </div>
</div>
```

---

## 🔄 Nuovo Workflow Operativo

### Scenario: Creazione e Gestione Spedizione con Resi

#### 1. Creazione Spedizione (Stato: BOZZA)
- **Utente:** Admin o Commercialista
- **Azioni:**
  - Seleziona negozio
  - Assegna autista (portantino)
  - Aggiunge prodotti
  - Salva bozza

#### 2. Conferma Spedizione (Stato: IN_CONSEGNA)
- **Utente:** Admin o Commercialista
- **Azioni:**
  - Conferma spedizione
  - PDF generato automaticamente
  - Email/WhatsApp inviati
  - Stato passa a `IN_CONSEGNA`

#### 3. Consegna e Gestione Resi (Durante la consegna)
- **Utente:** Autista o Admin
- **Azioni:**
  - Apre dettaglio spedizione
  - Clicca "Aggiungi Resi"
  - Seleziona prodotti da restituire
  - Per ogni prodotto:
    - Specifica quantità reso
    - Seleziona motivo reso
    - Aggiunge note opzionali
  - Salva resi

**I resi vengono aggiunti come `ShipmentItem` con `itemType = 'RETURN'`**

#### 4. Consegna Completata (Stato: CONSEGNATA)
- **Utente:** Autista o Admin
- **Azioni:**
  - Cambia stato a `CONSEGNATA`
  - Email automatica con PDF inviata
  - Spedizione chiusa

#### 5. Visualizzazione Dettagli
- **Tutti gli utenti autorizzati possono vedere:**
  - Tabella prodotti spediti con totale
  - Tabella prodotti resi con motivo e totale
  - **Totale Netto = Spedizione - Resi**

---

## 📊 Vantaggi del Nuovo Sistema

### 1. Semplicità
- ✅ Un'unica entità per spedizioni e resi
- ✅ Meno tabelle nel database
- ✅ Workflow più lineare

### 2. Performance
- ✅ Meno query al database
- ✅ Dati sempre consistenti
- ✅ Nessuna sincronizzazione necessaria

### 3. Usabilità
- ✅ Resi visibili immediatamente nella spedizione
- ✅ Calcolo automatico del netto
- ✅ Tracciabilità completa

### 4. Manutenibilità
- ✅ Meno codice da mantenere
- ✅ Logica più chiara
- ✅ Meno endpoint API

---

## 🗄️ Migrazione dei Dati Esistenti

### Script di Migrazione

**File:** `migrate_returns_to_shipments.sql`

**Cosa fa:**

1. Aggiunge colonne `item_type` e `return_reason` a `shipment_items`
2. Aggiunge colonne `return_date` e `return_notes` a `shipments`
3. Migra i dati esistenti da `return_items` a `shipment_items` con `itemType = 'RETURN'`
4. Copia date e note resi da `returns` a `shipments`
5. Elimina le tabelle `return_items` e `returns`

**Esecuzione:**

```bash
# Opzione 1: Via Docker
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -f /tmp/migrate_returns_to_shipments.sql

# Opzione 2: Copiare e eseguire
docker cp migrate_returns_to_shipments.sql bakery-postgres:/tmp/
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -f /tmp/migrate_returns_to_shipments.sql
```

**Query di Verifica:**

```sql
-- Conta resi migrati
SELECT COUNT(*) FROM shipment_items WHERE item_type = 'RETURN';

-- Mostra spedizioni con resi
SELECT * FROM shipments WHERE return_date IS NOT NULL;

-- Dettaglio resi per spedizione
SELECT s.shipment_number, si.item_type, p.name, si.quantity, si.total_price
FROM shipments s
JOIN shipment_items si ON s.id = si.shipment_id
JOIN products p ON si.product_id = p.id
WHERE si.item_type = 'RETURN'
ORDER BY s.shipment_date DESC, s.id;
```

---

## 🚀 Deployment

### 1. Applicare Migrazione Database

```bash
cd /Users/juridirocco/Desktop/mucci/bakery-warehouse

# Copiare script nel container
docker cp migrate_returns_to_shipments.sql bakery-postgres:/tmp/

# Eseguire migrazione
docker exec bakery-postgres psql -U bakery_user -d bakery_warehouse -f /tmp/migrate_returns_to_shipments.sql
```

### 2. Ricompilare il Progetto

```bash
./mvnw clean package -DskipTests
```

### 3. Riavviare i Container

```bash
docker-compose down
docker-compose up -d --build
```

### 4. Verificare i Log

```bash
docker-compose logs -f app
```

---

## 🧪 Test Funzionalità

### Test 1: Creazione Spedizione con Resi
1. Login come admin
2. Crea nuova spedizione
3. Aggiungi prodotti
4. Conferma spedizione
5. Apri dettaglio
6. Clicca "Aggiungi Resi"
7. Seleziona prodotti da restituire
8. Specifica quantità e motivi
9. Salva
10. Verifica che nella tabella appaiano sia prodotti che resi
11. Verifica calcolo totale netto

### Test 2: Visualizzazione Dettagli
1. Apri una spedizione con resi
2. Verifica tabella prodotti spediti
3. Verifica tabella resi con motivi
4. Verifica totali corretti

### Test 3: Modifica Spedizione
1. Modifica una spedizione esistente
2. Aggiungi/Rimuovi prodotti
3. Aggiungi resi
4. Salva
5. Verifica persistenza dati

### Test 4: Permessi
1. Test con utente DRIVER
   - Può visualizzare spedizioni assegnate
   - Può aggiungere resi
   - Può cambiare stato
2. Test con utente SHOP
   - Vede solo proprie spedizioni
   - Vede dettagli con resi
3. Test con utente ADMIN
   - Accesso completo

---

## 📁 File Modificati/Creati

### Backend (Java)
1. ✅ `ShipmentItem.java` - Aggiunto itemType e returnReason
2. ✅ `Shipment.java` - Aggiunti returnDate e returnNotes
3. ✅ `ShipmentRequest.java` - Aggiunti campi per gestione resi
4. ✅ `ShipmentController.java` - Nuovi endpoint per update e addReturns
5. ✅ `ShipmentService.java` - Nuovi metodi updateShipment e addReturnItems
6. ❌ Rimossi: Return.java, ReturnItem.java, ReturnController.java, ReturnService.java, ReturnRepository.java, ReturnRequest.java

### Frontend (HTML/JS)
1. ✅ `app.js` - Riscritta viewShipment e aggiunte funzioni per gestione resi
2. ✅ `index.html` - Aggiunto modal addReturnItemsModal

### Database
1. ✅ `migrate_returns_to_shipments.sql` - Script di migrazione

### Documentazione
1. ✅ `REFACTORING_RESI_INTEGRATI.md` - Questo documento

---

## ✅ Checklist Completamento

- [x] Aggiunti campi itemType e returnReason a ShipmentItem
- [x] Aggiunti campi returnDate e returnNotes a Shipment
- [x] Aggiornato ShipmentRequest DTO
- [x] Creati nuovi endpoint updateShipment e addReturnItems
- [x] Implementati metodi nel ShipmentService
- [x] Rimossi file Return/ReturnItem/Controller/Service
- [x] Riscritta funzione viewShipment per mostrare resi integrati
- [x] Aggiunte funzioni per modal resi
- [x] Aggiunto modal addReturnItemsModal in index.html
- [x] Creato script migrazione database
- [ ] **Applicare migrazione database**
- [ ] **Ricompilare progetto**
- [ ] **Riavviare container**
- [ ] **Test funzionalità**
- [ ] **Aggiornare reports page (prossimo step)**
- [ ] **Aggiungere Excel export (prossimo step)**
- [ ] **Aggiungere Chart.js (prossimo step)**

---

## 🔮 Prossimi Passi

### 1. Reports Page Enhancement
- Aggiungere colonne: N° Prodotti, Totale Prodotti, N° Resi, Totale Resi
- Filtro stato con multi-select
- Righe cliccabili per aprire dettaglio
- Rimuovere tabella resi separata

### 2. Excel Export
- Libreria SheetJS/XLSX
- Export dati filtrati
- Include prodotti e resi

### 3. Chart.js Integration
- Grafici a barre per totali mensili/settimanali/annuali
- Rispetta filtri applicati
- Mostra: Totale Spedizioni, Totale Resi, Netto

---

**Versione:** 3.0.0
**Data Refactoring:** 2026-01-20
**Developer:** Claude Code Assistant

