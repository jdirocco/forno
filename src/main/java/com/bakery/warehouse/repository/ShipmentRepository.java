package com.bakery.warehouse.repository;

import com.bakery.warehouse.entity.Shipment;
import com.bakery.warehouse.entity.Shop;
import com.bakery.warehouse.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {

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
}
