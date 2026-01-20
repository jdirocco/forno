// Reports JavaScript
let shipmentsTable;
let reportData = null; // Store latest report data

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    checkReportsPermission();
    updateMenu();
    initializeDatepickers();
    loadShops();
    loadDrivers();
    setDefaultDates();
    loadDashboard();
    initializeTables();
});

// Check if user has permission to view reports
function checkReportsPermission() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role;
    if (userRole !== 'ADMIN' && userRole !== 'ACCOUNTANT') {
        alert('Non hai i permessi per accedere a questa pagina');
        window.location.href = 'index.html';
    }
}

// Update menu items based on user role
function updateMenu() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role;

    // Show user info
    document.getElementById('userInfo').textContent = `${user.fullName} (${userRole})`;

    // Show/hide menu items based on role
    if (userRole === 'ADMIN') {
        document.getElementById('usersMenuItem').style.display = 'block';
        document.getElementById('reportsMenuItem').style.display = 'block';
    } else if (userRole === 'ACCOUNTANT') {
        document.getElementById('reportsMenuItem').style.display = 'block';
    }
}

// Check auth function
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

// Initialize datepickers
function initializeDatepickers() {
    $('.datepicker').datepicker({
        format: 'yyyy-mm-dd',
        language: 'it',
        autoclose: true,
        todayHighlight: true
    });
}

// Set default dates (first day of current month to today)
function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    $('#startDate').datepicker('setDate', firstDay);
    $('#endDate').datepicker('setDate', today);
}

