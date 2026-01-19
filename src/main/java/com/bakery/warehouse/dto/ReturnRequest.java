package com.bakery.warehouse.dto;

import com.bakery.warehouse.entity.ReturnItem;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class ReturnRequest {
    private Long shipmentId;
    private Long shopId;
    private LocalDate returnDate;
    private String reason;
    private String notes;
    private List<ReturnItemRequest> items;

    @Data
    public static class ReturnItemRequest {
        private Long shipmentItemId;
        private Long productId;
        private Double quantity;
        private ReturnItem.ReturnReason reason;
        private String notes;
    }
}
