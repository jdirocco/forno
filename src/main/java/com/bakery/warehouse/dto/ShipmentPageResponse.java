package com.bakery.warehouse.dto;

import com.bakery.warehouse.entity.Shipment;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for paginated shipment response with aggregates
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentPageResponse {

    // Paginated data
    private List<Shipment> content;
    private int totalElements;
    private int totalPages;
    private int currentPage;
    private int pageSize;

    // Aggregates calculated on ALL filtered data (not just current page)
    private ShipmentAggregates aggregates;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShipmentAggregates {
        // Totals for shipment items
        private BigDecimal totalShipmentAmount;
        private Integer totalShipmentItems;

        // Totals for return items
        private BigDecimal totalReturnAmount;
        private Integer totalReturnItems;

        // Net total (shipment - returns)
        private BigDecimal netTotal;
    }
}
