package com.bakery.warehouse.controller;

import com.bakery.warehouse.entity.Shipment;
import com.bakery.warehouse.entity.Return;
import com.bakery.warehouse.entity.User;
import com.bakery.warehouse.repository.UserRepository;
import com.bakery.warehouse.service.ShipmentService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SHOP')")
public class ReportController {

    private final ShipmentService shipmentService;
    private final ReturnService returnService;
    private final UserRepository userRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (startDate == null) {
            startDate = LocalDate.now().withDayOfMonth(1);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Shipment> shipments = shipmentService.getShipmentsByDateRange(startDate, endDate);
        List<Return> returns = returnService.getReturnsByDateRange(startDate, endDate);

        // Filter by shop for SHOP role users
        if (currentUser.getRole() == User.UserRole.SHOP && currentUser.getShop() != null) {
            Long shopId = currentUser.getShop().getId();
            shipments = shipments.stream()
                    .filter(s -> s.getShop() != null && s.getShop().getId().equals(shopId))
                    .toList();
            returns = returns.stream()
                    .filter(r -> r.getShop() != null && r.getShop().getId().equals(shopId))
                    .toList();
        }

        Map<String, Object> stats = new HashMap<>();

        // Shipments statistics
        long totalShipments = shipments.size();
        long bozzaShipments = shipments.stream()
                .filter(s -> s.getStatus() == Shipment.ShipmentStatus.BOZZA)
                .count();
        long inConsegnaShipments = shipments.stream()
                .filter(s -> s.getStatus() == Shipment.ShipmentStatus.IN_CONSEGNA)
                .count();
        long consegnataShipments = shipments.stream()
                .filter(s -> s.getStatus() == Shipment.ShipmentStatus.CONSEGNATA)
                .count();

        BigDecimal totalShipmentsValue = shipments.stream()
                .flatMap(s -> s.getItems().stream())
                .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        stats.put("totalShipments", totalShipments);
        stats.put("bozzaShipments", bozzaShipments);
        stats.put("inConsegnaShipments", inConsegnaShipments);
        stats.put("consegnataShipments", consegnataShipments);
        stats.put("totalShipmentsValue", totalShipmentsValue);

        // Returns statistics
        long totalReturns = returns.size();
        long pendingReturns = returns.stream()
                .filter(r -> r.getStatus() == Return.ReturnStatus.PENDING)
                .count();
        long approvedReturns = returns.stream()
                .filter(r -> r.getStatus() == Return.ReturnStatus.APPROVED)
                .count();
        long processedReturns = returns.stream()
                .filter(r -> r.getStatus() == Return.ReturnStatus.PROCESSED)
                .count();

        BigDecimal totalReturnsValue = returns.stream()
                .flatMap(r -> r.getItems().stream())
                .map(item -> item.getTotalAmount() != null ? item.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        stats.put("totalReturns", totalReturns);
        stats.put("pendingReturns", pendingReturns);
        stats.put("approvedReturns", approvedReturns);
        stats.put("processedReturns", processedReturns);
        stats.put("totalReturnsValue", totalReturnsValue);

        // Calculations
        BigDecimal netRevenue = totalShipmentsValue.subtract(totalReturnsValue);
        stats.put("netRevenue", netRevenue);

        double returnRate = totalShipments > 0
            ? (totalReturns * 100.0 / totalShipments)
            : 0.0;
        stats.put("returnRate", String.format("%.2f", returnRate));

        stats.put("startDate", startDate);
        stats.put("endDate", endDate);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/shipments")
    public ResponseEntity<Map<String, Object>> getShipmentsReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) Long driverId,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (startDate == null) {
            startDate = LocalDate.now().withDayOfMonth(1);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Shipment> shipments = shipmentService.getShipmentsByDateRange(startDate, endDate);

        // Force filter by shop for SHOP role users
        Long finalShopId = shopId;
        if (currentUser.getRole() == User.UserRole.SHOP && currentUser.getShop() != null) {
            finalShopId = currentUser.getShop().getId();
        }

        // Filter by shop if specified
        if (finalShopId != null) {
            Long shopIdToFilter = finalShopId;
            shipments = shipments.stream()
                    .filter(s -> s.getShop() != null && s.getShop().getId().equals(shopIdToFilter))
                    .toList();
        }

        // Filter by driver if specified
        if (driverId != null) {
            shipments = shipments.stream()
                    .filter(s -> s.getDriver() != null && s.getDriver().getId().equals(driverId))
                    .toList();
        }

        Map<String, Object> report = new HashMap<>();
        report.put("shipments", shipments);
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("shopId", finalShopId);
        report.put("driverId", driverId);

        BigDecimal totalValue = shipments.stream()
                .flatMap(s -> s.getItems().stream())
                .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        report.put("totalValue", totalValue);
        report.put("totalCount", shipments.size());

        return ResponseEntity.ok(report);
    }

    @GetMapping("/returns")
    public ResponseEntity<Map<String, Object>> getReturnsReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long shopId,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (startDate == null) {
            startDate = LocalDate.now().withDayOfMonth(1);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Return> returns = returnService.getReturnsByDateRange(startDate, endDate);

        // Force filter by shop for SHOP role users
        Long finalShopId = shopId;
        if (currentUser.getRole() == User.UserRole.SHOP && currentUser.getShop() != null) {
            finalShopId = currentUser.getShop().getId();
        }

        // Filter by shop if specified
        if (finalShopId != null) {
            Long shopIdToFilter = finalShopId;
            returns = returns.stream()
                    .filter(r -> r.getShop() != null && r.getShop().getId().equals(shopIdToFilter))
                    .toList();
        }

        Map<String, Object> report = new HashMap<>();
        report.put("returns", returns);
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("shopId", finalShopId);

        BigDecimal totalValue = returns.stream()
                .flatMap(r -> r.getItems().stream())
                .map(item -> item.getTotalAmount() != null ? item.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        report.put("totalValue", totalValue);
        report.put("totalCount", returns.size());

        return ResponseEntity.ok(report);
    }
}
