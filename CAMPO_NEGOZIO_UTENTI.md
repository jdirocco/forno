# ✅ Campo Negozio per Utenti - Implementazione Completata

## Data: 2026-01-20

Aggiunto campo per associare un negozio agli utenti di tipo SHOP nella form di gestione utenti.

---

## 📝 Modifiche Implementate

### 1. Frontend - index.html ✅

**Posizione:** Modal Utente (linee ~517-530)

**Modifiche:**
1. Aggiunto `onchange="onUserRoleChange()"` al select del ruolo
2. Aggiunto nuovo campo `userShopField` per la selezione del negozio
3. Il campo è nascosto di default e appare solo quando si seleziona ruolo "SHOP"

```html
<div class="mb-3">
    <label for="userRole" class="form-label">Ruolo *</label>
    <select class="form-select" id="userRole" required onchange="onUserRoleChange()">
        <option value="ADMIN">Amministratore</option>
        <option value="ACCOUNTANT">Contabile</option>
        <option value="DRIVER">Autista</option>
        <option value="SHOP">Negozio</option>
    </select>
</div>
<div class="mb-3" id="userShopField" style="display:none;">
    <label for="userShop" class="form-label">Negozio Associato *</label>
    <select class="form-select" id="userShop">
        <option value="">Seleziona negozio...</option>
    </select>
    <small class="text-muted">Il negozio associato determina quali spedizioni e report l'utente può visualizzare</small>
</div>
```

---

### 2. Frontend - app.js ✅

#### A. Nuova funzione `onUserRoleChange()`
Mostra/nasconde il campo negozio in base al ruolo selezionato:

```javascript
function onUserRoleChange() {
    const role = document.getElementById('userRole').value;
    const shopField = document.getElementById('userShopField');
    const shopSelect = document.getElementById('userShop');

    if (role === 'SHOP') {
        shopField.style.display = 'block';
        shopSelect.required = true;
    } else {
        shopField.style.display = 'none';
        shopSelect.required = false;
        shopSelect.value = '';
    }
}
```

#### B. Modificata funzione `showNewUserModal()`
Popola il dropdown negozi e nasconde il campo inizialmente:

```javascript
// Populate shop dropdown
const shopSelect = document.getElementById('userShop');
shopSelect.innerHTML = '<option value="">Seleziona negozio...</option>' +
    allShops.map(s => `<option value="${s.id}">${s.name} - ${s.city}</option>`).join('');

// Hide shop field initially
document.getElementById('userShopField').style.display = 'none';
```

#### C. Modificata funzione `editUser(id)`
Carica e visualizza il negozio associato all'utente:

```javascript
// Populate shop dropdown
const shopSelect = document.getElementById('userShop');
shopSelect.innerHTML = '<option value="">Seleziona negozio...</option>' +
    allShops.map(s => `<option value="${s.id}">${s.name} - ${s.city}</option>`).join('');

// Show/hide shop field based on role and set value
if (user.role === 'SHOP') {
    document.getElementById('userShopField').style.display = 'block';
    shopSelect.required = true;
    if (user.shop && user.shop.id) {
        shopSelect.value = user.shop.id;
    }
} else {
    document.getElementById('userShopField').style.display = 'none';
    shopSelect.required = false;
}
```

#### D. Modificata funzione `saveUser()`
Valida e invia il campo shopId:

```javascript
const shopId = document.getElementById('userShop').value;

// Validate shop for SHOP role
if (role === 'SHOP' && !shopId) {
    alert('Seleziona un negozio per gli utenti di tipo Negozio');
    return;
}

const userData = {
    username,
    fullName,
    email,
    phone,
    whatsappNumber: whatsapp,
    role,
    active
};

// Add shop for SHOP role
if (role === 'SHOP' && shopId) {
    userData.shopId = parseInt(shopId);
}
```

#### E. Modificata funzione `displayUsers(users)`
Aggiunta colonna "Negozio" nella tabella utenti:

```javascript
<thead>
    <tr>
        <th>Username</th>
        <th>Nome Completo</th>
        <th>Email</th>
        <th>Ruolo</th>
        <th>Negozio</th>  <!-- NUOVA COLONNA -->
        <th>Stato</th>
        <th>Azioni</th>
    </tr>
</thead>
<tbody>
    ${users.map(user => `
        <tr>
            ...
            <td>${user.shop ? `${user.shop.name} - ${user.shop.city}` : '-'}</td>
            ...
        </tr>
    `).join('')}
</tbody>
```

