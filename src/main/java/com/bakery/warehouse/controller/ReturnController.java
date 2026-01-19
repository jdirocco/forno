package com.bakery.warehouse.controller;

import com.bakery.warehouse.dto.ReturnRequest;
import com.bakery.warehouse.entity.*;
import com.bakery.warehouse.repository.ProductRepository;
import com.bakery.warehouse.repository.ShipmentRepository;
import com.bakery.warehouse.repository.ShopRepository;
import com.bakery.warehouse.repository.UserRepository;
import com.bakery.warehouse.service.ReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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
@RequestMapping("/api/returns")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;
    private final ShipmentRepository shipmentRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SHOP', 'ACCOUNTANT')")
    public ResponseEntity<Return> createReturn(
            @RequestBody ReturnRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Shipment shipment = shipmentRepository.findById(request.getShipmentId())
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        Shop shop = shopRepository.findById(request.getShopId())
                .orElseThrow(() -> new RuntimeException("Shop not found"));

        Return returnEntity = new Return();
        returnEntity.setShipment(shipment);
        returnEntity.setShop(shop);
        returnEntity.setReturnDate(request.getReturnDate() != null ? request.getReturnDate() : LocalDate.now());
        returnEntity.setReason(request.getReason());
        returnEntity.setNotes(request.getNotes());

        List<ReturnItem> items = new ArrayList<>();
        for (ReturnRequest.ReturnItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            ReturnItem item = new ReturnItem();
            item.setProduct(product);
            item.setQuantity(BigDecimal.valueOf(itemReq.getQuantity()));
            item.setUnitPrice(product.getUnitPrice());
            item.setReason(itemReq.getReason());
            item.setNotes(itemReq.getNotes());
            items.add(item);
        }

        returnEntity.setItems(items);

        Return created = returnService.createReturn(returnEntity, currentUser);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<List<Return>> getAllReturns(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Return.ReturnStatus status) {

        if (status != null) {
            return ResponseEntity.ok(returnService.getReturnsByStatus(status));
        }

        if (startDate != null && endDate != null) {
            return ResponseEntity.ok(returnService.getReturnsByDateRange(startDate, endDate));
        }

        return ResponseEntity.ok(returnService.getAllReturns());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Return> getReturn(@PathVariable Long id) {
        Return returnEntity = returnService.getReturnById(id);
        return ResponseEntity.ok(returnEntity);
    }

    @GetMapping("/shop/{shopId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SHOP', 'ACCOUNTANT')")
    public ResponseEntity<List<Return>> getReturnsByShop(@PathVariable Long shopId) {
        return ResponseEntity.ok(returnService.getReturnsByShop(shopId));
    }

    @GetMapping("/shipment/{shipmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<List<Return>> getReturnsByShipment(@PathVariable Long shipmentId) {
        return ResponseEntity.ok(returnService.getReturnsByShipment(shipmentId));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<Return> updateStatus(
            @PathVariable Long id,
            @RequestParam Return.ReturnStatus status,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Return updated = returnService.updateReturnStatus(id, status, currentUser);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<Return> updateReturn(
            @PathVariable Long id,
            @RequestBody Return returnEntity) {
        Return updated = returnService.updateReturn(id, returnEntity);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteReturn(@PathVariable Long id) {
        returnService.deleteReturn(id);
        return ResponseEntity.noContent().build();
    }
}
