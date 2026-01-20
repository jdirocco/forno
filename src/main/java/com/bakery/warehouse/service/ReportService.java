package com.bakery.warehouse.service;

import com.bakery.warehouse.dto.ReportDashboardResponse;
import com.bakery.warehouse.entity.Shipment;
import com.bakery.warehouse.repository.ShipmentRepository;
import com.bakery.warehouse.specification.ShipmentSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ShipmentRepository shipmentRepository;

    @Transactional(readOnly = true)
    public ReportDashboardResponse getDashboardReport(
            LocalDate startDate,
            LocalDate endDate,
            Long shopId,
            Long driverId,
            List<Shipment.ShipmentStatus> statuses,
            String chartGroupBy) {

        // Create specification for filters
        Specification<Shipment> spec = ShipmentSpecification.withFilters(
                startDate, endDate, shopId, driverId, statuses
        );

        // Get all filtered shipments
        List<Shipment> filteredShipments = shipmentRepository.findAll(spec);

        // Calculate summary totals
        ReportDashboardResponse.SummaryTotals summary = calculateSummaryTotals(filteredShipments);

        // Get products sold aggregates
        List<ReportDashboardResponse.ProductAggregate> productsSold =
                getProductAggregates(filteredShipments, true);

        // Get products returned aggregates
        List<ReportDashboardResponse.ProductAggregate> productsReturned =
                getProductAggregates(filteredShipments, false);

        // Generate chart data
        ReportDashboardResponse.ChartData chartData =
                generateChartData(filteredShipments, chartGroupBy != null ? chartGroupBy : "MONTHLY");

        return new ReportDashboardResponse(summary, productsSold, productsReturned, chartData);
    }

    private ReportDashboardResponse.SummaryTotals calculateSummaryTotals(List<Shipment> shipments) {
        if (shipments.isEmpty()) {
            return new ReportDashboardResponse.SummaryTotals(
                    BigDecimal.ZERO, 0, BigDecimal.ZERO, 0, BigDecimal.ZERO
            );
        }

        BigDecimal totalShipmentAmount = shipmentRepository.calculateTotalShipmentAmount(shipments);
        Integer totalShipmentItems = shipmentRepository.countTotalShipmentItems(shipments);
        BigDecimal totalReturnAmount = shipmentRepository.calculateTotalReturnAmount(shipments);
        Integer totalReturnItems = shipmentRepository.countTotalReturnItems(shipments);
        BigDecimal netTotal = totalShipmentAmount.subtract(totalReturnAmount);

        return new ReportDashboardResponse.SummaryTotals(
                totalShipmentAmount, totalShipmentItems,
                totalReturnAmount, totalReturnItems,
                netTotal
        );
    }

    private List<ReportDashboardResponse.ProductAggregate> getProductAggregates(
            List<Shipment> shipments, boolean isShipment) {

        if (shipments.isEmpty()) {
            return Collections.emptyList();
        }

        List<Object[]> results = isShipment
                ? shipmentRepository.getProductsSoldAggregates(shipments)
                : shipmentRepository.getProductsReturnedAggregates(shipments);

        return results.stream()
                .map(row -> new ReportDashboardResponse.ProductAggregate(
                        (Long) row[0],           // productId
                        (String) row[1],         // productName
                        (String) row[2],         // productCode
                        (BigDecimal) row[3],     // quantity
                        (BigDecimal) row[4]      // totalAmount
                ))
                .collect(Collectors.toList());
    }

    private ReportDashboardResponse.ChartData generateChartData(
            List<Shipment> shipments, String groupBy) {

        if (shipments.isEmpty()) {
            return new ReportDashboardResponse.ChartData(
                    groupBy, Collections.emptyList(),
                    Collections.emptyList(), Collections.emptyList(), Collections.emptyList()
            );
        }

        // Group shipments by time period
        Map<String, List<Shipment>> groupedShipments = groupShipmentsByPeriod(shipments, groupBy);

        // Sort keys chronologically
        List<String> sortedKeys = new ArrayList<>(groupedShipments.keySet());
        Collections.sort(sortedKeys);

        List<String> labels = new ArrayList<>();
        List<BigDecimal> shipmentsData = new ArrayList<>();
        List<BigDecimal> returnsData = new ArrayList<>();
        List<BigDecimal> netData = new ArrayList<>();

        for (String key : sortedKeys) {
            List<Shipment> periodShipments = groupedShipments.get(key);

            BigDecimal shipmentTotal = shipmentRepository.calculateTotalShipmentAmount(periodShipments);
            BigDecimal returnTotal = shipmentRepository.calculateTotalReturnAmount(periodShipments);
            BigDecimal net = shipmentTotal.subtract(returnTotal);

            labels.add(key);
            shipmentsData.add(shipmentTotal);
            returnsData.add(returnTotal);
            netData.add(net);
        }

        return new ReportDashboardResponse.ChartData(groupBy, labels, shipmentsData, returnsData, netData);
    }

    private Map<String, List<Shipment>> groupShipmentsByPeriod(List<Shipment> shipments, String groupBy) {
        DateTimeFormatter formatter;

        switch (groupBy.toUpperCase()) {
            case "DAILY":
                formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
                break;
            case "WEEKLY":
                return groupByWeek(shipments);
            case "MONTHLY":
            default:
                formatter = DateTimeFormatter.ofPattern("yyyy-MM");
                break;
        }

        final DateTimeFormatter finalFormatter = formatter;
        return shipments.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getShipmentDate().format(finalFormatter)
                ));
    }

    private Map<String, List<Shipment>> groupByWeek(List<Shipment> shipments) {
        Map<String, List<Shipment>> grouped = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-'W'ww");

        for (Shipment shipment : shipments) {
            LocalDate weekStart = shipment.getShipmentDate().with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            String key = weekStart.format(formatter);
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(shipment);
        }

        return grouped;
    }
}
