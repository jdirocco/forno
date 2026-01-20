package com.bakery.warehouse.controller;

import com.bakery.warehouse.dto.ReportDashboardResponse;
import com.bakery.warehouse.entity.Shipment;
import com.bakery.warehouse.entity.ShipmentItem;
import com.bakery.warehouse.entity.User;
import com.bakery.warehouse.repository.UserRepository;
import com.bakery.warehouse.service.ReportService;
import com.bakery.warehouse.service.ShipmentService;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SHOP')")
public class ReportController {

    private final ShipmentService shipmentService;
    private final ReportService reportService;
    private final UserRepository userRepository;

    /**
     * Enhanced dashboard endpoint with comprehensive aggregates, product-level data, and chart data
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ReportDashboardResponse> getDashboardReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) Long driverId,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false, defaultValue = "MONTHLY") String chartGroupBy,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Default date range to current month if not specified
        if (startDate == null) {
            startDate = LocalDate.now().withDayOfMonth(1);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Force filter by shop for SHOP role users
        Long effectiveShopId = shopId;
        if (currentUser.getRole() == User.UserRole.SHOP && currentUser.getShop() != null) {
            effectiveShopId = currentUser.getShop().getId();
        }

        // Parse status filters
        List<Shipment.ShipmentStatus> statusFilters = null;
        if (statuses != null && !statuses.isEmpty()) {
            statusFilters = statuses.stream()
                    .map(Shipment.ShipmentStatus::valueOf)
                    .collect(Collectors.toList());
        }

        // Get comprehensive dashboard report
        ReportDashboardResponse response = reportService.getDashboardReport(
                startDate,
                endDate,
                effectiveShopId,
                driverId,
                statusFilters,
                chartGroupBy
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Legacy dashboard endpoint (kept for backward compatibility)
     */
    @GetMapping("/dashboard/legacy")
    public ResponseEntity<Map<String, Object>> getDashboardStatsLegacy(
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

        // Filter by shop for SHOP role users
        if (currentUser.getRole() == User.UserRole.SHOP && currentUser.getShop() != null) {
            Long shopId = currentUser.getShop().getId();
            shipments = shipments.stream()
                    .filter(s -> s.getShop() != null && s.getShop().getId().equals(shopId))
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

        // Calculate shipment value (only SHIPMENT items)
        BigDecimal totalShipmentsValue = shipments.stream()
                .flatMap(s -> s.getItems().stream())
                .filter(item -> item.getItemType() == ShipmentItem.ItemType.SHIPMENT)
                .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        stats.put("totalShipments", totalShipments);
        stats.put("bozzaShipments", bozzaShipments);
        stats.put("inConsegnaShipments", inConsegnaShipments);
        stats.put("consegnataShipments", consegnataShipments);
        stats.put("totalShipmentsValue", totalShipmentsValue);

        // Returns statistics (now integrated in shipments)
        long totalReturns = shipments.stream()
                .filter(s -> s.getReturnDate() != null)
                .count();

        long shipmentsWithReturns = shipments.stream()
                .filter(s -> s.getItems().stream()
                        .anyMatch(item -> item.getItemType() == ShipmentItem.ItemType.RETURN))
                .count();

        BigDecimal totalReturnsValue = shipments.stream()
                .flatMap(s -> s.getItems().stream())
                .filter(item -> item.getItemType() == ShipmentItem.ItemType.RETURN)
                .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        stats.put("totalReturns", totalReturns);
        stats.put("shipmentsWithReturns", shipmentsWithReturns);
        stats.put("totalReturnsValue", totalReturnsValue);

        // Calculations
        BigDecimal netRevenue = totalShipmentsValue.subtract(totalReturnsValue);
        stats.put("netRevenue", netRevenue);

        double returnRate = totalShipments > 0
            ? (shipmentsWithReturns * 100.0 / totalShipments)
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

        // Filter only shipments that have return items
        List<Shipment> shipmentsWithReturns = shipments.stream()
                .filter(s -> s.getItems().stream()
                        .anyMatch(item -> item.getItemType() == ShipmentItem.ItemType.RETURN))
                .toList();

        Map<String, Object> report = new HashMap<>();
        report.put("shipments", shipmentsWithReturns);
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("shopId", finalShopId);

        // Calculate total return items value
        BigDecimal totalValue = shipmentsWithReturns.stream()
                .flatMap(s -> s.getItems().stream())
                .filter(item -> item.getItemType() == ShipmentItem.ItemType.RETURN)
                .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Count total return items
        long totalReturnItems = shipmentsWithReturns.stream()
                .flatMap(s -> s.getItems().stream())
                .filter(item -> item.getItemType() == ShipmentItem.ItemType.RETURN)
                .count();

        report.put("totalValue", totalValue);
        report.put("totalCount", shipmentsWithReturns.size());
        report.put("totalReturnItems", totalReturnItems);

        return ResponseEntity.ok(report);
    }
}
