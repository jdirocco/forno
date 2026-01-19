package com.bakery.warehouse.service;

import com.bakery.warehouse.entity.*;
import com.bakery.warehouse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReturnService {

    private final ReturnRepository returnRepository;
    private final ShipmentRepository shipmentRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;

    @Transactional
    public Return createReturn(Return returnEntity, User createdBy) {
        returnEntity.setCreatedBy(createdBy);
        returnEntity.setStatus(Return.ReturnStatus.PENDING);

        // Associate return items with the return
        for (ReturnItem item : returnEntity.getItems()) {
            item.setReturnEntity(returnEntity);
        }

        return returnRepository.save(returnEntity);
    }

    @Transactional(readOnly = true)
    public List<Return> getAllReturns() {
        return returnRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Return getReturnById(Long id) {
        return returnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Return not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public List<Return> getReturnsByShop(Long shopId) {
        return returnRepository.findByShopId(shopId);
    }

    @Transactional(readOnly = true)
    public List<Return> getReturnsByShipment(Long shipmentId) {
        return returnRepository.findByShipmentId(shipmentId);
    }

    @Transactional(readOnly = true)
    public List<Return> getReturnsByStatus(Return.ReturnStatus status) {
        return returnRepository.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public List<Return> getReturnsByDateRange(LocalDate startDate, LocalDate endDate) {
        return returnRepository.findByReturnDateBetween(startDate, endDate);
    }

    @Transactional
    public Return updateReturnStatus(Long id, Return.ReturnStatus status, User processedBy) {
        Return returnEntity = getReturnById(id);
        returnEntity.setStatus(status);

        if (status == Return.ReturnStatus.PROCESSED || status == Return.ReturnStatus.APPROVED) {
            returnEntity.setProcessedBy(processedBy);
            returnEntity.setProcessedAt(LocalDateTime.now());
        }

        return returnRepository.save(returnEntity);
    }

    @Transactional
    public Return updateReturn(Long id, Return updatedReturn) {
        Return existingReturn = getReturnById(id);

        existingReturn.setReturnDate(updatedReturn.getReturnDate());
        existingReturn.setReason(updatedReturn.getReason());
        existingReturn.setNotes(updatedReturn.getNotes());

        return returnRepository.save(existingReturn);
    }

    @Transactional
    public void deleteReturn(Long id) {
        Return returnEntity = getReturnById(id);

        // Only allow deletion of pending or rejected returns
        if (returnEntity.getStatus() != Return.ReturnStatus.PENDING &&
            returnEntity.getStatus() != Return.ReturnStatus.REJECTED &&
            returnEntity.getStatus() != Return.ReturnStatus.CANCELLED) {
            throw new RuntimeException("Cannot delete a return that has been processed or approved");
        }

        returnRepository.deleteById(id);
    }
}
