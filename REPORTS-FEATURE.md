# Report e Statistiche - Feature Documentation

## Panoramica

Sistema completo di reportistica e analisi per monitorare le attività di magazzino, spedizioni e resi con dashboard interattiva e funzionalità di export.

## Caratteristiche Principali

### 1. Dashboard Statistiche

La dashboard fornisce una vista d'insieme immediata con 4 card principali:

- **Spedizioni Totali**: Numero totale di spedizioni nel periodo
  - Breakdown per stato (Bozze, Confermate, Consegnate)
- **Valore Spedizioni**: Importo totale delle spedizioni
- **Resi Totali**: Numero totale di resi
  - Breakdown per stato (In Attesa, Approvati, Processati)
- **Ricavo Netto**: Differenza tra valore spedizioni e resi
  - Tasso di reso percentuale

### 2. Filtri Avanzati

- **Periodo**: Data inizio e data fine con datepicker integrato
- **Negozio**: Filtro per negozio specifico
- **Default**: Primo giorno del mese corrente - oggi

### 3. Report Spedizioni

Tabella dettagliata con:
- Numero spedizione
- Data spedizione
- Negozio destinazione
- Driver assegnato
- Stato spedizione
- Importo totale

Funzionalità:
- Ordinamento per colonna
- Ricerca full-text
- Paginazione
- Export CSV/Excel

### 4. Report Resi

Tabella dettagliata con:
- Numero reso
- Data reso
- Spedizione riferimento
- Negozio
- Stato reso
- Importo totale

Funzionalità:
- Ordinamento per colonna
- Ricerca full-text
- Paginazione
- Export CSV/Excel

## Architettura Backend

### Controller: `ReportController`

```java
@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
public class ReportController
```

### Endpoints API

#### 1. Dashboard Statistics
```
GET /api/reports/dashboard?startDate={date}&endDate={date}
```

Risposta:
```json
{
  "totalShipments": 150,
  "draftShipments": 5,
  "confirmedShipments": 100,
  "deliveredShipments": 45,
  "totalShipmentsValue": 15000.00,
  "totalReturns": 10,
  "pendingReturns": 3,
  "approvedReturns": 5,
  "processedReturns": 2,
  "totalReturnsValue": 500.00,
  "netRevenue": 14500.00,
  "returnRate": "6.67",
  "startDate": "2026-01-01",
  "endDate": "2026-01-20"
}
```

#### 2. Shipments Report
```
GET /api/reports/shipments?startDate={date}&endDate={date}&shopId={id}&driverId={id}
```

Risposta:
```json
{
  "shipments": [...],
  "totalValue": 15000.00,
  "totalCount": 150,
  "startDate": "2026-01-01",
  "endDate": "2026-01-20",
  "shopId": null,
  "driverId": null
}
```

#### 3. Returns Report
```
GET /api/reports/returns?startDate={date}&endDate={date}&shopId={id}
```

Risposta:
```json
{
  "returns": [...],
  "totalValue": 500.00,
  "totalCount": 10,
  "startDate": "2026-01-01",
  "endDate": "2026-01-20",
  "shopId": null
}
```

## Frontend

### Pagina: `reports.html`

Interfaccia utente completa con:
- Navbar con menu di navigazione
- Card filtri
- Dashboard con 4 statistiche principali
- Tab per report spedizioni e resi
- Tabelle DataTables con ricerca e paginazione

### JavaScript: `reports.js`

Funzioni principali:
- `loadDashboard()`: Carica statistiche dashboard
- `loadShipmentsReport()`: Carica report spedizioni
- `loadReturnsReport()`: Carica report resi
- `exportShipmentsReport()`: Export CSV spedizioni
- `exportReturnsReport()`: Export CSV resi

## Permessi e Sicurezza

### Backend
- Accesso limitato a ruoli: **ADMIN** e **ACCOUNTANT**
- Annotation `@PreAuthorize` su controller

### Frontend
- Verifica permessi in `checkReportsPermission()`
- Menu "Report" visibile solo per ADMIN e ACCOUNTANT
- Redirect automatico se utente non autorizzato

## Export Dati

### Formato CSV
- Encoding UTF-8
- Campi tra virgolette
- Separatore virgola
- Nome file con periodo: `spedizioni_2026-01-01_2026-01-20.csv`

### Contenuto Export

