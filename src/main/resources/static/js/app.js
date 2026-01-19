let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || '{}');

const API_BASE = '/api';

window.onload = () => {
    if (token) {
        showMainContent();
        loadShipments();
    } else {
        showLoginSection();
    }
};

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            token = data.token;
            currentUser = { username: data.username, fullName: data.fullName, role: data.role };
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showMainContent();
            loadShipments();
        } else {
            showError('Credenziali non valide');
        }
    } catch (error) {
        showError('Errore di connessione');
    }
});

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function showLoginSection() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
}

function showMainContent() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('userInfo').textContent = `${currentUser.fullName} (${currentUser.role})`;

    if (currentUser.role === 'DRIVER') {
        document.getElementById('newShipmentBtn').style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    token = null;
    currentUser = {};
    showLoginSection();
}

async function apiCall(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${url}`, options);

    if (response.status === 401) {
        logout();
        return null;
    }

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

function showShipments() {
    document.getElementById('shipmentsSection').style.display = 'block';
    document.getElementById('shopsSection').style.display = 'none';
    document.getElementById('productsSection').style.display = 'none';
    loadShipments();
}

function showShops() {
    document.getElementById('shipmentsSection').style.display = 'none';
    document.getElementById('shopsSection').style.display = 'block';
    document.getElementById('productsSection').style.display = 'none';
    loadShops();
}

function showProducts() {
    document.getElementById('shipmentsSection').style.display = 'none';
    document.getElementById('shopsSection').style.display = 'none';
    document.getElementById('productsSection').style.display = 'block';
    loadProducts();
}

async function loadShipments() {
    const container = document.getElementById('shipmentsList');
    container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"></div></div>';

    try {
        let shipments;
        if (currentUser.role === 'DRIVER') {
            shipments = await apiCall('/shipments/driver/today');
        } else {
            shipments = await apiCall('/shipments');
        }

        displayShipments(shipments);
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento delle spedizioni</div>';
    }
}

function displayShipments(shipments) {
    const container = document.getElementById('shipmentsList');

    if (!shipments || shipments.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nessuna spedizione trovata</div>';
        return;
    }

    const html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Numero</th>
                        <th>Data</th>
                        <th>Negozio</th>
                        <th>Autista</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${shipments.map(s => `
                        <tr>
                            <td>${s.shipmentNumber}</td>
                            <td>${formatDate(s.shipmentDate)}</td>
                            <td>${s.shop.name}</td>
                            <td>${s.driver ? s.driver.fullName : '-'}</td>
                            <td><span class="badge status-${s.status}">${s.status}</span></td>
                            <td>
                                <div class="btn-group btn-group-sm">
                                    ${s.status === 'DRAFT' && ['ADMIN', 'ACCOUNTANT'].includes(currentUser.role) ?
                                        `<button class="btn btn-success" onclick="confirmShipment(${s.id})">Conferma</button>` : ''}
                                    ${s.status === 'CONFIRMED' && currentUser.role === 'DRIVER' ?
                                        `<button class="btn btn-warning" onclick="updateStatus(${s.id}, 'IN_TRANSIT')">In Consegna</button>` : ''}
                                    ${s.status === 'IN_TRANSIT' && currentUser.role === 'DRIVER' ?
                                        `<button class="btn btn-success" onclick="updateStatus(${s.id}, 'DELIVERED')">Consegnato</button>` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

async function loadShops() {
    const container = document.getElementById('shopsList');
    container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"></div></div>';

    try {
        const shops = await apiCall('/shops');
        displayShops(shops);
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento dei negozi</div>';
    }
}

function displayShops(shops) {
    const container = document.getElementById('shopsList');

    const html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Codice</th>
                        <th>Nome</th>
                        <th>Indirizzo</th>
                        <th>Città</th>
                        <th>Telefono</th>
                        <th>Email</th>
                    </tr>
                </thead>
                <tbody>
                    ${shops.map(shop => `
                        <tr>
                            <td>${shop.code}</td>
                            <td>${shop.name}</td>
                            <td>${shop.address}</td>
                            <td>${shop.city}</td>
                            <td>${shop.phone || '-'}</td>
                            <td>${shop.email || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

async function loadProducts() {
    const container = document.getElementById('productsList');
    container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"></div></div>';

    try {
        const products = await apiCall('/products');
        displayProducts(products);
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento dei prodotti</div>';
    }
}

function displayProducts(products) {
    const container = document.getElementById('productsList');

    const html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Codice</th>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th>Prezzo</th>
                        <th>Unità</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>${p.code}</td>
                            <td>${p.name}</td>
                            <td>${p.category}</td>
                            <td>€ ${p.unitPrice}</td>
                            <td>${p.unit}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

async function confirmShipment(id) {
    if (!confirm('Confermare la spedizione? Verrà generato il PDF e inviate le notifiche.')) return;

    try {
        await apiCall(`/shipments/${id}/confirm`, 'POST');
        alert('Spedizione confermata con successo');
        loadShipments();
    } catch (error) {
        alert('Errore nella conferma della spedizione');
    }
}

async function updateStatus(id, status) {
    try {
        await apiCall(`/shipments/${id}/status?status=${status}`, 'PUT');
        alert('Stato aggiornato');
        loadShipments();
    } catch (error) {
        alert('Errore nell\'aggiornamento dello stato');
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT');
}

function showNewShipmentModal() {
    alert('Modal per nuova spedizione - da implementare con form completo');
}

function showNewShopModal() {
    alert('Modal per nuovo negozio - da implementare');
}

function showNewProductModal() {
    alert('Modal per nuovo prodotto - da implementare');
}
