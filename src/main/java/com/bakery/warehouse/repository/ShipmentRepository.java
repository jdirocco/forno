package com.bakery.warehouse.repository;

import com.bakery.warehouse.entity.Shipment;
import com.bakery.warehouse.entity.Shop;
import com.bakery.warehouse.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long>, JpaSpecificationExecutor<Shipment> {

    @EntityGraph(attributePaths = {"items", "items.product", "shop", "driver"})
    List<Shipment> findAll(Specification<Shipment> spec);

    Optional<Shipment> findByShipmentNumber(String shipmentNumber);

    List<Shipment> findByShop(Shop shop);

    List<Shipment> findByDriver(User driver);

    List<Shipment> findByStatus(Shipment.ShipmentStatus status);

    List<Shipment> findByShipmentDateBetween(LocalDate startDate, LocalDate endDate);

    @Query("SELECT s FROM Shipment s WHERE s.shop.id = :shopId AND s.shipmentDate BETWEEN :startDate AND :endDate")
    List<Shipment> findByShopAndDateRange(@Param("shopId") Long shopId,
                                          @Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate);

    @Query("SELECT s FROM Shipment s WHERE s.driver.id = :driverId AND s.shipmentDate = :date")
    List<Shipment> findByDriverAndDate(@Param("driverId") Long driverId, @Param("date") LocalDate date);

    @EntityGraph(attributePaths = {"items", "items.product", "shop", "driver"})
    Optional<Shipment> findDetailedById(Long id);

    /**
     * Calculate total amount for shipment items (item_type = 'SHIPMENT') for filtered shipments
     */
    @Query("SELECT COALESCE(SUM(si.totalPrice), 0) " +
           "FROM ShipmentItem si " +
           "WHERE si.shipment IN :shipments " +
           "AND si.itemType = com.bakery.warehouse.entity.ShipmentItem$ItemType.SHIPMENT")
    BigDecimal calculateTotalShipmentAmount(@Param("shipments") List<Shipment> shipments);

    /**
     * Calculate total amount for return items (item_type = 'RETURN') for filtered shipments
     */
    @Query("SELECT COALESCE(SUM(si.totalPrice), 0) " +
           "FROM ShipmentItem si " +
           "WHERE si.shipment IN :shipments " +
           "AND si.itemType = com.bakery.warehouse.entity.ShipmentItem$ItemType.RETURN")
    BigDecimal calculateTotalReturnAmount(@Param("shipments") List<Shipment> shipments);

    /**
     * Count total shipment items for filtered shipments
     */
    @Query("SELECT COUNT(si) " +
           "FROM ShipmentItem si " +
           "WHERE si.shipment IN :shipments " +
           "AND si.itemType = com.bakery.warehouse.entity.ShipmentItem$ItemType.SHIPMENT")
    Integer countTotalShipmentItems(@Param("shipments") List<Shipment> shipments);

    /**
     * Count total return items for filtered shipments
     */
    @Query("SELECT COUNT(si) " +
           "FROM ShipmentItem si " +
           "WHERE si.shipment IN :shipments " +
           "AND si.itemType = com.bakery.warehouse.entity.ShipmentItem$ItemType.RETURN")
    Integer countTotalReturnItems(@Param("shipments") List<Shipment> shipments);

    /**
     * Get product aggregates for shipment items (products sold)
     * Returns: [productId, productName, productCode, sumQuantity, sumTotalPrice]
     */
    @Query("SELECT si.product.id, si.product.name, si.product.code, " +
           "SUM(si.quantity), SUM(si.totalPrice) " +
           "FROM ShipmentItem si " +
           "WHERE si.shipment IN :shipments " +
           "AND si.itemType = com.bakery.warehouse.entity.ShipmentItem$ItemType.SHIPMENT " +
           "GROUP BY si.product.id, si.product.name, si.product.code " +
           "ORDER BY SUM(si.totalPrice) DESC")
    List<Object[]> getProductsSoldAggregates(@Param("shipments") List<Shipment> shipments);

    /**
     * Get product aggregates for return items (products returned)
     * Returns: [productId, productName, productCode, sumQuantity, sumTotalPrice]
     */
    @Query("SELECT si.product.id, si.product.name, si.product.code, " +
           "SUM(si.quantity), SUM(si.totalPrice) " +
           "FROM ShipmentItem si " +
           "WHERE si.shipment IN :shipments " +
           "AND si.itemType = com.bakery.warehouse.entity.ShipmentItem$ItemType.RETURN " +
           "GROUP BY si.product.id, si.product.name, si.product.code " +
           "ORDER BY SUM(si.totalPrice) DESC")
    List<Object[]> getProductsReturnedAggregates(@Param("shipments") List<Shipment> shipments);
}
