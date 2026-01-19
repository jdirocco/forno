package com.bakery.warehouse.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "shipments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String shipmentNumber;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id")
    private Shop shop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private User driver;

    @NotNull
    private LocalDate shipmentDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShipmentStatus status = ShipmentStatus.DRAFT;

    @OneToMany(mappedBy = "shipment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ShipmentItem> items = new ArrayList<>();

    private String notes;

    private String pdfPath;

    @Column(nullable = false)
    private Boolean emailSent = false;

    @Column(nullable = false)
    private Boolean whatsappSent = false;

    private LocalDateTime emailSentAt;

    private LocalDateTime whatsappSentAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (shipmentNumber == null) {
            shipmentNumber = generateShipmentNumber();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    private String generateShipmentNumber() {
        return "SHP-" + LocalDate.now().toString().replace("-", "") + "-" + System.currentTimeMillis() % 100000;
    }

    public enum ShipmentStatus {
        DRAFT,          // Created but not confirmed
        CONFIRMED,      // Ready for delivery
        IN_TRANSIT,     // Picked up by driver
        DELIVERED,      // Delivered to shop
        CANCELLED       // Cancelled shipment
    }
}