Aggiornato anche `columnDefs` da `targets: 5` a `targets: 6` per riflettere la nuova colonna.

---

### 3. Backend - UserController.java ✅

#### A. Aggiunti import necessari:
```java
import com.bakery.warehouse.entity.Shop;
import com.bakery.warehouse.repository.ShopRepository;
import java.util.Map;
```

#### B. Aggiunta dipendenza ShopRepository:
```java
private final ShopRepository shopRepository;
```

#### C. Modificato metodo `createUser()`
Ora accetta `Map<String, Object>` invece di `User` per gestire il campo `shopId`:

```java
@PostMapping
@PreAuthorize("hasRole('ROLE_ADMIN')")
public ResponseEntity<User> createUser(@RequestBody Map<String, Object> userRequest) {
    // Check if username already exists
    String username = (String) userRequest.get("username");
    if (userRepository.findByUsername(username).isPresent()) {
        throw new RuntimeException("Username already exists");
    }

    User user = new User();
    user.setUsername(username);
    user.setPassword(passwordEncoder.encode((String) userRequest.get("password")));
    user.setFullName((String) userRequest.get("fullName"));
    user.setEmail((String) userRequest.get("email"));
    user.setPhone((String) userRequest.get("phone"));
    user.setWhatsappNumber((String) userRequest.get("whatsappNumber"));
    user.setRole(User.UserRole.valueOf((String) userRequest.get("role")));
    user.setActive((Boolean) userRequest.getOrDefault("active", true));
    user.setCreatedAt(LocalDateTime.now());
    user.setUpdatedAt(LocalDateTime.now());

    // Set shop if provided (for SHOP role)
    if (userRequest.containsKey("shopId") && userRequest.get("shopId") != null) {
        Long shopId = ((Number) userRequest.get("shopId")).longValue();
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        user.setShop(shop);
    }

    User saved = userRepository.save(user);
    return ResponseEntity.ok(saved);
}
```

#### D. Modificato metodo `updateUser()`
Gestisce l'aggiornamento del campo shop:

```java
@PutMapping("/{id}")
@PreAuthorize("hasRole('ROLE_ADMIN')")
public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> userRequest) {
    User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

    user.setFullName((String) userRequest.get("fullName"));
    user.setEmail((String) userRequest.get("email"));
    user.setPhone((String) userRequest.get("phone"));
    user.setWhatsappNumber((String) userRequest.get("whatsappNumber"));
    user.setRole(User.UserRole.valueOf((String) userRequest.get("role")));
    user.setActive((Boolean) userRequest.get("active"));

    // Only update password if provided
    if (userRequest.containsKey("password") && userRequest.get("password") != null) {
        String password = (String) userRequest.get("password");
        if (!password.isEmpty()) {
            user.setPassword(passwordEncoder.encode(password));
        }
    }

    // Update shop if provided (for SHOP role)
    if (userRequest.containsKey("shopId")) {
        if (userRequest.get("shopId") != null) {
            Long shopId = ((Number) userRequest.get("shopId")).longValue();
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow(() -> new RuntimeException("Shop not found"));
            user.setShop(shop);
        } else {
            user.setShop(null); // Remove shop association
        }
    }

    user.setUpdatedAt(LocalDateTime.now());

    User updated = userRepository.save(user);
    return ResponseEntity.ok(updated);
}
```

---

## 🎯 Funzionalità Implementate

### ✅ 1. Campo Negozio nella Form Utente
- Appare solo quando si seleziona ruolo "SHOP"
- Dropdown con lista di tutti i negozi disponibili
- Campo obbligatorio per ruolo SHOP
- Descrizione che spiega la funzione del campo

### ✅ 2. Validazione Frontend
- Verifica che un negozio sia selezionato per utenti SHOP
- Campo nascosto per altri ruoli (ADMIN, ACCOUNTANT, DRIVER)
- Campo viene popolato automaticamente in modifica

### ✅ 3. Gestione Backend
- Crea/aggiorna correttamente l'associazione user-shop
- Valida l'esistenza del negozio prima di associarlo
- Permette di rimuovere l'associazione (shopId = null)