// Load shops for filter
async function loadShops() {
    try {
        const response = await fetch('/api/shops', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const shops = await response.json();
            const shopFilter = document.getElementById('shopFilter');
            shopFilter.innerHTML = '<option value="">Tutti i negozi</option>';

            shops.forEach(shop => {
                const option = document.createElement('option');
                option.value = shop.id;
                option.textContent = `${shop.code} - ${shop.name}`;
                shopFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading shops:', error);
    }
}

// Load drivers for filter
async function loadDrivers() {
    try {
        const response = await fetch('/api/users?role=DRIVER', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const drivers = await response.json();
            const driverFilter = document.getElementById('driverFilter');
            driverFilter.innerHTML = '<option value="">Tutti gli autisti</option>';

            drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = driver.fullName;
                driverFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading drivers:', error);
    }
}

// Load dashboard statistics
async function loadDashboard() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();

    if (!startDate || !endDate) {
        alert('Seleziona un periodo valido');
        return;
    }

    // Build query parameters
    let params = new URLSearchParams({
        startDate: startDate,
        endDate: endDate
    });

    // Add optional filters
    const shopId = $('#shopFilter').val();
    if (shopId) {
        params.append('shopId', shopId);
    }

    const driverId = $('#driverFilter').val();
    if (driverId) {
        params.append('driverId', driverId);
    }

    // Add multi-select status filter
    const statusFilter = $('#statusFilter').val();
    if (statusFilter && statusFilter.length > 0) {
        statusFilter.forEach(status => {
            params.append('statuses', status);
        });
    }

    // Add chart grouping
    const chartGroupBy = $('#chartGroupBy').val() || 'MONTHLY';
    params.append('chartGroupBy', chartGroupBy);

    try {
        const response = await fetch(`/api/reports/dashboard?${params.toString()}`, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            reportData = await response.json();
            updateDashboard(reportData);
            await loadShipments(); // Load shipments table
            updateProductTables(reportData); // Update product aggregates
        } else {
            alert('Errore nel caricamento delle statistiche');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Errore nel caricamento delle statistiche');
    }
}

// Update dashboard cards
function updateDashboard(data) {
    // Update summary totals from new API structure
    const summary = data.summary;

    // For shipment count, we need to query the filtered shipments or calculate from tables
    // For now, we'll display the items count
    document.getElementById('totalShipments').textContent = summary.totalShipmentItems || 0;
    document.getElementById('totalShipmentsValue').textContent = '€ ' + parseFloat(summary.totalShipmentAmount || 0).toFixed(2);
    document.getElementById('totalReturns').textContent = summary.totalReturnItems || 0;
    document.getElementById('netRevenue').textContent = '€ ' + parseFloat(summary.netTotal || 0).toFixed(2);

    // Calculate return rate
    const totalItems = summary.totalShipmentItems || 1;
    const returnRate = totalItems > 0 ? ((summary.totalReturnItems / totalItems) * 100).toFixed(2) : '0.00';
    document.getElementById('returnRate').textContent = returnRate;

    // Update shipment breakdown text
    document.getElementById('shipmentBreakdown').textContent = `Totale Prodotti: ${summary.totalShipmentItems} | Totale: €${parseFloat(summary.totalShipmentAmount || 0).toFixed(2)}`;

    // Update return breakdown text
    document.getElementById('returnBreakdown').textContent = `Totale Resi: ${summary.totalReturnItems} | Totale: €${parseFloat(summary.totalReturnAmount || 0).toFixed(2)}`;
}

// Initialize DataTables
function initializeTables() {
    shipmentsTable = $('#shipmentsReportTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/it-IT.json'
        },
        order: [[1, 'desc']], // Sort by date descending
        paging: true,
        pageLength: 25
    });

    // Add click handler for table rows
    $('#shipmentsReportTable tbody').on('click', 'tr', function() {
        const data = shipmentsTable.row(this).data();
        if (data && data[0]) {
            // Extract shipment ID from the row data (we'll store it in a data attribute)
            const shipmentId = $(this).data('shipment-id');
            if (shipmentId) {
                window.location.href = `shipment-detail.html?id=${shipmentId}`;
            }
        }
    });
}

// Load shipments with integrated returns data
async function loadShipments() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();

    if (!startDate || !endDate) {
        return;
    }

    // Build query parameters (same as dashboard)
    let params = new URLSearchParams({
        startDate: startDate,
        endDate: endDate
    });

    // Add optional filters
    const shopId = $('#shopFilter').val();
    if (shopId) {
        params.append('shopId', shopId);
    }

    const driverId = $('#driverFilter').val();
    if (driverId) {
        params.append('driverId', driverId);
    }

    // Add multi-select status filter
    const statusFilter = $('#statusFilter').val();
    if (statusFilter && statusFilter.length > 0) {
        statusFilter.forEach(status => {
            params.append('statuses', status);
        });
    }

    try {
        const response = await fetch(`/api/shipments?${params.toString()}`, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const shipments = await response.json();
            displayShipmentsTable(shipments);
        }
    } catch (error) {
        console.error('Error loading shipments:', error);
    }
}

// Display shipments in table with integrated returns columns
function displayShipmentsTable(shipments) {
    shipmentsTable.clear();

    shipments.forEach(shipment => {
        // Calculate shipment items totals
        const shipmentItems = shipment.items.filter(item => item.itemType === 'SHIPMENT');
        const numProducts = shipmentItems.length;
        const totalProducts = shipmentItems.reduce((sum, item) =>
            sum + parseFloat(item.totalPrice || 0), 0);

        // Calculate return items totals
        const returnItems = shipment.items.filter(item => item.itemType === 'RETURN');
        const numReturns = returnItems.length;
        const totalReturns = returnItems.reduce((sum, item) =>
            sum + parseFloat(item.totalPrice || 0), 0);

        // Calculate net total
        const netTotal = totalProducts - totalReturns;

        // Create row with data attribute for click handling
        const rowNode = shipmentsTable.row.add([
            shipment.shipmentNumber,
            new Date(shipment.shipmentDate).toLocaleDateString('it-IT'),
            shipment.shop ? `${shipment.shop.code} - ${shipment.shop.name}` : '-',
            shipment.driver ? shipment.driver.fullName : '-',
            getStatusBadge(shipment.status),
            numProducts,
            '€ ' + totalProducts.toFixed(2),
            numReturns,
            '€ ' + totalReturns.toFixed(2),
            '€ ' + netTotal.toFixed(2)
        ]).draw(false).node();

        // Store shipment ID in row for click handler
        $(rowNode).attr('data-shipment-id', shipment.id);
    });

    shipmentsTable.draw();
}

// Update product aggregate tables
function updateProductTables(data) {
    // Products Sold
    const productsSoldBody = document.getElementById('productsSoldBody');
    if (data.productsSold && data.productsSold.length > 0) {
        productsSoldBody.innerHTML = '';
        data.productsSold.forEach(product => {
            const row = `
                <tr>
                    <td>${product.productName}</td>
                    <td>${product.productCode}</td>
                    <td>${parseFloat(product.quantity).toFixed(0)}</td>
                    <td>€ ${parseFloat(product.totalAmount).toFixed(2)}</td>
                </tr>
            `;
            productsSoldBody.innerHTML += row;
        });
    } else {
        productsSoldBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nessun dato disponibile</td></tr>';
    }

    // Products Returned
    const productsReturnedBody = document.getElementById('productsReturnedBody');
    if (data.productsReturned && data.productsReturned.length > 0) {
        productsReturnedBody.innerHTML = '';
        data.productsReturned.forEach(product => {
            const row = `
                <tr>
                    <td>${product.productName}</td>
                    <td>${product.productCode}</td>
                    <td>${parseFloat(product.quantity).toFixed(0)}</td>
                    <td>€ ${parseFloat(product.totalAmount).toFixed(2)}</td>
                </tr>
            `;
            productsReturnedBody.innerHTML += row;
        });
    } else {
        productsReturnedBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nessun dato disponibile</td></tr>';
    }
}

// Get status badge HTML
function getStatusBadge(status) {
    const badges = {
        'BOZZA': '<span class="badge bg-secondary">Bozza</span>',
        'IN_CONSEGNA': '<span class="badge bg-primary">In Consegna</span>',
        'CONSEGNATA': '<span class="badge bg-success">Consegnata</span>'
    };
    return badges[status] || status;
}

// Export all report data to Excel (CSV format)
function exportToExcel() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();

    // Get data from DataTable
    const data = shipmentsTable.rows().data().toArray();

    if (data.length === 0) {
        alert('Nessun dato da esportare');
        return;
    }

    // Create CSV content with new columns
    let csv = 'Numero,Data,Negozio,Autista,Stato,N° Prodotti,Totale Prodotti,N° Resi,Totale Resi,Netto\n';
    data.forEach(row => {
        // Remove HTML tags from status badge
        const status = row[4].replace(/<[^>]*>/g, '');
        csv += `"${row[0]}","${row[1]}","${row[2]}","${row[3]}","${status}","${row[5]}","${row[6]}","${row[7]}","${row[8]}","${row[9]}"\n`;
    });

    // Add product aggregates section if available
    if (reportData && reportData.productsSold && reportData.productsSold.length > 0) {
        csv += '\n\nProdotti Venduti\n';
        csv += 'Prodotto,Codice,Quantità,Totale\n';
        reportData.productsSold.forEach(product => {
            csv += `"${product.productName}","${product.productCode}","${parseFloat(product.quantity).toFixed(0)}","€ ${parseFloat(product.totalAmount).toFixed(2)}"\n`;
        });
    }

    if (reportData && reportData.productsReturned && reportData.productsReturned.length > 0) {
        csv += '\n\nProdotti Resi\n';
        csv += 'Prodotto,Codice,Quantità,Totale\n';
        reportData.productsReturned.forEach(product => {
            csv += `"${product.productName}","${product.productCode}","${parseFloat(product.quantity).toFixed(0)}","€ ${parseFloat(product.totalAmount).toFixed(2)}"\n`;
        });
    }

    // Download CSV
    downloadCSV(csv, `report_completo_${startDate}_${endDate}.csv`);
}

// Download CSV file
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
