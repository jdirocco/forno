package com.bakery.warehouse.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class ShipmentRequest {
    private Long shopId;
    private Long driverId;
    private LocalDate shipmentDate;
    private String notes;
    private List<ShipmentItemRequest> items;

    @Data
    public static class ShipmentItemRequest {
        private Long productId;
        private Double quantity;
        private String notes;
    }
}
