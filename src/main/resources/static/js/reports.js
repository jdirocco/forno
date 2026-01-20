// Reports JavaScript
let shipmentsTable;
let reportData = null; // Store latest report data
let revenueChart = null; // Chart.js instance
let currentUser = JSON.parse(localStorage.getItem('user') || '{}');

function getSelectedShopId() {
    if (currentUser.role === 'SHOP') {
        return currentUser.shopId ? currentUser.shopId.toString() : null;
    }
    const value = $('#shopFilter').val();
    return value ? value.toString() : null;
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    checkAuth();
    await ensureShopContext();
    checkReportsPermission();
    updateMenu();
    initializeDatepickers();
    loadShops();
    loadDrivers();
    setDefaultDates();
    loadDashboard();
    initializeTables();
});

async function ensureShopContext() {
    if (!currentUser || currentUser.role !== 'SHOP' || currentUser.shopId) {
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const profile = await response.json();
            currentUser = {
                ...currentUser,
                username: profile.username ?? currentUser.username,
                fullName: profile.fullName ?? currentUser.fullName,
                role: profile.role ?? currentUser.role,
                shopId: profile.shopId ?? null,
                shopName: profile.shopName ?? null,
                shopCode: profile.shopCode ?? null
            };
            localStorage.setItem('user', JSON.stringify(currentUser));
        }
    } catch (error) {
        console.error('Errore nel recupero dei dettagli utente', error);
    }
}

// Check if user has permission to view reports
function checkReportsPermission() {
    if (!currentUser || !currentUser.role) {
        window.location.href = 'index.html';
        return;
    }

    const allowedRoles = ['ADMIN', 'ACCOUNTANT', 'SHOP'];
    const userRole = currentUser.role;
    if (!allowedRoles.includes(userRole)) {
        alert('Non hai i permessi per accedere a questa pagina');
        window.location.href = 'index.html';
        return;
    }

    if (userRole === 'SHOP' && !currentUser.shopId) {
        console.warn('Utente SHOP senza shopId lato front-end; continuo confidando nei filtri server.');
    }
}

// Update menu items based on user role
function updateMenu() {
    const userRole = currentUser.role;
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl && currentUser.fullName) {
        userInfoEl.textContent = `${currentUser.fullName} (${userRole})`;
    }

    const usersMenuItem = document.getElementById('usersMenuItem');
    if (usersMenuItem) {
        usersMenuItem.style.display = userRole === 'ADMIN' ? 'block' : 'none';
    }

    const reportsMenuItem = document.getElementById('reportsMenuItem');
    if (reportsMenuItem) {
        reportsMenuItem.style.display = ['ADMIN', 'ACCOUNTANT', 'SHOP'].includes(userRole) ? 'block' : 'none';
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
    const shopFilter = document.getElementById('shopFilter');
    if (!shopFilter) {
        return;
    }

    if (currentUser.role === 'SHOP') {
        const hasShop = Boolean(currentUser.shopId);
        shopFilter.innerHTML = '';

        const option = document.createElement('option');
        if (hasShop) {
            option.value = currentUser.shopId;
            const labelParts = [];
            if (currentUser.shopCode) labelParts.push(currentUser.shopCode);
            if (currentUser.shopName) labelParts.push(currentUser.shopName);
            option.textContent = labelParts.length > 0 ? labelParts.join(' - ') : 'Il tuo negozio';
        } else {
            option.value = '';
            option.textContent = 'Nessun negozio associato';
        }
        option.selected = true;
        shopFilter.appendChild(option);
        shopFilter.disabled = true;

        const shopLabel = document.querySelector('label[for="shopFilter"]');
        if (shopLabel) {
            shopLabel.innerHTML = 'Negozio <span class="badge bg-secondary ms-1">Filtro bloccato sul tuo negozio</span>';
        }

        return;
    }

    try {
        const response = await fetch('/api/shops', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const shops = await response.json();
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
    const shopId = currentUser.role === 'SHOP'
        ? currentUser.shopId
        : $('#shopFilter').val();
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
            updateChart(reportData); // Update Chart.js visualization
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
    const shopId = getSelectedShopId();
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
    const filteredShipments = filterShipmentsForReport(shipments);
    shipmentsTable.clear();

    filteredShipments.forEach(shipment => {
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

function filterShipmentsForReport(shipments) {
    if (!shipments || shipments.length === 0) {
        return [];
    }

    const startDateStr = $('#startDate').val();
    const endDateStr = $('#endDate').val();
    const shopId = getSelectedShopId();
    const driverId = $('#driverFilter').val();
    const statuses = $('#statusFilter').val() || [];

    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;

    return shipments.filter(shipment => {
        const shipmentDate = shipment.shipmentDate ? new Date(shipment.shipmentDate) : null;

        if (startDate && shipmentDate && shipmentDate < startDate) {
            return false;
        }
        if (endDate && shipmentDate && shipmentDate > endDate) {
            return false;
        }

        if (shopId && (!shipment.shop || String(shipment.shop.id) !== shopId)) {
            return false;
        }

        if (driverId && (!shipment.driver || String(shipment.driver.id) !== String(driverId))) {
            return false;
        }

        if (statuses.length > 0 && !statuses.includes(shipment.status)) {
            return false;
        }

        return true;
    });
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

// Update Chart.js visualization
function updateChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const chartData = data.chartData;
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        // No data, show message
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }

    // Destroy existing chart if it exists
    if (revenueChart) {
        revenueChart.destroy();
    }

    // Create new chart
    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'Spedizioni',
                    data: chartData.shipmentsData,
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Resi',
                    data: chartData.returnsData,
                    backgroundColor: 'rgba(255, 193, 7, 0.7)',
                    borderColor: 'rgba(255, 193, 7, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Netto',
                    data: chartData.netData,
                    backgroundColor: 'rgba(13, 110, 253, 0.7)',
                    borderColor: 'rgba(13, 110, 253, 1)',
                    borderWidth: 1,
                    type: 'line',
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: `Andamento ${getGroupByLabel(chartData.groupBy)}`,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += '€' + parseFloat(context.parsed.y).toFixed(2);
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toFixed(0);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Importo (€)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Periodo'
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

// Get human-readable label for chart grouping
function getGroupByLabel(groupBy) {
    const labels = {
        'DAILY': 'Giornaliero',
        'WEEKLY': 'Settimanale',
        'MONTHLY': 'Mensile'
    };
    return labels[groupBy] || groupBy;
}

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
