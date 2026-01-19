package com.bakery.warehouse.repository;

import com.bakery.warehouse.entity.Return;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReturnRepository extends JpaRepository<Return, Long> {

    List<Return> findByShopId(Long shopId);

    List<Return> findByShipmentId(Long shipmentId);

    List<Return> findByStatus(Return.ReturnStatus status);

    @Query("SELECT r FROM Return r WHERE r.returnDate BETWEEN :startDate AND :endDate")
    List<Return> findByReturnDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT r FROM Return r WHERE r.shop.id = :shopId AND r.returnDate BETWEEN :startDate AND :endDate")
    List<Return> findByShopIdAndReturnDateBetween(@Param("shopId") Long shopId,
                                                    @Param("startDate") LocalDate startDate,
                                                    @Param("endDate") LocalDate endDate);
}
