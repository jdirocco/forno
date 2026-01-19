package com.bakery.warehouse.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "return_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_id", nullable = false)
    private Return returnEntity;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shipment_item_id", nullable = false)
    private ShipmentItem shipmentItem;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Column(precision = 10, scale = 3)
    private BigDecimal quantity;

    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReturnReason reason;

    private String notes;

    @PrePersist
    @PreUpdate
    protected void calculateTotal() {
        if (quantity != null && unitPrice != null) {
            totalAmount = quantity.multiply(unitPrice);
        }
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
