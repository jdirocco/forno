package com.bakery.warehouse.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "shipment_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipment_id", nullable = false)
    private Shipment shipment;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Column(precision = 10, scale = 3)
    private BigDecimal quantity;

    @NotNull
    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @NotNull
    @Column(precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemType itemType = ItemType.SHIPMENT;

    @Enumerated(EnumType.STRING)
    private ReturnReason returnReason;

    private String notes;

    @PrePersist
    @PreUpdate
    protected void calculateTotal() {
        if (quantity != null && unitPrice != null) {
            totalPrice = quantity.multiply(unitPrice);
        }
    }

    public enum ItemType {
        SHIPMENT,   // Regular shipment item
        RETURN      // Return item
    }

    public enum ReturnReason {
        DAMAGED,            // Damaged during transport
        EXPIRED,            // Product expired
        WRONG_PRODUCT,      // Wrong product delivered
        EXCESS_QUANTITY,    // More than ordered
        QUALITY_ISSUE,      // Quality not acceptable
        OTHER               // Other reason (see notes)
    }
}
