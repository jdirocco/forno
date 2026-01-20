package com.bakery.warehouse.specification;

import com.bakery.warehouse.entity.Shipment;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.criteria.Predicate;

/**
 * JPA Specification for filtering Shipments
 */
public class ShipmentSpecification {

    public static Specification<Shipment> withFilters(
            LocalDate startDate,
            LocalDate endDate,
            Long shopId,
            Long driverId,
            List<Shipment.ShipmentStatus> statuses) {

        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by date range
            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("shipmentDate"), startDate));
            }
            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("shipmentDate"), endDate));
            }

            // Filter by shop
            if (shopId != null) {
                predicates.add(criteriaBuilder.equal(root.get("shop").get("id"), shopId));
            }

            // Filter by driver
            if (driverId != null) {
                predicates.add(criteriaBuilder.equal(root.get("driver").get("id"), driverId));
            }

            // Filter by statuses (multi-select)
            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
