// Add these functions to app.js after showNewShipmentModal function

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

            const productSelect = lastRow.querySelector('.product-select');
            const quantityInput = lastRow.querySelector('.quantity-input');
            const notesInput = lastRow.querySelector('.notes-input');

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

// Also modify showNewShipmentModal to hide the import button initially:
// Add this line after reset:
// document.getElementById('importLastShipmentBtn').style.display = 'none';

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

// Modify the existing loadShipments function to accept filter parameters:
// async function loadShipments(startDate, endDate, shopId, status) {
//     const container = document.getElementById('shipmentsList');
//     container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"></div></div>';
//
//     try {
//         let url = '/shipments';
//         const params = new URLSearchParams();
//
//         if (startDate) params.append('startDate', startDate);
//         if (endDate) params.append('endDate', endDate);
//
//         if (params.toString()) {
//             url += '?' + params.toString();
//         }
//
//         let shipments = await apiCall(url);
//
//         // Filter by shop if specified
//         if (shopId) {
//             shipments = shipments.filter(s => s.shop && s.shop.id == shopId);
//         }
//
//         // Filter by status if specified
//         if (status) {
//             shipments = shipments.filter(s => s.status === status);
//         }
//
//         displayShipments(shipments);
//     } catch (error) {
//         container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento delle spedizioni</div>';
//     }
// }

// Also initialize filter shop dropdown in showShipments:
// const filterShopSelect = document.getElementById('filterShipmentShop');
// if (filterShopSelect && allShops.length > 0) {
//     filterShopSelect.innerHTML = '<option value="">Tutti i negozi</option>' +
//         allShops.map(s => `<option value="${s.id}">${s.name} - ${s.city}</option>`).join('');
// }

// ================== SHIPMENT TOTALS ==================

// Modify displayShipments to add totals row
// Add this before closing </tbody> in the table HTML:

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

// Add totals card after filters and before table
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

// Update displayShipments to include totals:
// const totals = calculateShipmentTotals(shipments);
// const totalsCard = renderShipmentTotalsCard(totals);
// container.innerHTML = totalsCard + html;

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
                                    ${s.status === 'IN_CONSEGNA' && (currentUser.role === 'DRIVER' || currentUser.role === 'ADMIN') ?
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
