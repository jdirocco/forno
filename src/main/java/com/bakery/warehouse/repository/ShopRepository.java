package com.bakery.warehouse.repository;

import com.bakery.warehouse.entity.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {

    Optional<Shop> findByCode(String code);

    List<Shop> findByActiveTrue();

    List<Shop> findByCity(String city);

    boolean existsByCode(String code);
}