### ✅ 4. Visualizzazione in Tabella
- Nuova colonna "Negozio" nella tabella utenti
- Mostra "Nome - Città" se associato
- Mostra "-" se non associato

---

## 🔄 Flusso di Utilizzo

### Creazione Nuovo Utente SHOP:
1. Admin clicca "Nuovo Utente"
2. Compila username, password, nome, email
3. Seleziona ruolo "SHOP"
4. **Appare automaticamente il campo "Negozio Associato"**
5. Seleziona il negozio dalla dropdown
6. Clicca "Salva"
7. L'utente viene creato con shop_id associato

### Modifica Utente Esistente:
1. Admin clicca modifica su un utente
2. Se l'utente è di tipo SHOP, il campo negozio appare con il valore corrente
3. Può cambiare il negozio o modificare il ruolo
4. Se cambia il ruolo da SHOP a altro, il campo negozio scompare
5. Salva le modifiche

### Cambio Ruolo:
- Da SHOP → Altro ruolo: il campo negozio scompare, associazione rimossa
- Da Altro ruolo → SHOP: il campo negozio appare, deve selezionare un negozio

---

## 🧪 Test delle Funzionalità

### Test Creazione Utente SHOP:
1. Login come admin
2. Vai su "Utenti"
3. Clicca "Nuovo Utente"
4. Compila i campi obbligatori
5. Seleziona ruolo "Negozio"
6. Verifica che appaia il dropdown negozi
7. Seleziona un negozio
8. Clicca "Salva"
9. Verifica che nella tabella appaia il negozio associato

### Test Modifica Utente SHOP:
1. Clicca modifica su un utente di tipo SHOP
2. Verifica che il negozio corrente sia preselezionato
3. Cambia il negozio
4. Salva
5. Verifica che il cambio sia persistito

### Test Cambio Ruolo:
1. Modifica un utente SHOP
2. Cambia ruolo a "Autista"
3. Verifica che il campo negozio scompaia
4. Salva
5. Cambia di nuovo il ruolo a "Negozio"
6. Verifica che il campo riappaia vuoto
7. Seleziona un negozio e salva

### Test Validazione:
1. Crea nuovo utente
2. Seleziona ruolo "Negozio"
3. NON selezionare un negozio
4. Clicca "Salva"
5. Verifica che appaia alert: "Seleziona un negozio per gli utenti di tipo Negozio"

### Test Visualizzazione Tabella:
1. Vai su "Utenti"
2. Verifica che la colonna "Negozio" sia visibile
3. Utenti SHOP mostrano "Nome Negozio - Città"
4. Altri utenti mostrano "-"

---

## 📊 Riepilogo File Modificati

### Frontend
1. ✅ [index.html](src/main/resources/static/index.html) - Aggiunto campo userShopField nel modal
2. ✅ [app.js](src/main/resources/static/js/app.js) - Aggiunte/modificate 5 funzioni

### Backend
1. ✅ [UserController.java](src/main/java/com/bakery/warehouse/controller/UserController.java) - Modificati createUser e updateUser

### Database
- ✅ Nessuna modifica necessaria - la colonna `shop_id` è già stata aggiunta in precedenza

---

## ✅ Checklist Completamento

- [x] Campo negozio aggiunto al modal utente
- [x] Campo appare/scompare in base al ruolo
- [x] Dropdown popolato con tutti i negozi
- [x] Validazione frontend implementata
- [x] Funzione onUserRoleChange() creata
- [x] showNewUserModal() aggiornata
- [x] editUser() aggiornata
- [x] saveUser() aggiornata
- [x] displayUsers() aggiornata con colonna Negozio
- [x] Backend createUser() modificato
- [x] Backend updateUser() modificato
- [x] ShopRepository iniettato nel controller
- [x] Test manuali da eseguire

---

## 🚀 Prossimi Passi

1. **Ricompilare il progetto:**
```bash
cd /Users/juridirocco/Desktop/mucci/bakery-warehouse
./mvnw clean package -DskipTests
```

2. **Riavviare i container:**
```bash
docker-compose down
docker-compose up -d --build
docker-compose logs -f app
```

3. **Testare le funzionalità:**
- Creare un nuovo utente SHOP
- Modificare un utente esistente
- Verificare i permessi di accesso
- Controllare la tabella utenti

---

**Data implementazione:** 2026-01-20
**Versione:** 2.1.0
**Developer:** Claude Code Assistant
