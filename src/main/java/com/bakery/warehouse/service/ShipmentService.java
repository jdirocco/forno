package com.bakery.warehouse.service;

import com.bakery.warehouse.dto.ShipmentPageResponse;
import com.bakery.warehouse.dto.ShipmentRequest;
import com.bakery.warehouse.entity.*;
import com.bakery.warehouse.repository.ProductRepository;
import com.bakery.warehouse.repository.ShipmentItemRepository;
import com.bakery.warehouse.repository.ShipmentRepository;
import com.bakery.warehouse.repository.ShopRepository;
import com.bakery.warehouse.repository.UserRepository;
import com.bakery.warehouse.specification.ShipmentSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final ShipmentItemRepository shipmentItemRepository;
    private final PDFService pdfService;
    private final EmailService emailService;
    private final WhatsAppService whatsAppService;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    @Transactional
    public Shipment createShipment(Shipment shipment, User createdBy) {
        shipment.setCreatedBy(createdBy);
        shipment.setStatus(Shipment.ShipmentStatus.BOZZA);

        for (ShipmentItem item : shipment.getItems()) {
            item.setShipment(shipment);
        }

        return shipmentRepository.save(shipment);
    }

    @Transactional
    public Shipment confirmShipment(Long shipmentId) throws Exception {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        shipment.setStatus(Shipment.ShipmentStatus.IN_CONSEGNA);

        // String pdfPath = pdfService.generateShipmentPDF(shipment);
        // shipment.setPdfPath(pdfPath);

        Shipment savedShipment = shipmentRepository.save(shipment);

        sendNotifications(savedShipment);

        return savedShipment;
    }

    @Transactional
    public void sendNotifications(Shipment shipment) {
        try {
            emailService.sendShipmentEmail(shipment);
            shipment.setEmailSent(true);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }

        try {
            whatsAppService.sendShipmentWhatsApp(shipment);
            shipment.setWhatsappSent(true);
        } catch (Exception e) {
            System.err.println("Failed to send WhatsApp: " + e.getMessage());
        }

        shipmentRepository.save(shipment);
    }

    @Transactional
    public Shipment updateShipmentStatus(Long shipmentId, Shipment.ShipmentStatus status) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        Shipment.ShipmentStatus oldStatus = shipment.getStatus();
        shipment.setStatus(status);
        Shipment saved = shipmentRepository.save(shipment);

        // Send email when status changes to CONSEGNATA
        if (status == Shipment.ShipmentStatus.CONSEGNATA && oldStatus != Shipment.ShipmentStatus.CONSEGNATA) {
            try {
                if (shipment.getPdfPath() != null && !shipment.getPdfPath().isEmpty()) {
                    emailService.sendShipmentEmail(shipment);
                    shipment.setEmailSent(true);
                    saved = shipmentRepository.save(shipment);
                }
            } catch (Exception e) {
                System.err.println("Failed to send delivery email: " + e.getMessage());
            }
        }

        return saved;
    }

    public List<Shipment> getShipmentsByShop(Long shopId) {
        return shipmentRepository.findByShopAndDateRange(
                shopId,
                LocalDate.now().minusMonths(3),
                LocalDate.now()
        );
    }

    public Shipment getLastShipmentForShop(Long shopId) {
        List<Shipment> shipments = shipmentRepository.findByShopAndDateRange(
                shopId,
                LocalDate.now().minusMonths(1),
                LocalDate.now().minusDays(1)
        );

        return shipments.stream()
                .filter(s -> s.getStatus() != Shipment.ShipmentStatus.BOZZA)
                .max((s1, s2) -> s1.getShipmentDate().compareTo(s2.getShipmentDate()))
                .orElse(null);
    }

    public List<Shipment> getShipmentsByDriver(Long driverId, LocalDate date) {
        return shipmentRepository.findByDriverAndDate(driverId, date);
    }

    public List<Shipment> getShipmentsByDateRange(LocalDate startDate, LocalDate endDate) {
        return shipmentRepository.findByShipmentDateBetween(startDate, endDate);
    }

    public Shipment getShipmentById(Long id) {
        return shipmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));
    }

    @Transactional(readOnly = true)
    public Shipment getShipmentWithDetails(Long id) {
        return shipmentRepository.findDetailedById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));
    }

    @Transactional
    public Shipment regenerateShipmentPdf(Long id) {
        Shipment shipment = getShipmentWithDetails(id);
        try {
            String pdfPath = pdfService.generateShipmentPDF(shipment);
            shipment.setPdfPath(pdfPath);
            return shipmentRepository.save(shipment);
        } catch (Exception e) {
            throw new RuntimeException("Errore durante la generazione del PDF", e);
        }
    }

    public List<Shipment> getAllShipments() {
        return shipmentRepository.findAll();
    }

    @Transactional
    public void deleteShipment(Long id) {
        shipmentRepository.deleteById(id);
    }

    @Transactional
    public Shipment updateShipment(Long id, ShipmentRequest request) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        // Update basic shipment fields
        if (request.getShopId() != null) {
            Shop shop = shopRepository.findById(request.getShopId())
                    .orElseThrow(() -> new RuntimeException("Shop not found"));
            shipment.setShop(shop);
        }

        if (request.getDriverId() != null) {
            User driver = userRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new RuntimeException("Driver not found"));
            shipment.setDriver(driver);
        }

        if (request.getShipmentDate() != null) {
            shipment.setShipmentDate(request.getShipmentDate());
        }

        if (request.getNotes() != null) {
            shipment.setNotes(request.getNotes());
        }

        if (request.getReturnDate() != null) {
            shipment.setReturnDate(request.getReturnDate());
        }

        if (request.getReturnNotes() != null) {
            shipment.setReturnNotes(request.getReturnNotes());
        }

        // Update items if provided
        if (request.getItems() != null && !request.getItems().isEmpty()) {
            // Remove old shipment items (keep returns)
            shipment.getItems().removeIf(item -> item.getItemType() == ShipmentItem.ItemType.SHIPMENT);

            // Add new shipment items
            for (ShipmentRequest.ShipmentItemRequest itemReq : request.getItems()) {
                Product product = productRepository.findById(itemReq.getProductId())
                        .orElseThrow(() -> new RuntimeException("Product not found"));

                ShipmentItem item = new ShipmentItem();
                item.setShipment(shipment);
                item.setProduct(product);
                item.setQuantity(BigDecimal.valueOf(itemReq.getQuantity()));
                item.setUnitPrice(product.getUnitPrice());
                item.setItemType(ShipmentItem.ItemType.SHIPMENT);
                item.setNotes(itemReq.getNotes());
                shipment.getItems().add(item);
            }
        }

        // Update return items if provided
        if (request.getReturnItems() != null && !request.getReturnItems().isEmpty()) {
            // Remove old return items
            shipment.getItems().removeIf(item -> item.getItemType() == ShipmentItem.ItemType.RETURN);

            // Add new return items
            for (ShipmentRequest.ShipmentItemRequest itemReq : request.getReturnItems()) {
                Product product = productRepository.findById(itemReq.getProductId())
                        .orElseThrow(() -> new RuntimeException("Product not found"));

                ShipmentItem item = new ShipmentItem();
                item.setShipment(shipment);
                item.setProduct(product);
                item.setQuantity(BigDecimal.valueOf(itemReq.getQuantity()));
                item.setUnitPrice(product.getUnitPrice());
                item.setItemType(ShipmentItem.ItemType.RETURN);
                if (itemReq.getReturnReason() != null) {
                    item.setReturnReason(ShipmentItem.ReturnReason.valueOf(itemReq.getReturnReason()));
                }
                item.setNotes(itemReq.getNotes());
                shipment.getItems().add(item);
            }
        }

        Shipment savedShipment = shipmentRepository.save(shipment);
        return regeneratePdfIfNeeded(savedShipment);
    }

    @Transactional
    public Shipment addReturnItems(Long shipmentId, List<ShipmentRequest.ShipmentItemRequest> returnItems) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        // Add return items
        for (ShipmentRequest.ShipmentItemRequest itemReq : returnItems) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            ShipmentItem item = new ShipmentItem();
            item.setShipment(shipment);
            item.setProduct(product);
            item.setQuantity(BigDecimal.valueOf(itemReq.getQuantity()));
            item.setUnitPrice(product.getUnitPrice());
            item.setItemType(ShipmentItem.ItemType.RETURN);
            if (itemReq.getReturnReason() != null) {
                item.setReturnReason(ShipmentItem.ReturnReason.valueOf(itemReq.getReturnReason()));
            }
            item.setNotes(itemReq.getNotes());
            shipment.getItems().add(item);
        }

        Shipment savedShipment = shipmentRepository.save(shipment);
        return regeneratePdfIfNeeded(savedShipment);
    }

    private boolean hasGeneratedPdf(Shipment shipment) {
        return shipment.getPdfPath() != null && !shipment.getPdfPath().isBlank();
    }

    private Shipment regeneratePdfIfNeeded(Shipment shipment) {
        if (!hasGeneratedPdf(shipment)) {
            return shipment;
        }

        try {
            String pdfPath = pdfService.generateShipmentPDF(shipment);
            shipment.setPdfPath(pdfPath);
            return shipmentRepository.save(shipment);
        } catch (Exception e) {
            throw new RuntimeException("Errore nella rigenerazione del PDF", e);
        }
    }

    /**
     * Get paginated shipments with filters and aggregates calculated on ALL filtered data
     *
     * @param startDate  Start date filter (optional)
     * @param endDate    End date filter (optional)
     * @param shopId     Shop filter (optional)
     * @param driverId   Driver filter (optional)
     * @param statuses   Status filter - multiple values (optional)
     * @param page       Page number (0-based)
     * @param size       Page size
     * @return Paginated response with aggregates
     */
    @Transactional(readOnly = true)
    public ShipmentPageResponse getShipmentsPaginated(
            LocalDate startDate,
            LocalDate endDate,
            Long shopId,
            Long driverId,
            List<Shipment.ShipmentStatus> statuses,
            int page,
            int size) {

        // Create specification for filters
        Specification<Shipment> spec = ShipmentSpecification.withFilters(
                startDate, endDate, shopId, driverId, statuses
        );

        // Create pageable with sorting (most recent first)
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "shipmentDate", "id"));

        // Get paginated data
        Page<Shipment> shipmentPage = shipmentRepository.findAll(spec, pageable);

        // Get ALL filtered shipments (for aggregates calculation)
        // We need this to calculate totals on all filtered data, not just current page
        List<Shipment> allFilteredShipments = shipmentRepository.findAll(spec);

        // Calculate aggregates on ALL filtered data
        ShipmentPageResponse.ShipmentAggregates aggregates = calculateAggregates(allFilteredShipments);

        // Build response
        return new ShipmentPageResponse(
                shipmentPage.getContent(),
                (int) shipmentPage.getTotalElements(),
                shipmentPage.getTotalPages(),
                page,
                size,
                aggregates
        );
    }

    /**
     * Calculate aggregates for a list of shipments
     */
    private ShipmentPageResponse.ShipmentAggregates calculateAggregates(List<Shipment> shipments) {
        if (shipments.isEmpty()) {
            return new ShipmentPageResponse.ShipmentAggregates(
                    BigDecimal.ZERO, 0,
                    BigDecimal.ZERO, 0,
                    BigDecimal.ZERO
            );
        }

        // Calculate totals using repository queries (optimized)
        BigDecimal totalShipmentAmount = shipmentRepository.calculateTotalShipmentAmount(shipments);
        Integer totalShipmentItems = shipmentRepository.countTotalShipmentItems(shipments);
        BigDecimal totalReturnAmount = shipmentRepository.calculateTotalReturnAmount(shipments);
        Integer totalReturnItems = shipmentRepository.countTotalReturnItems(shipments);

        // Calculate net total
        BigDecimal netTotal = totalShipmentAmount.subtract(totalReturnAmount);

        return new ShipmentPageResponse.ShipmentAggregates(
                totalShipmentAmount,
                totalShipmentItems,
                totalReturnAmount,
                totalReturnItems,
                netTotal
        );
    }

    @Transactional(readOnly = true)
    public List<Shipment> getShipmentsFiltered(
            LocalDate startDate,
            LocalDate endDate,
            Long shopId,
            Long driverId,
            List<Shipment.ShipmentStatus> statuses) {

        Specification<Shipment> spec = ShipmentSpecification.withFilters(
                startDate, endDate, shopId, driverId, statuses
        );

        Sort sort = Sort.by(Sort.Direction.DESC, "shipmentDate", "id");
        return shipmentRepository.findAll(spec, sort);
    }
}
