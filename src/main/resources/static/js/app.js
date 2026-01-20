let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || '{}');
let allShops = [];
let allProducts = [];
let allDrivers = [];
let returnCreatedFromShipmentId = null; // Track if return was created from shipment view

const API_BASE = '/api';

window.onload = () => {
    if (token) {
        showMainContent();
        loadInitialData();
        loadShipments();
    } else {
        showLoginSection();
    }
};

async function loadInitialData() {
    try {
        [allShops, allProducts] = await Promise.all([
            apiCall('/shops'),
            apiCall('/products')
        ]);

        if (currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNTANT') {
            const users = await apiCall('/shops');
            allDrivers = users.filter(u => u.role === 'DRIVER');
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

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
            loadInitialData();
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

    const isDriver = currentUser.role === 'DRIVER';
    const isShop = currentUser.role === 'SHOP';
    const isAdmin = currentUser.role === 'ADMIN';

    if (isDriver || isShop) {
        document.getElementById('newShipmentBtn')?.style.setProperty('display', 'none');
    }

    if (!isAdmin) {
        document.getElementById('newShopBtn')?.style.setProperty('display', 'none');
        document.getElementById('newProductBtn')?.style.setProperty('display', 'none');
    }

    // Show Users menu item only for admins
    if (isAdmin) {
        document.getElementById('usersMenuItem').style.display = 'block';
    }

    // Show Reports menu item for admins, accountants, and shop users
    const isAccountant = currentUser.role === 'ACCOUNTANT';
    if (isAdmin || isAccountant || isShop) {
        document.getElementById('reportsMenuItem').style.display = 'block';
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
    console.log(`[apiCall] Calling ${method} ${url}, token present: ${!!token}, token value: ${token ? token.substring(0, 20) + '...' : 'null'}`);

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

    console.log('[apiCall] Request headers:', options.headers);
    const response = await fetch(`${API_BASE}${url}`, options);

    if (response.status === 401) {
        logout();
        return null;
    }

    if (response.status === 204) {
        return null;
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error - URL: ${url}, Status: ${response.status}, Response:`, errorText);
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    return response.json();
}

function hideAllSections() {
    document.getElementById('shipmentsSection').style.display = 'none';
    document.getElementById('shopsSection').style.display = 'none';
    document.getElementById('productsSection').style.display = 'none';
    document.getElementById('returnsSection').style.display = 'none';
    document.getElementById('usersSection').style.display = 'none';
}

function showShipments() {
    hideAllSections();
    document.getElementById('shipmentsSection').style.display = 'block';

    // Initialize dropdown filtro negozi
    const filterShopSelect = document.getElementById('filterShipmentShop');
    if (filterShopSelect && allShops.length > 0) {
        filterShopSelect.innerHTML = '<option value="">Tutti i negozi</option>' +
            allShops.map(s => `<option value="${s.id}">${s.name} - ${s.city}</option>`).join('');
    }

    // Carica con paginazione
    loadShipmentsWithPagination(0, 25);
}

function showShops() {
    hideAllSections();
    document.getElementById('shopsSection').style.display = 'block';
    loadShops();
}

function showProducts() {
    hideAllSections();
    document.getElementById('productsSection').style.display = 'block';
    loadProducts();
}

async function loadShipments(startDate, endDate, shopId, status) {
    const container = document.getElementById('shipmentsList');
    container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"></div></div>';

    try {
        let url = '/shipments';
        const params = new URLSearchParams();

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        if (params.toString()) {
            url += '?' + params.toString();
        }

        let shipments = await apiCall(url);

        // Filter by shop if specified
        if (shopId) {
            shipments = shipments.filter(s => s.shop && s.shop.id == shopId);
        }

        // Filter by status if specified
        if (status) {
            shipments = shipments.filter(s => s.status === status);
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

    // Calcola totali
    const totals = calculateShipmentTotals(shipments);
    const totalsCard = renderShipmentTotalsCard(totals);

    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#shipmentsTable')) {
        $('#shipmentsTable').DataTable().destroy();
    }

    const html = `
        <div class="table-responsive">
            <table id="shipmentsTable" class="table table-striped table-hover" style="width:100%">
                <thead>
                    <tr>
                        <th>Numero</th>
                        <th>Data</th>
                        <th>Negozio</th>
                        <th>Autista</th>
                        <th>Stato</th>
                        <th>Totale</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${shipments.map(s => {
                        const shipmentTotal = s.items ? s.items.reduce((sum, item) =>
                            sum + (item.totalPrice || (item.quantity * item.unitPrice)), 0) : 0;

                        return `
                        <tr>
                            <td>${s.shipmentNumber}</td>
                            <td data-order="${s.shipmentDate}">${formatDate(s.shipmentDate)}</td>
                            <td>${s.shop?.name || '-'}</td>
                            <td>${s.driver?.fullName || '-'}</td>
                            <td><span class="badge status-${s.status}">${translateStatus(s.status)}</span></td>
                            <td>€ ${shipmentTotal.toFixed(2)}</td>
                            <td>
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-info" onclick="viewShipment(${s.id})" title="Visualizza dettagli">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    ${s.status === 'BOZZA' && ['ADMIN', 'ACCOUNTANT'].includes(currentUser.role) ?
                                        `<button class="btn btn-success" onclick="confirmShipment(${s.id})" title="Conferma spedizione"><i class="bi bi-check-lg"></i></button>` : ''}
                                    ${s.status === 'IN_CONSEGNA' && currentUser.role === 'DRIVER' ?
                                        `<button class="btn btn-warning" onclick="updateStatus(${s.id}, 'IN_CONSEGNA')" title="Segna in consegna"><i class="bi bi-truck"></i></button>` : ''}
                                    ${s.status === 'IN_CONSEGNA' && currentUser.role === 'DRIVER' ?
                                        `<button class="btn btn-success" onclick="updateStatus(${s.id}, 'CONSEGNATA')" title="Segna come consegnato"><i class="bi bi-check-circle"></i></button>` : ''}
                                    ${s.pdfPath && s.status !== 'BOZZA' ?
                                        `<button class="btn btn-danger" onclick="downloadPDF(${s.id}, '${s.shipmentNumber}')" title="Scarica PDF"><i class="bi bi-file-pdf"></i></button>` : ''}
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = totalsCard + html;

    // Initialize DataTable with Italian language and responsive design
    $('#shipmentsTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/it-IT.json'
        },
        responsive: true,
        pageLength: 25,
        order: [[1, 'desc']], // Order by date descending
        columnDefs: [
            { orderable: false, targets: 6 } // Disable sorting on Actions column
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip'
    });
}

async function loadShops() {
    const container = document.getElementById('shopsList');
    container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"></div></div>';

    try {
        const shops = await apiCall('/shops');
        allShops = shops;
        displayShops(shops);
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento dei negozi</div>';
    }
}

function displayShops(shops) {
    const container = document.getElementById('shopsList');
    const canEdit = currentUser.role === 'ADMIN';

    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#shopsTable')) {
        $('#shopsTable').DataTable().destroy();
    }

    const html = `
        <div class="table-responsive">
            <table id="shopsTable" class="table table-striped table-hover" style="width:100%">
                <thead>
                    <tr>
                        <th>Codice</th>
                        <th>Nome</th>
                        <th>Città</th>
                        <th>Indirizzo</th>
                        <th>Telefono</th>
                        <th>Email</th>
                        ${canEdit ? '<th>Azioni</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${shops.map(shop => `
                        <tr>
                            <td>${shop.code}</td>
                            <td>${shop.name}</td>
                            <td>${shop.city}</td>
                            <td>${shop.address}</td>
                            <td>${shop.phone || '-'}</td>
                            <td>${shop.email || '-'}</td>
                            ${canEdit ? `
                                <td>
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button class="btn btn-primary" onclick="editShop(${shop.id})" title="Modifica">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-danger" onclick="deleteShop(${shop.id})" title="Elimina">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            ` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    // Initialize DataTable
    $('#shopsTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/it-IT.json'
        },
        responsive: true,
        pageLength: 25,
        order: [[1, 'asc']], // Order by name
        columnDefs: canEdit ? [
            { orderable: false, targets: 6 } // Disable sorting on Actions column
        ] : []
    });
}

async function loadProducts() {
    const container = document.getElementById('productsList');
    container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"></div></div>';

    try {
        const products = await apiCall('/products');
        allProducts = products;
        displayProducts(products);
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento dei prodotti</div>';
    }
}

function displayProducts(products) {
    const container = document.getElementById('productsList');
    const canEdit = currentUser.role === 'ADMIN';

    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#productsTable')) {
        $('#productsTable').DataTable().destroy();
    }

    const html = `
        <div class="table-responsive">
            <table id="productsTable" class="table table-striped table-hover" style="width:100%">
                <thead>
                    <tr>
                        <th>Codice</th>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th>Prezzo</th>
                        <th>Unità</th>
                        ${canEdit ? '<th>Azioni</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>${p.code}</td>
                            <td>${p.name}</td>
                            <td>${translateCategory(p.category)}</td>
                            <td data-order="${p.unitPrice}">€ ${parseFloat(p.unitPrice).toFixed(2)}</td>
                            <td>${p.unit}</td>
                            ${canEdit ? `
                                <td>
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button class="btn btn-primary" onclick="editProduct(${p.id})" title="Modifica">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-danger" onclick="deleteProduct(${p.id})" title="Elimina">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            ` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    // Initialize DataTable
    $('#productsTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/it-IT.json'
        },
        responsive: true,
        pageLength: 25,
        order: [[1, 'asc']], // Order by name
        columnDefs: canEdit ? [
            { orderable: false, targets: 5 } // Disable sorting on Actions column
        ] : []
    });
}

function showNewShopModal() {
    showModal('shopModal');
    document.getElementById('shopForm').reset();
    document.getElementById('shopId').value = '';
    document.getElementById('shopModalLabel').textContent = 'Nuovo Negozio';
}

function showNewProductModal() {
    showModal('productModal');
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModalLabel').textContent = 'Nuovo Prodotto';
}

function showNewShipmentModal() {
    showModal('shipmentModal');
    document.getElementById('shipmentForm').reset();
    document.getElementById('shipmentItems').innerHTML = '';
    document.getElementById('importLastShipmentBtn').style.display = 'none';

    const shopSelect = document.getElementById('shipmentShop');
    shopSelect.innerHTML = '<option value="">Seleziona negozio...</option>' +
        allShops.map(s => `<option value="${s.id}">${s.name} - ${s.city}</option>`).join('');

    addShipmentItem();
}

// ================== IMPORT LAST SHIPMENT FUNCTIONS ==================

function onShipmentShopSelected() {
    const shopId = document.getElementById('shipmentShop').value;
    const importBtn = document.getElementById('importLastShipmentBtn');

    if (shopId) {
        importBtn.style.display = 'inline-block';
    } else {
        importBtn.style.display = 'none';
    }
}

async function importLastShipmentProducts() {
    const shopId = document.getElementById('shipmentShop').value;

    if (!shopId) {
        alert('Seleziona prima un negozio');
        return;
    }

    try {
        const lastShipment = await apiCall(`/shipments/shop/${shopId}/last-shipment`);

        if (!lastShipment || !lastShipment.items || lastShipment.items.length === 0) {
            alert('Nessuna spedizione precedente trovata per questo negozio');
            return;
        }

        // Clear current items
        document.getElementById('shipmentItems').innerHTML = '';

        // Add items from last shipment (excluding returns)
        lastShipment.items.forEach(item => {
            addShipmentItem();
            const itemRows = document.querySelectorAll('.shipment-item-row');
            const lastRow = itemRows[itemRows.length - 1];

            const productSelect = lastRow.querySelector('.item-product');
            const quantityInput = lastRow.querySelector('.item-quantity');
            const notesInput = lastRow.querySelector('.item-notes');

            if (productSelect) productSelect.value = item.product.id;
            if (quantityInput) quantityInput.value = item.quantity;
            if (notesInput && item.notes) notesInput.value = item.notes;
        });

        alert(`Importati ${lastShipment.items.length} prodotti dalla spedizione del ${formatDate(lastShipment.shipmentDate)}`);
    } catch (error) {
        console.error('Error importing last shipment:', error);
        alert('Nessuna spedizione precedente trovata per questo negozio');
    }
}

// ================== SHIPMENT FILTERS ==================

function applyShipmentFilters() {
    const startDate = document.getElementById('filterShipmentStartDate').value;
    const endDate = document.getElementById('filterShipmentEndDate').value;
    const shopId = document.getElementById('filterShipmentShop').value;
    const status = document.getElementById('filterShipmentStatus').value;

    loadShipments(startDate, endDate, shopId, status);
}

function clearShipmentFilters() {
    document.getElementById('filterShipmentStartDate').value = '';
    document.getElementById('filterShipmentEndDate').value = '';
    document.getElementById('filterShipmentShop').value = '';
    document.getElementById('filterShipmentStatus').value = '';

    loadShipments();
}

// ================== SHIPMENT TOTALS ==================

function calculateShipmentTotals(shipments) {
    let totalShipmentValue = 0;
    let totalReturnsValue = 0;

    shipments.forEach(shipment => {
        // Calculate shipment items total
        if (shipment.items) {
            shipment.items.forEach(item => {
                const itemTotal = item.totalPrice || (item.quantity * item.unitPrice);
                totalShipmentValue += parseFloat(itemTotal || 0);
            });
        }

        // Calculate returns total (if returns are in shipment object)
        if (shipment.returns) {
            shipment.returns.forEach(returnItem => {
                if (returnItem.items) {
                    returnItem.items.forEach(item => {
                        const itemTotal = item.totalAmount || (item.quantity * item.unitPrice);
                        totalReturnsValue += parseFloat(itemTotal || 0);
                    });
                }
            });
        }
    });

    return {
        totalShipmentValue: totalShipmentValue.toFixed(2),
        totalReturnsValue: totalReturnsValue.toFixed(2),
        netValue: (totalShipmentValue - totalReturnsValue).toFixed(2)
    };
}

function renderShipmentTotalsCard(totals) {
    return `
        <div class="card mb-3 bg-light">
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-md-4">
                        <h6 class="text-muted mb-1">Totale Spedizioni</h6>
                        <h4 class="mb-0 text-primary">€ ${totals.totalShipmentValue}</h4>
                    </div>
                    <div class="col-md-4">
                        <h6 class="text-muted mb-1">Totale Resi</h6>
                        <h4 class="mb-0 text-danger">€ ${totals.totalReturnsValue}</h4>
                    </div>
                    <div class="col-md-4">
                        <h6 class="text-muted mb-1">Netto</h6>
                        <h4 class="mb-0 text-success">€ ${totals.netValue}</h4>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ================== SERVER-SIDE PAGINATION ==================

let currentShipmentPage = 0;
let shipmentPageSize = 25;
let totalShipmentPages = 0;

async function loadShipmentsWithPagination(page = 0, size = 25) {
    const container = document.getElementById('shipmentsList');
    container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"></div></div>';

    try {
        const startDate = document.getElementById('filterShipmentStartDate')?.value || '';
        const endDate = document.getElementById('filterShipmentEndDate')?.value || '';

        let url = `/shipments?page=${page}&size=${size}`;

        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;

        const response = await apiCall(url);

        // Check if response is paginated
        if (response.content) {
            currentShipmentPage = response.currentPage;
            totalShipmentPages = response.totalPages;
            shipmentPageSize = response.pageSize;

            displayShipmentsWithPagination(response.content, response);
        } else {
            // Fallback to non-paginated display
            displayShipments(response);
        }
    } catch (error) {
        console.error('Error loading shipments:', error);
        container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento delle spedizioni</div>';
    }
}

function displayShipmentsWithPagination(shipments, paginationInfo) {
    const container = document.getElementById('shipmentsList');

    if (!shipments || shipments.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nessuna spedizione trovata</div>';
        return;
    }

    // Calculate totals for current page
    const totals = calculateShipmentTotals(shipments);
    const totalsCard = renderShipmentTotalsCard(totals);

    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#shipmentsTable')) {
        $('#shipmentsTable').DataTable().destroy();
    }

    const tableHtml = `
        <div class="table-responsive">
            <table id="shipmentsTable" class="table table-striped table-hover" style="width:100%">
                <thead>
                    <tr>
                        <th>Numero</th>
                        <th>Data</th>
                        <th>Negozio</th>
                        <th>Autista</th>
                        <th>Stato</th>
                        <th>Totale</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${shipments.map(s => {
                        const shipmentTotal = s.items ? s.items.reduce((sum, item) =>
                            sum + (item.totalPrice || (item.quantity * item.unitPrice)), 0) : 0;

                        return `
                        <tr>
                            <td>${s.shipmentNumber}</td>
                            <td data-order="${s.shipmentDate}">${formatDate(s.shipmentDate)}</td>
                            <td>${s.shop?.name || '-'}</td>
                            <td>${s.driver?.fullName || '-'}</td>
                            <td><span class="badge status-${s.status}">${translateStatus(s.status)}</span></td>
                            <td>€ ${shipmentTotal.toFixed(2)}</td>
                            <td>
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-info" onclick="viewShipment(${s.id})" title="Visualizza dettagli">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    ${s.status === 'BOZZA' && ['ADMIN', 'ACCOUNTANT'].includes(currentUser.role) ?
                                        `<button class="btn btn-success" onclick="confirmShipment(${s.id})" title="Conferma spedizione"><i class="bi bi-check-lg"></i></button>` : ''}
                                    ${s.status === 'IN_CONSEGNA' && currentUser.role === 'DRIVER' ?
                                        `<button class="btn btn-success" onclick="updateStatus(${s.id}, 'CONSEGNATA')" title="Segna come consegnato"><i class="bi bi-check-circle"></i></button>` : ''}
                                    ${s.pdfPath && s.status !== 'BOZZA' ?
                                        `<button class="btn btn-danger" onclick="downloadPDF(${s.id}, '${s.shipmentNumber}')" title="Scarica PDF"><i class="bi bi-file-pdf"></i></button>` : ''}
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;

    const paginationHtml = renderPaginationControls(paginationInfo);

    container.innerHTML = totalsCard + tableHtml + paginationHtml;

    // Initialize DataTable without pagination (we handle it server-side)
    $('#shipmentsTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/it-IT.json'
        },
        responsive: true,
        paging: false,  // Disable client-side pagination
        searching: false,  // Disable client-side search (we use filters)
        info: false,  // Disable info text (we show our own)
        order: [[1, 'desc']],
        columnDefs: [
            { orderable: false, targets: 6 }
        ]
    });
}

function renderPaginationControls(paginationInfo) {
    const { currentPage, totalPages, totalElements } = paginationInfo;

    if (totalPages <= 1) return '';

    const startItem = currentPage * shipmentPageSize + 1;
    const endItem = Math.min((currentPage + 1) * shipmentPageSize, totalElements);

    let paginationButtons = '';

    // Previous button
    paginationButtons += `
        <li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadShipmentsWithPagination(${currentPage - 1}, ${shipmentPageSize}); return false;">
                <i class="bi bi-chevron-left"></i> Precedente
            </a>
        </li>
    `;

    // Page numbers (show max 5 pages)
    const maxPagesToShow = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(0, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationButtons += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadShipmentsWithPagination(${i}, ${shipmentPageSize}); return false;">
                    ${i + 1}
                </a>
            </li>
        `;
    }

    // Next button
    paginationButtons += `
        <li class="page-item ${currentPage >= totalPages - 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadShipmentsWithPagination(${currentPage + 1}, ${shipmentPageSize}); return false;">
                Successivo <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;

    return `
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                Mostrando ${startItem}-${endItem} di ${totalElements} spedizioni
            </div>
            <nav>
                <ul class="pagination mb-0">
                    ${paginationButtons}
                </ul>
            </nav>
        </div>
    `;
}

async function editShop(id) {
    try {
        const shop = allShops.find(s => s.id === id);
        if (!shop) return;

        document.getElementById('shopId').value = shop.id;
        document.getElementById('shopCode').value = shop.code;
        document.getElementById('shopName').value = shop.name;
        document.getElementById('shopAddress').value = shop.address;
        document.getElementById('shopCity').value = shop.city;
        document.getElementById('shopProvince').value = shop.province || '';
        document.getElementById('shopZipCode').value = shop.zipCode || '';
        document.getElementById('shopEmail').value = shop.email || '';
        document.getElementById('shopPhone').value = shop.phone || '';
        document.getElementById('shopWhatsApp').value = shop.whatsappNumber || '';
        document.getElementById('shopContact').value = shop.contactPerson || '';
        document.getElementById('shopNotes').value = shop.notes || '';

        document.getElementById('shopModalLabel').textContent = 'Modifica Negozio';
        showModal('shopModal');
    } catch (error) {
        alert('Errore nel caricamento del negozio');
    }
}

async function editProduct(id) {
    try {
        const product = allProducts.find(p => p.id === id);
        if (!product) return;

        document.getElementById('productId').value = product.id;
        document.getElementById('productCode').value = product.code;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.unitPrice;
        document.getElementById('productUnit').value = product.unit;
        document.getElementById('productNotes').value = product.notes || '';

        document.getElementById('productModalLabel').textContent = 'Modifica Prodotto';
        showModal('productModal');
    } catch (error) {
        alert('Errore nel caricamento del prodotto');
    }
}

async function deleteShop(id) {
    if (!confirm('Sei sicuro di voler eliminare questo negozio?')) return;

    try {
        await apiCall(`/shops/${id}`, 'DELETE');
        alert('Negozio eliminato con successo');
        loadShops();
    } catch (error) {
        alert('Errore nell\'eliminazione del negozio: ' + error.message);
    }
}

async function deleteProduct(id) {
    if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;

    try {
        await apiCall(`/products/${id}`, 'DELETE');
        alert('Prodotto eliminato con successo');
        loadProducts();
    } catch (error) {
        alert('Errore nell\'eliminazione del prodotto: ' + error.message);
    }
}

document.getElementById('shopForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const shopId = document.getElementById('shopId').value;
    const shopData = {
        code: document.getElementById('shopCode').value,
        name: document.getElementById('shopName').value,
        address: document.getElementById('shopAddress').value,
        city: document.getElementById('shopCity').value,
        province: document.getElementById('shopProvince').value,
        zipCode: document.getElementById('shopZipCode').value,
        email: document.getElementById('shopEmail').value,
        phone: document.getElementById('shopPhone').value,
        whatsappNumber: document.getElementById('shopWhatsApp').value,
        contactPerson: document.getElementById('shopContact').value,
        notes: document.getElementById('shopNotes').value,
        active: true
    };

    try {
        if (shopId) {
            await apiCall(`/shops/${shopId}`, 'PUT', shopData);
            alert('Negozio aggiornato con successo');
        } else {
            await apiCall('/shops', 'POST', shopData);
            alert('Negozio creato con successo');
        }
        hideModal('shopModal');
        loadShops();
    } catch (error) {
        alert('Errore: ' + error.message);
    }
});

document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productId = document.getElementById('productId').value;
    const productData = {
        code: document.getElementById('productCode').value,
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        category: document.getElementById('productCategory').value,
        unitPrice: parseFloat(document.getElementById('productPrice').value),
        unit: document.getElementById('productUnit').value,
        notes: document.getElementById('productNotes').value,
        active: true
    };

    try {
        if (productId) {
            await apiCall(`/products/${productId}`, 'PUT', productData);
            alert('Prodotto aggiornato con successo');
        } else {
            await apiCall('/products', 'POST', productData);
            alert('Prodotto creato con successo');
        }
        hideModal('productModal');
        loadProducts();
    } catch (error) {
        alert('Errore: ' + error.message);
    }
});

document.getElementById('shipmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const items = Array.from(document.querySelectorAll('.shipment-item-row')).map(row => ({
        productId: parseInt(row.querySelector('.item-product').value),
        quantity: parseFloat(row.querySelector('.item-quantity').value),
        notes: row.querySelector('.item-notes').value
    })).filter(item => item.productId && item.quantity);

    if (items.length === 0) {
        alert('Aggiungi almeno un prodotto alla spedizione');
        return;
    }

    const shipmentData = {
        shopId: parseInt(document.getElementById('shipmentShop').value),
        driverId: null,
        shipmentDate: document.getElementById('shipmentDate').value,
        notes: document.getElementById('shipmentNotes').value,
        items: items
    };

    try {
        await apiCall('/shipments', 'POST', shipmentData);
        alert('Spedizione creata con successo');
        hideModal('shipmentModal');
        loadShipments();
    } catch (error) {
        alert('Errore: ' + error.message);
    }
});

function addShipmentItem() {
    const container = document.getElementById('shipmentItems');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'shipment-item-row mb-3 p-3 border rounded';

    itemDiv.innerHTML = `
        <div class="row g-2">
            <div class="col-md-5">
                <label class="form-label">Prodotto</label>
                <select class="form-select item-product" required>
                    <option value="">Seleziona...</option>
                    ${allProducts.map(p => `<option value="${p.id}">${p.name} (€${p.unitPrice}/${p.unit})</option>`).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">Quantità</label>
                <input type="number" step="0.1" class="form-control item-quantity" required>
            </div>
            <div class="col-md-3">
                <label class="form-label">Note</label>
                <input type="text" class="form-control item-notes">
            </div>
            <div class="col-md-1 d-flex align-items-end">
                <button type="button" class="btn btn-danger btn-sm w-100" onclick="this.closest('.shipment-item-row').remove()">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;

    container.appendChild(itemDiv);
}

async function confirmShipment(id) {
    if (!confirm('Confermare la spedizione? Verrà generato il PDF e inviate le notifiche.')) return;

    try {
        await apiCall(`/shipments/${id}/confirm`, 'POST');
        alert('Spedizione confermata con successo');
        loadShipments();
    } catch (error) {
        alert('Errore nella conferma della spedizione: ' + error.message);
    }
}

async function updateStatus(id, status) {
    try {
        await apiCall(`/shipments/${id}/status?status=${status}`, 'PUT');
        alert('Stato aggiornato');
        loadShipments();
    } catch (error) {
        alert('Errore nell\'aggiornamento dello stato: ' + error.message);
    }
}

async function downloadPDF(id, shipmentNumber) {
    try {
        const response = await fetch(`${API_BASE}/shipments/${id}/pdf`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                alert('PDF non disponibile. Conferma prima la spedizione.');
            } else {
                alert('Errore nel download del PDF');
            }
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${shipmentNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Errore nel download del PDF: ' + error.message);
    }
}

async function sendWhatsApp(id) {
    if (!confirm('Inviare il documento di trasporto via WhatsApp al negozio?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/shipments/${id}/send-whatsapp`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const message = await response.text();

        if (response.ok) {
            alert(message);
        } else {
            alert('Errore: ' + message);
        }
    } catch (error) {
        console.error('Error sending WhatsApp:', error);
        alert('Errore nell\'invio del messaggio WhatsApp: ' + error.message);
    }
}

async function viewShipment(id) {
    try {
        // Fetch shipment details and associated returns in parallel
        const [shipment, returns] = await Promise.all([
            apiCall(`/shipments/${id}`),
            apiCall(`/returns/shipment/${id}`).catch(() => []) // Return empty array if no returns or error
        ]);

        console.log('Shipment returns:', returns);

        const detailsHtml = `
            <div>
                <p><strong>Numero:</strong> ${shipment.shipmentNumber}</p>
                <p><strong>Data:</strong> ${formatDate(shipment.shipmentDate)}</p>
                <p><strong>Negozio:</strong> ${shipment.shop?.name} - ${shipment.shop?.city}</p>
                <p><strong>Autista:</strong> ${shipment.driver?.fullName || 'Non assegnato'}</p>
                <p><strong>Stato:</strong> <span class="badge status-${shipment.status}">${translateStatus(shipment.status)}</span></p>
                ${shipment.notes ? `<p><strong>Note:</strong> ${shipment.notes}</p>` : ''}

                <h6 class="mt-3"><i class="bi bi-box-seam"></i> Prodotti Spediti:</h6>
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Prodotto</th>
                            <th>Quantità</th>
                            <th>Prezzo</th>
                            <th>Totale</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(shipment.items || []).map(item => `
                            <tr>
                                <td>${item.product?.name}</td>
                                <td>${item.quantity} ${item.product?.unit}</td>
                                <td>€ ${item.unitPrice}</td>
                                <td>€ ${item.totalPrice}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <p class="text-end"><strong>Totale Spedizione: € ${(shipment.items || []).reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0).toFixed(2)}</strong></p>

                <hr class="my-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0"><i class="bi bi-arrow-return-left"></i> Resi Associati ${returns && returns.length > 0 ? `(${returns.length})` : ''}</h6>
                    ${shipment.status === 'CONSEGNATA' && ['ADMIN', 'ACCOUNTANT', 'SHOP'].includes(currentUser.role) ? `
                        <button class="btn btn-sm btn-success" onclick="createReturnFromShipment(${shipment.id})" title="Crea nuovo reso per questa spedizione">
                            <i class="bi bi-plus-circle"></i> Nuovo Reso
                        </button>
                    ` : ''}
                </div>
                ${returns && returns.length > 0 ? `
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Numero Reso</th>
                                    <th>Data</th>
                                    <th>Stato</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${returns.map(r => `
                                    <tr>
                                        <td>${r.returnNumber}</td>
                                        <td>${formatDate(r.returnDate)}</td>
                                        <td><span class="badge status-${r.status}">${translateReturnStatus(r.status)}</span></td>
                                        <td>
                                            <div class="btn-group btn-group-sm" role="group">
                                                <button class="btn btn-info" onclick="viewReturn(${r.id})" title="Visualizza dettagli reso">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                ${currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNTANT' ? `
                                                    ${r.status === 'PENDING' ? `
                                                        <button class="btn btn-success" onclick="updateReturnStatus(${r.id}, 'APPROVED'); setTimeout(() => viewShipment(${shipment.id}), 500);" title="Approva reso">
                                                            <i class="bi bi-check-circle"></i>
                                                        </button>
                                                        <button class="btn btn-warning" onclick="updateReturnStatus(${r.id}, 'REJECTED'); setTimeout(() => viewShipment(${shipment.id}), 500);" title="Rifiuta reso">
                                                            <i class="bi bi-x-circle"></i>
                                                        </button>
                                                    ` : ''}
                                                    ${r.status === 'APPROVED' ? `
                                                        <button class="btn btn-primary" onclick="updateReturnStatus(${r.id}, 'PROCESSED'); setTimeout(() => viewShipment(${shipment.id}), 500);" title="Elabora reso">
                                                            <i class="bi bi-check2-all"></i>
                                                        </button>
                                                    ` : ''}
                                                ` : ''}
                                                ${currentUser.role === 'ADMIN' && (r.status === 'PENDING' || r.status === 'REJECTED') ? `
                                                    <button class="btn btn-danger" onclick="deleteReturnFromShipment(${r.id}, ${shipment.id})" title="Elimina reso">
                                                        <i class="bi bi-trash"></i>
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <p class="text-muted small"><i class="bi bi-info-circle"></i> Totale resi: ${returns.length}</p>
                ` : `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> Nessun reso associato a questa spedizione
                        ${shipment.status === 'CONSEGNATA' ? '<br><small>Clicca "Nuovo Reso" per creare un reso.</small>' : '<br><small>La spedizione deve essere DELIVERED per creare resi.</small>'}
                    </div>
                `}
            </div>
        `;

        document.getElementById('shipmentDetailsBody').innerHTML = detailsHtml;
        showModal('shipmentDetailsModal');
    } catch (error) {
        console.error('Error loading shipment details:', error);
        alert('Errore nel caricamento dei dettagli');
    }
}

async function createReturnFromShipment(shipmentId) {
    try {
        // Track that return is being created from shipment view
        returnCreatedFromShipmentId = shipmentId;

        // Close shipment details modal
        hideModal('shipmentDetailsModal');

        // Load shipment details
        const shipment = await apiCall(`/shipments/${shipmentId}`);

        // Prepare return modal with pre-selected shipment
        const modal = new bootstrap.Modal(document.getElementById('returnModal'));
        document.getElementById('returnModalLabel').textContent = 'Nuovo Reso';
        document.getElementById('returnForm').reset();
        document.getElementById('returnItems').innerHTML = '';

        // Populate shipment dropdown with only this shipment
        const shipmentSelect = document.getElementById('returnShipment');
        shipmentSelect.innerHTML = `<option value="${shipment.id}" selected>${shipment.shipmentNumber} - ${shipment.shop?.name || 'N/A'} (${formatDate(shipment.shipmentDate)})</option>`;

        // Auto-populate shop
        document.getElementById('returnShopId').value = shipment.shop.id;

        // Display returnable items
        displayReturnableItems(shipment.items);
        currentShipmentForReturn = shipment;

        modal.show();
    } catch (error) {
        console.error('Error creating return from shipment:', error);
        alert('Errore nella creazione del reso: ' + (error.message || 'Errore sconosciuto'));
    }
}

async function deleteReturnFromShipment(returnId, shipmentId) {
    if (!confirm('Sei sicuro di voler eliminare questo reso?')) {
        return;
    }

    try {
        await apiCall(`/returns/${returnId}`, 'DELETE');
        alert('Reso eliminato con successo');

        // Refresh shipment details to show updated returns list
        viewShipment(shipmentId);
    } catch (error) {
        console.error('Error deleting return:', error);
        alert('Errore nell\'eliminazione del reso: ' + (error.message || 'Errore sconosciuto'));
    }
}

function showModal(modalId) {
    const modalEl = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Reinitialize datepickers in the modal after a short delay
    setTimeout(() => {
        if (typeof initializeDatepickers === 'function') {
            initializeDatepickers();
        }
    }, 100);
}

function hideModal(modalId) {
    const modalEl = document.getElementById(modalId);
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT');
}

function translateStatus(status) {
    const translations = {
        'BOZZA': 'Bozza',
        'IN_CONSEGNA': 'In Consegna',
        'CONSEGNATA': 'Consegnata'
    };
    return translations[status] || status;
}

function translateCategory(category) {
    const translations = {
        'BREAD': 'Pane',
        'PASTRY': 'Pasticceria',
        'PIZZA': 'Pizza',
        'FOCACCIA': 'Focaccia',
        'COOKIE': 'Biscotti',
        'CAKE': 'Torte',
        'OTHER': 'Altro'
    };
    return translations[category] || category;
}

// ================== RETURNS MANAGEMENT ==================

let allShipments = [];
let currentShipmentForReturn = null;

function showReturns() {
    hideAllSections();
    document.getElementById('returnsSection').style.display = 'block';
    loadReturns();
}

async function loadReturns() {
    const container = document.getElementById('returnsList');
    container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"></div></div>';

    try {
        let returns;
        if (currentUser.role === 'SHOP') {
            const shopUser = await apiCall('/users/me');
            returns = await apiCall(`/returns/shop/${shopUser.shopId}`);
        } else {
            returns = await apiCall('/returns');
        }

        displayReturns(returns);
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento dei resi</div>';
    }
}

function displayReturns(returns) {
    const container = document.getElementById('returnsList');

    if (!returns || returns.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nessun reso trovato</div>';
        return;
    }

    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#returnsTable')) {
        $('#returnsTable').DataTable().destroy();
    }

    const html = `
        <div class="table-responsive">
            <table id="returnsTable" class="table table-striped table-hover" style="width:100%">
                <thead>
                    <tr>
                        <th>Numero</th>
                        <th>Data</th>
                        <th>Spedizione</th>
                        <th>Negozio</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${returns.map(r => `
                        <tr>
                            <td>${r.returnNumber}</td>
                            <td data-order="${r.returnDate}">${formatDate(r.returnDate)}</td>
                            <td>${r.shipment?.shipmentNumber || '-'}</td>
                            <td>${r.shop?.name || '-'}</td>
                            <td><span class="badge status-${r.status}">${translateReturnStatus(r.status)}</span></td>
                            <td>
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-info" onclick="viewReturn(${r.id})" title="Visualizza dettagli">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    ${currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNTANT' ? `
                                        ${r.status === 'PENDING' ? `
                                            <button class="btn btn-success" onclick="updateReturnStatus(${r.id}, 'APPROVED')" title="Approva reso">
                                                <i class="bi bi-check-circle"></i>
                                            </button>
                                            <button class="btn btn-warning" onclick="updateReturnStatus(${r.id}, 'REJECTED')" title="Rifiuta reso">
                                                <i class="bi bi-x-circle"></i>
                                            </button>
                                        ` : ''}
                                        ${r.status === 'APPROVED' ? `
                                            <button class="btn btn-primary" onclick="updateReturnStatus(${r.id}, 'PROCESSED')" title="Elabora reso">
                                                <i class="bi bi-check2-all"></i>
                                            </button>
                                        ` : ''}
                                    ` : ''}
                                    ${currentUser.role === 'ADMIN' && (r.status === 'PENDING' || r.status === 'REJECTED') ? `
                                        <button class="btn btn-danger" onclick="deleteReturn(${r.id})" title="Elimina reso">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    // Initialize DataTable
    $('#returnsTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/it-IT.json'
        },
        responsive: true,
        pageLength: 25,
        order: [[1, 'desc']], // Order by date descending
        columnDefs: [
            { orderable: false, targets: 5 } // Disable sorting on Actions column
        ]
    });
}

async function showNewReturnModal() {
    // Reset the shipment tracking variable (not creating from shipment view)
    returnCreatedFromShipmentId = null;

    // Load shipments for selection
    try {
        allShipments = await apiCall('/shipments');
        console.log('Loaded shipments:', allShipments);

        const modal = new bootstrap.Modal(document.getElementById('returnModal'));
        document.getElementById('returnModalLabel').textContent = 'Nuovo Reso';
        document.getElementById('returnForm').reset();
        document.getElementById('returnItems').innerHTML = '';

        // Filter delivered shipments
        const deliveredShipments = allShipments.filter(s => s.status === 'CONSEGNATA');
        console.log('Delivered shipments:', deliveredShipments);

        // Populate shipment dropdown
        const shipmentSelect = document.getElementById('returnShipment');

        if (deliveredShipments.length === 0) {
            shipmentSelect.innerHTML = '<option value="">Nessuna spedizione consegnata disponibile</option>';
            alert('Attenzione: Non ci sono spedizioni con stato DELIVERED. Per creare un reso, è necessario avere almeno una spedizione consegnata.');
        } else {
            shipmentSelect.innerHTML = '<option value="">Seleziona una spedizione...</option>' +
                deliveredShipments.map(s =>
                    `<option value="${s.id}">${s.shipmentNumber} - ${s.shop?.name || 'N/A'} (${formatDate(s.shipmentDate)})</option>`
                ).join('');
        }

        modal.show();
    } catch (error) {
        console.error('Error loading shipments:', error);
        alert('Errore nel caricamento delle spedizioni: ' + (error.message || 'Errore sconosciuto'));
    }
}

async function onShipmentSelected() {
    const shipmentId = document.getElementById('returnShipment').value;
    if (!shipmentId) {
        document.getElementById('returnItems').innerHTML = '';
        return;
    }

    try {
        const shipment = await apiCall(`/shipments/${shipmentId}`);
        currentShipmentForReturn = shipment;

        // Populate shop automatically
        document.getElementById('returnShopId').value = shipment.shop.id;

        // Show available items from the shipment
        displayReturnableItems(shipment.items);
    } catch (error) {
        alert('Errore nel caricamento dei dettagli della spedizione');
    }
}

function displayReturnableItems(shipmentItems) {
    const container = document.getElementById('returnItems');

    const html = shipmentItems.map((item, index) => `
        <div class="return-item-row mb-3 p-3 border rounded">
            <div class="row g-2 align-items-center">
                <div class="col-md-4">
                    <label class="form-label">Prodotto</label>
                    <input type="text" class="form-control" value="${item.product.name}" readonly>
                    <input type="hidden" class="item-product-id" value="${item.product.id}">
                    <input type="hidden" class="item-shipment-item-id" value="${item.id}">
                </div>
                <div class="col-md-2">
                    <label class="form-label">Quantità Consegnata</label>
                    <input type="number" class="form-control" value="${item.quantity}" readonly>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Quantità Resa *</label>
                    <input type="number" step="0.1" min="0" max="${item.quantity}"
                           class="form-control item-return-quantity" value="0">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Motivo *</label>
                    <select class="form-select item-return-reason">
                        <option value="">Seleziona...</option>
                        <option value="DAMAGED">Danneggiato</option>
                        <option value="EXPIRED">Scaduto</option>
                        <option value="WRONG_PRODUCT">Prodotto Errato</option>
                        <option value="EXCESS_QUANTITY">Quantità Eccessiva</option>
                        <option value="QUALITY_ISSUE">Problema Qualità</option>
                        <option value="OTHER">Altro</option>
                    </select>
                </div>
                <div class="col-12">
                    <label class="form-label">Note</label>
                    <input type="text" class="form-control item-return-notes" placeholder="Note aggiuntive...">
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

document.getElementById('returnForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const shipmentId = document.getElementById('returnShipment').value;
    const shopId = document.getElementById('returnShopId').value;
    const returnDate = document.getElementById('returnDate').value;
    const reason = document.getElementById('returnReason').value;
    const notes = document.getElementById('returnNotes').value;

    // Collect items with quantity > 0
    const items = [];
    document.querySelectorAll('.return-item-row').forEach(row => {
        const quantity = parseFloat(row.querySelector('.item-return-quantity').value);
        if (quantity > 0) {
            const returnReason = row.querySelector('.item-return-reason').value;
            if (!returnReason) {
                alert('Seleziona un motivo per tutti gli articoli resi');
                throw new Error('Missing return reason');
            }

            items.push({
                shipmentItemId: parseInt(row.querySelector('.item-shipment-item-id').value),
                productId: parseInt(row.querySelector('.item-product-id').value),
                quantity: quantity,
                reason: returnReason,
                notes: row.querySelector('.item-return-notes').value
            });
        }
    });

    if (items.length === 0) {
        alert('Inserisci almeno un articolo da rendere');
        return;
    }

    const returnData = {
        shipmentId: parseInt(shipmentId),
        shopId: parseInt(shopId),
        returnDate: returnDate,
        reason: reason,
        notes: notes,
        items: items
    };

    console.log('Creating return with data:', returnData);
    console.log('Current user:', currentUser);

    try {
        await apiCall('/returns', 'POST', returnData);
        hideModal('returnModal');
        alert('Reso creato con successo');

        // If return was created from shipment view, reload shipment details
        if (returnCreatedFromShipmentId) {
            setTimeout(() => {
                viewShipment(returnCreatedFromShipmentId);
                returnCreatedFromShipmentId = null; // Reset
            }, 500);
        } else {
            loadReturns();
        }
    } catch (error) {
        console.error('Error creating return:', error);
        console.error('Return data was:', returnData);
        alert('Errore nella creazione del reso: ' + error.message);
    }
});

async function viewReturn(id) {
    try {
        const returnEntity = await apiCall(`/returns/${id}`);

        let itemsHtml = '<table class="table table-sm"><thead><tr><th>Prodotto</th><th>Quantità</th><th>Prezzo</th><th>Totale</th><th>Motivo</th></tr></thead><tbody>';
        let total = 0;

        returnEntity.items.forEach(item => {
            const itemTotal = item.quantity * item.unitPrice;
            total += itemTotal;
            itemsHtml += `
                <tr>
                    <td>${item.product.name}</td>
                    <td>${item.quantity} ${item.product.unit}</td>
                    <td>€${item.unitPrice.toFixed(2)}</td>
                    <td>€${itemTotal.toFixed(2)}</td>
                    <td>${translateReturnReason(item.reason)}</td>
                </tr>
            `;
        });

        itemsHtml += `</tbody><tfoot><tr><th colspan="3">Totale</th><th colspan="2">€${total.toFixed(2)}</th></tr></tfoot></table>`;

        const html = `
            <div class="mb-3">
                <strong>Numero Reso:</strong> ${returnEntity.returnNumber}<br>
                <strong>Data:</strong> ${formatDate(returnEntity.returnDate)}<br>
                <strong>Spedizione:</strong> ${returnEntity.shipment.shipmentNumber}<br>
                <strong>Negozio:</strong> ${returnEntity.shop.name}<br>
                <strong>Stato:</strong> <span class="badge status-${returnEntity.status}">${translateReturnStatus(returnEntity.status)}</span>
            </div>
            ${returnEntity.reason ? `<div class="mb-3"><strong>Motivo Generale:</strong> ${returnEntity.reason}</div>` : ''}
            ${returnEntity.notes ? `<div class="mb-3"><strong>Note:</strong> ${returnEntity.notes}</div>` : ''}
            <h6>Articoli Resi:</h6>
            ${itemsHtml}
            ${returnEntity.processedBy ? `
                <div class="mt-3">
                    <small class="text-muted">Elaborato da ${returnEntity.processedBy.fullName} il ${formatDate(returnEntity.processedAt)}</small>
                </div>
            ` : ''}
        `;

        document.getElementById('returnDetailsBody').innerHTML = html;
        const modal = new bootstrap.Modal(document.getElementById('returnDetailsModal'));
        modal.show();
    } catch (error) {
        alert('Errore nel caricamento dei dettagli del reso');
    }
}

async function updateReturnStatus(id, status) {
    const confirmMsg = status === 'APPROVED' ? 'Confermi l\'approvazione di questo reso?' :
                       status === 'REJECTED' ? 'Confermi il rifiuto di questo reso?' :
                       status === 'PROCESSED' ? 'Confermi l\'elaborazione di questo reso?' :
                       'Confermi il cambio di stato?';

    if (!confirm(confirmMsg)) return;

    try {
        await apiCall(`/returns/${id}/status?status=${status}`, 'PUT');
        loadReturns();
        alert('Stato aggiornato con successo');
    } catch (error) {
        alert('Errore nell\'aggiornamento dello stato');
    }
}

async function deleteReturn(id) {
    if (!confirm('Sei sicuro di voler eliminare questo reso?')) return;

    try {
        await apiCall(`/returns/${id}`, 'DELETE');
        loadReturns();
        alert('Reso eliminato con successo');
    } catch (error) {
        alert('Errore nell\'eliminazione del reso');
    }
}

function translateReturnStatus(status) {
    const translations = {
        'PENDING': 'In Attesa',
        'APPROVED': 'Approvato',
        'REJECTED': 'Rifiutato',
        'PROCESSED': 'Elaborato',
        'CANCELLED': 'Annullato'
    };
    return translations[status] || status;
}

function translateReturnReason(reason) {
    const translations = {
        'DAMAGED': 'Danneggiato',
        'EXPIRED': 'Scaduto',
        'WRONG_PRODUCT': 'Prodotto Errato',
        'EXCESS_QUANTITY': 'Quantità Eccessiva',
        'QUALITY_ISSUE': 'Problema Qualità',
        'OTHER': 'Altro'
    };
    return translations[reason] || reason;
}

// ======================== USERS MANAGEMENT ========================

function showUsers() {
    hideAllSections();
    document.getElementById('usersSection').style.display = 'block';
    loadUsers();
}

async function loadUsers() {
    try {
        const users = await apiCall('/users');
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersList').innerHTML = '<div class="alert alert-danger">Errore nel caricamento degli utenti</div>';
    }
}

function displayUsers(users) {
    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#usersTable')) {
        $('#usersTable').DataTable().destroy();
    }

    const container = document.getElementById('usersList');

    if (!users || users.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nessun utente trovato</div>';
        return;
    }

    const html = `
        <table id="usersTable" class="table table-striped table-hover" style="width:100%">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Nome Completo</th>
                    <th>Email</th>
                    <th>Ruolo</th>
                    <th>Negozio</th>
                    <th>Stato</th>
                    <th>Azioni</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.fullName || 'N/A'}</td>
                        <td>${user.email || 'N/A'}</td>
                        <td><span class="badge bg-info">${translateRole(user.role)}</span></td>
                        <td>${user.shop ? `${user.shop.name} - ${user.shop.city}` : '-'}</td>
                        <td>
                            ${user.active ?
                                '<span class="badge bg-success">Attivo</span>' :
                                '<span class="badge bg-secondary">Disattivato</span>'}
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})" title="Modifica">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm ${user.active ? 'btn-warning' : 'btn-success'}"
                                    onclick="toggleUserActive(${user.id})"
                                    title="${user.active ? 'Disattiva' : 'Attiva'}">
                                <i class="bi bi-${user.active ? 'x-circle' : 'check-circle'}"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="Elimina">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;

    // Initialize DataTable
    $('#usersTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/it-IT.json'
        },
        responsive: true,
        pageLength: 25,
        order: [[1, 'asc']], // Sort by full name
        columnDefs: [
            { orderable: false, targets: 6 } // Actions column
        ]
    });
}

function showNewUserModal() {
    document.getElementById('userModalTitle').textContent = 'Nuovo Utente';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userUsername').disabled = false;
    document.getElementById('userPassword').required = true;
    document.getElementById('passwordOptionalLabel').style.display = 'none';
    document.getElementById('userActive').checked = true;

    // Populate shop dropdown
    const shopSelect = document.getElementById('userShop');
    shopSelect.innerHTML = '<option value="">Seleziona negozio...</option>' +
        allShops.map(s => `<option value="${s.id}">${s.name} - ${s.city}</option>`).join('');

    // Hide shop field initially
    document.getElementById('userShopField').style.display = 'none';

    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

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

async function editUser(id) {
    try {
        const user = await apiCall(`/users/${id}`);

        document.getElementById('userModalTitle').textContent = 'Modifica Utente';
        document.getElementById('userId').value = user.id;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userUsername').disabled = true; // Can't change username
        document.getElementById('userPassword').value = '';
        document.getElementById('userPassword').required = false;
        document.getElementById('passwordOptionalLabel').style.display = 'inline';
        document.getElementById('userFullName').value = user.fullName || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPhone').value = user.phone || '';
        document.getElementById('userWhatsapp').value = user.whatsappNumber || '';
        document.getElementById('userRole').value = user.role;
        document.getElementById('userActive').checked = user.active;

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

        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading user:', error);
        alert('Errore nel caricamento dell\'utente');
    }
}

async function saveUser() {
    const id = document.getElementById('userId').value;
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const fullName = document.getElementById('userFullName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const phone = document.getElementById('userPhone').value.trim();
    const whatsapp = document.getElementById('userWhatsapp').value.trim();
    const role = document.getElementById('userRole').value;
    const active = document.getElementById('userActive').checked;
    const shopId = document.getElementById('userShop').value;

    // Validation
    if (!username || !fullName || !email || !role) {
        alert('Compila tutti i campi obbligatori');
        return;
    }

    if (!id && !password) {
        alert('La password è obbligatoria per i nuovi utenti');
        return;
    }

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

    // Only include password if provided
    if (password) {
        userData.password = password;
    }

    try {
        if (id) {
            await apiCall(`/users/${id}`, 'PUT', userData);
            alert('Utente aggiornato con successo');
        } else {
            await apiCall('/users', 'POST', userData);
            alert('Utente creato con successo');
        }

        hideModal('userModal');
        loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Errore nel salvataggio: ' + (error.message || 'Errore sconosciuto'));
    }
}

async function toggleUserActive(id) {
    try {
        await apiCall(`/users/${id}/toggle-active`, 'PUT');
        loadUsers();
        alert('Stato utente aggiornato');
    } catch (error) {
        console.error('Error toggling user status:', error);
        alert('Errore nell\'aggiornamento dello stato');
    }
}

async function deleteUser(id) {
    if (!confirm('Sei sicuro di voler eliminare questo utente? Questa azione è irreversibile.')) {
        return;
    }

    try {
        await apiCall(`/users/${id}`, 'DELETE');
        loadUsers();
        alert('Utente eliminato con successo');
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Errore nell\'eliminazione dell\'utente');
    }
}

function translateRole(role) {
    const translations = {
        'ADMIN': 'Amministratore',
        'ACCOUNTANT': 'Contabile',
        'DRIVER': 'Autista',
        'SHOP': 'Negozio'
    };
    return translations[role] || role;
}
