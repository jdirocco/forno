// Reports JavaScript
let shipmentsTable;
let returnsTable;

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
            const data = await response.json();
            updateDashboard(data);
            // Note: We'll update the table display functions later to use the new data structure
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
        order: [[1, 'desc']]
    });

    returnsTable = $('#returnsReportTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/it-IT.json'
        },
        order: [[1, 'desc']]
    });
}

// Load shipments report
async function loadShipmentsReport() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();
    const shopId = $('#shopFilter').val();

    let url = `/api/reports/shipments?startDate=${startDate}&endDate=${endDate}`;
    if (shopId) {
        url += `&shopId=${shopId}`;
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayShipmentsReport(data.shipments);
        }
    } catch (error) {
        console.error('Error loading shipments report:', error);
    }
}

// Display shipments in table
function displayShipmentsReport(shipments) {
    shipmentsTable.clear();

    shipments.forEach(shipment => {
        const totalAmount = shipment.items.reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0);

        shipmentsTable.row.add([
            shipment.shipmentNumber,
            new Date(shipment.shipmentDate).toLocaleDateString('it-IT'),
            shipment.shop ? `${shipment.shop.code} - ${shipment.shop.name}` : '-',
            shipment.driver ? shipment.driver.fullName : '-',
            getStatusBadge(shipment.status),
            '€ ' + totalAmount.toFixed(2)
        ]);
    });

    shipmentsTable.draw();
}

// Load returns report
async function loadReturnsReport() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();
    const shopId = $('#shopFilter').val();

    let url = `/api/reports/returns?startDate=${startDate}&endDate=${endDate}`;
    if (shopId) {
        url += `&shopId=${shopId}`;
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayReturnsReport(data.returns);
        }
    } catch (error) {
        console.error('Error loading returns report:', error);
    }
}

// Display returns in table
function displayReturnsReport(returns) {
    returnsTable.clear();

    returns.forEach(returnItem => {
        const totalAmount = returnItem.items.reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0);

        returnsTable.row.add([
            returnItem.returnNumber,
            new Date(returnItem.returnDate).toLocaleDateString('it-IT'),
            returnItem.shipment ? returnItem.shipment.shipmentNumber : '-',
            returnItem.shop ? `${returnItem.shop.code} - ${returnItem.shop.name}` : '-',
            getReturnStatusBadge(returnItem.status),
            '€ ' + totalAmount.toFixed(2)
        ]);
    });

    returnsTable.draw();
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

// Get return status badge HTML
function getReturnStatusBadge(status) {
    const badges = {
        'PENDING': '<span class="badge bg-warning">In Attesa</span>',
        'APPROVED': '<span class="badge bg-success">Approvato</span>',
        'REJECTED': '<span class="badge bg-danger">Rifiutato</span>',
        'PROCESSED': '<span class="badge bg-info">Processato</span>',
        'CANCELLED': '<span class="badge bg-secondary">Annullato</span>'
    };
    return badges[status] || status;
}

// Export shipments report to Excel
function exportShipmentsReport() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();
    const shopId = $('#shopFilter').val();

    // Get data from DataTable
    const data = shipmentsTable.rows().data().toArray();

    if (data.length === 0) {
        alert('Nessun dato da esportare');
        return;
    }

    // Create CSV content
    let csv = 'Numero,Data,Negozio,Driver,Stato,Importo Totale\n';
    data.forEach(row => {
        // Remove HTML tags from status badge
        const status = row[4].replace(/<[^>]*>/g, '');
        csv += `"${row[0]}","${row[1]}","${row[2]}","${row[3]}","${status}","${row[5]}"\n`;
    });

    // Download CSV
    downloadCSV(csv, `spedizioni_${startDate}_${endDate}.csv`);
}

// Export returns report to Excel
function exportReturnsReport() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();

    // Get data from DataTable
    const data = returnsTable.rows().data().toArray();

    if (data.length === 0) {
        alert('Nessun dato da esportare');
        return;
    }

    // Create CSV content
    let csv = 'Numero,Data,Spedizione,Negozio,Stato,Importo Totale\n';
    data.forEach(row => {
        // Remove HTML tags from status badge
        const status = row[4].replace(/<[^>]*>/g, '');
        csv += `"${row[0]}","${row[1]}","${row[2]}","${row[3]}","${status}","${row[5]}"\n`;
    });

    // Download CSV
    downloadCSV(csv, `resi_${startDate}_${endDate}.csv`);
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