**Spedizioni:**
```csv
Numero,Data,Negozio,Driver,Stato,Importo Totale
"SHP-20260120-12345","20/01/2026","001 - Negozio Centro","Mario Rossi","Consegnata","€ 150.00"
```

**Resi:**
```csv
Numero,Data,Spedizione,Negozio,Stato,Importo Totale
"RET-20260120-67890","20/01/2026","SHP-20260120-12345","001 - Negozio Centro","Approvato","€ 25.00"
```

## Tecnologie Utilizzate

### Backend
- Spring Boot
- Spring Security
- JPA/Hibernate
- Stream API Java

### Frontend
- Bootstrap 5.3.0
- jQuery 3.7.1
- DataTables 1.13.7
- Bootstrap Datepicker 1.10.0
- Chart.js ready (futura integrazione grafici)

## Integrazioni

### DataTables
- Localizzazione italiana
- Ricerca real-time
- Ordinamento multi-colonna
- Paginazione configurabile (10, 25, 50, 100 righe)

### Bootstrap Datepicker
- Calendario italiano
- Formato data: YYYY-MM-DD
- Highlight data corrente
- Auto-chiusura

## Calcoli e Logica di Business

### Valore Totale Spedizioni
```java
BigDecimal totalShipmentsValue = shipments.stream()
    .flatMap(s -> s.getItems().stream())
    .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
    .reduce(BigDecimal.ZERO, BigDecimal::add);
```

### Valore Totale Resi
```java
BigDecimal totalReturnsValue = returns.stream()
    .flatMap(r -> r.getItems().stream())
    .map(item -> item.getTotalAmount() != null ? item.getTotalAmount() : BigDecimal.ZERO)
    .reduce(BigDecimal.ZERO, BigDecimal::add);
```

### Ricavo Netto
```java
BigDecimal netRevenue = totalShipmentsValue.subtract(totalReturnsValue);
```

### Tasso di Reso
```java
double returnRate = totalShipments > 0 ? (totalReturns * 100.0 / totalShipments) : 0.0;
```

## User Experience

### Responsive Design
- Layout mobile-first
- Card responsive per dashboard
- Tabelle scrollabili su mobile
- Filtri impilati su schermi piccoli

### Performance
- Caricamento lazy dei dati
- DataTables con paginazione server-side ready
- Caching browser per risorse statiche

### Accessibilità
- Label semantici su form
- Icone con tooltip
- Contrasto colori WCAG AA
- Navigazione da tastiera

## Roadmap Future

### Versione 1.7.0 (Proposta)
- [ ] Grafici interattivi con Chart.js
  - Andamento spedizioni nel tempo
  - Distribuzione resi per motivo
  - Top 10 negozi per volume
- [ ] Export PDF con grafici
- [ ] Export Excel formattato (XLSX)
- [ ] Filtri avanzati:
  - Range prodotti
  - Status multipli
  - Driver multipli
- [ ] Report schedulati via email
- [ ] Comparazione periodi
- [ ] KPI personalizzabili
- [ ] Dashboard widgets drag-and-drop

### Versione 1.8.0 (Proposta)
- [ ] Report prodotti più venduti
- [ ] Report margini per negozio
- [ ] Analisi trend stagionali
- [ ] Forecast basato su storico
- [ ] Alert automatici per anomalie

## Testing

### Test Consigliati

1. **Test Permessi**
   - Accesso con ADMIN
   - Accesso con ACCOUNTANT
   - Accesso negato per DRIVER/SHOP

2. **Test Filtri**
   - Filtro per periodo
   - Filtro per negozio
   - Reset filtri

3. **Test Export**
   - Export CSV spedizioni
   - Export CSV resi
   - Verifica encoding UTF-8
   - Verifica formato campi

4. **Test Responsive**
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

## Troubleshooting

### Problema: Dati non caricati
- Verificare token JWT valido
- Controllare console browser per errori API
- Verificare permessi utente

### Problema: Export non funziona
- Verificare popup blocker
- Controllare permessi download browser
- Verificare dati in tabella

### Problema: Datepicker in inglese
- Verificare caricamento libreria localization
- Controllare import `bootstrap-datepicker.it.min.js`

## Conclusione

Il sistema di report fornisce una soluzione completa per l'analisi e il monitoraggio delle attività di magazzino, con un'interfaccia intuitiva e funzionalità di export per analisi esterne.

---

**Versione**: 1.6.0
**Data**: 2026-01-20
**Autore**: Claude Code
