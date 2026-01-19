package com.bakery.warehouse.controller;

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

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER')")
    public ResponseEntity<Shipment> updateStatus(
            @PathVariable Long id,
            @RequestParam Shipment.ShipmentStatus status) {
        Shipment updated = shipmentService.updateShipmentStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    @GetMapping
    public ResponseEntity<List<Shipment>> getAllShipments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        if (startDate != null && endDate != null) {
            return ResponseEntity.ok(shipmentService.getShipmentsByDateRange(startDate, endDate));
        }

        return ResponseEntity.ok(shipmentService.getAllShipments());
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
            Shipment shipment = shipmentService.getShipmentById(id);

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
