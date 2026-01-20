package com.bakery.warehouse.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for comprehensive report dashboard with all aggregated data
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportDashboardResponse {

    // Summary totals
    private SummaryTotals summary;

    // Products aggregated by product type
    private List<ProductAggregate> productsSold;
    private List<ProductAggregate> productsReturned;

    // Time-based chart data
    private ChartData chartData;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryTotals {
        private BigDecimal totalShipmentAmount;
        private Integer totalShipmentItems;
        private BigDecimal totalReturnAmount;
        private Integer totalReturnItems;
        private BigDecimal netTotal;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductAggregate {
        private Long productId;
        private String productName;
        private String productCode;
        private BigDecimal quantity;
        private BigDecimal totalAmount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartData {
        private String groupBy; // "DAILY", "WEEKLY", "MONTHLY"
        private List<String> labels;
        private List<BigDecimal> shipmentsData;
        private List<BigDecimal> returnsData;
        private List<BigDecimal> netData;
    }
}
