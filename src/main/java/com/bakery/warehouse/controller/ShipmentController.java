package com.bakery.warehouse.controller;

import com.bakery.warehouse.dto.ShipmentPageResponse;
import com.bakery.warehouse.dto.ShipmentRequest;
import com.bakery.warehouse.entity.*;
import com.bakery.warehouse.repository.ProductRepository;
import com.bakery.warehouse.repository.ShopRepository;
import com.bakery.warehouse.repository.UserRepository;
import com.bakery.warehouse.service.ShipmentService;
import com.bakery.warehouse.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;
    private final WhatsAppService whatsAppService;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<Shipment> createShipment(
            @RequestBody ShipmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Shop shop = shopRepository.findById(request.getShopId())
                .orElseThrow(() -> new RuntimeException("Shop not found"));

        Shipment shipment = new Shipment();
        shipment.setShop(shop);
        shipment.setShipmentDate(request.getShipmentDate());
        shipment.setNotes(request.getNotes());

        if (request.getDriverId() != null) {
            User driver = userRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new RuntimeException("Driver not found"));
            shipment.setDriver(driver);
        }

        List<ShipmentItem> items = new ArrayList<>();
        for (ShipmentRequest.ShipmentItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            ShipmentItem item = new ShipmentItem();
            item.setProduct(product);
            item.setQuantity(BigDecimal.valueOf(itemReq.getQuantity()));
            item.setUnitPrice(product.getUnitPrice());
            item.setNotes(itemReq.getNotes());
            items.add(item);
        }

        shipment.setItems(items);

        Shipment created = shipmentService.createShipment(shipment, currentUser);
        return ResponseEntity.ok(created);
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<Shipment> confirmShipment(@PathVariable Long id) throws Exception {
        Shipment confirmed = shipmentService.confirmShipment(id);
        return ResponseEntity.ok(confirmed);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER')")
    public ResponseEntity<Shipment> updateShipment(
            @PathVariable Long id,
            @RequestBody ShipmentRequest request) {
        Shipment updated = shipmentService.updateShipment(id, request);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER')")
    public ResponseEntity<Shipment> updateStatus(
            @PathVariable Long id,
            @RequestParam Shipment.ShipmentStatus status) {
        Shipment updated = shipmentService.updateShipmentStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/returns")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER')")
    public ResponseEntity<Shipment> addReturnItems(
            @PathVariable Long id,
            @RequestBody List<ShipmentRequest.ShipmentItemRequest> returnItems) {
        Shipment updated = shipmentService.addReturnItems(id, returnItems);
        return ResponseEntity.ok(updated);
    }

    @GetMapping
    public ResponseEntity<?> getAllShipments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) Long driverId,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // SHOP users can only see their own shop's shipments
        Long effectiveShopId = shopId;
        if (currentUser.getRole() == User.UserRole.SHOP) {
            if (currentUser.getShop() == null) {
                // Return empty response for shop users without shop assigned
                if (page != null && size != null) {
                    return ResponseEntity.ok(new ShipmentPageResponse(
                            List.of(), 0, 0, page, size,
                            new ShipmentPageResponse.ShipmentAggregates(
                                    BigDecimal.ZERO, 0, BigDecimal.ZERO, 0, BigDecimal.ZERO
                            )
                    ));
                }
                return ResponseEntity.ok(List.of());
            }
            effectiveShopId = currentUser.getShop().getId();
        }

        // Parse status filters
        List<Shipment.ShipmentStatus> statusFilters = null;
        if (statuses != null && !statuses.isEmpty()) {
            statusFilters = statuses.stream()
                    .map(Shipment.ShipmentStatus::valueOf)
                    .collect(Collectors.toList());
        }

        // If pagination is requested, use the new paginated service method
        if (page != null && size != null) {
            ShipmentPageResponse response = shipmentService.getShipmentsPaginated(
                    startDate,
                    endDate,
                    effectiveShopId,
                    driverId,
                    statusFilters,
                    page,
                    size
            );
            return ResponseEntity.ok(response);
        }

        // Return filtered shipments without pagination (for backward compatibility)
        List<Shipment> filteredShipments = shipmentService.getShipmentsFiltered(
                startDate,
                endDate,
                effectiveShopId,
                driverId,
                statusFilters
        );

        return ResponseEntity.ok(filteredShipments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Shipment> getShipment(@PathVariable Long id) {
        Shipment shipment = shipmentService.getShipmentById(id);
        return ResponseEntity.ok(shipment);
    }

    @GetMapping("/shop/{shopId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SHOP', 'ACCOUNTANT')")
    public ResponseEntity<List<Shipment>> getShipmentsByShop(@PathVariable Long shopId) {
        return ResponseEntity.ok(shipmentService.getShipmentsByShop(shopId));
    }

    @GetMapping("/shop/{shopId}/last-shipment")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<Shipment> getLastShipmentForShop(@PathVariable Long shopId) {
        Shipment lastShipment = shipmentService.getLastShipmentForShop(shopId);
        if (lastShipment == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(lastShipment);
    }

    @GetMapping("/driver/today")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<List<Shipment>> getDriverTodayShipments(
            @AuthenticationPrincipal UserDetails userDetails) {

        User driver = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Shipment> shipments = shipmentService.getShipmentsByDriver(driver.getId(), LocalDate.now());
        return ResponseEntity.ok(shipments);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteShipment(@PathVariable Long id) {
        shipmentService.deleteShipment(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'DRIVER', 'SHOP')")
    public ResponseEntity<Resource> downloadPDF(@PathVariable Long id) {
        try {
            Shipment shipment = shipmentService.regenerateShipmentPdf(id);

            if (shipment.getPdfPath() == null || shipment.getPdfPath().isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            java.nio.file.Path filePath = java.nio.file.Paths.get(shipment.getPdfPath());
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_PDF)
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + shipment.getShipmentNumber() + ".pdf\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/{id}/send-whatsapp")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'DRIVER')")
    public ResponseEntity<String> sendWhatsApp(@PathVariable Long id) {
        try {
            Shipment shipment = shipmentService.getShipmentById(id);

            if (shipment.getPdfPath() == null || shipment.getPdfPath().isEmpty()) {
                return ResponseEntity.badRequest().body("PDF non disponibile. Conferma prima la spedizione.");
            }

            whatsAppService.sendShipmentWhatsApp(shipment);

            return ResponseEntity.ok("Messaggio WhatsApp inviato con successo");
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Errore nell'invio del messaggio: " + e.getMessage());
        }
    }
}
