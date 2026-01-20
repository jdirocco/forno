package com.bakery.warehouse.service;

import com.bakery.warehouse.entity.*;
import com.bakery.warehouse.repository.ShipmentItemRepository;
import com.bakery.warehouse.repository.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final ShipmentItemRepository shipmentItemRepository;
    private final PDFService pdfService;
    private final EmailService emailService;
    private final WhatsAppService whatsAppService;

    @Transactional
    public Shipment createShipment(Shipment shipment, User createdBy) {
        shipment.setCreatedBy(createdBy);
        shipment.setStatus(Shipment.ShipmentStatus.BOZZA);

        for (ShipmentItem item : shipment.getItems()) {
            item.setShipment(shipment);
        }

        return shipmentRepository.save(shipment);
    }

    @Transactional
    public Shipment confirmShipment(Long shipmentId) throws Exception {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        shipment.setStatus(Shipment.ShipmentStatus.IN_CONSEGNA);

        String pdfPath = pdfService.generateShipmentPDF(shipment);
        shipment.setPdfPath(pdfPath);

        Shipment savedShipment = shipmentRepository.save(shipment);

        sendNotifications(savedShipment);

        return savedShipment;
    }

    @Transactional
    public void sendNotifications(Shipment shipment) {
        try {
            emailService.sendShipmentEmail(shipment);
            shipment.setEmailSent(true);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }

        try {
            whatsAppService.sendShipmentWhatsApp(shipment);
            shipment.setWhatsappSent(true);
        } catch (Exception e) {
            System.err.println("Failed to send WhatsApp: " + e.getMessage());
        }

        shipmentRepository.save(shipment);
    }

    @Transactional
    public Shipment updateShipmentStatus(Long shipmentId, Shipment.ShipmentStatus status) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        Shipment.ShipmentStatus oldStatus = shipment.getStatus();
        shipment.setStatus(status);
        Shipment saved = shipmentRepository.save(shipment);

        // Send email when status changes to CONSEGNATA
        if (status == Shipment.ShipmentStatus.CONSEGNATA && oldStatus != Shipment.ShipmentStatus.CONSEGNATA) {
            try {
                if (shipment.getPdfPath() != null && !shipment.getPdfPath().isEmpty()) {
                    emailService.sendShipmentEmail(shipment);
                    shipment.setEmailSent(true);
                    saved = shipmentRepository.save(shipment);
                }
            } catch (Exception e) {
                System.err.println("Failed to send delivery email: " + e.getMessage());
            }
        }

        return saved;
    }

    public List<Shipment> getShipmentsByShop(Long shopId) {
        return shipmentRepository.findByShopAndDateRange(
                shopId,
                LocalDate.now().minusMonths(3),
                LocalDate.now()
        );
    }

    public Shipment getLastShipmentForShop(Long shopId) {
        List<Shipment> shipments = shipmentRepository.findByShopAndDateRange(
                shopId,
                LocalDate.now().minusMonths(1),
                LocalDate.now().minusDays(1)
        );

        return shipments.stream()
                .filter(s -> s.getStatus() != Shipment.ShipmentStatus.BOZZA)
                .max((s1, s2) -> s1.getShipmentDate().compareTo(s2.getShipmentDate()))
                .orElse(null);
    }

    public List<Shipment> getShipmentsByDriver(Long driverId, LocalDate date) {
        return shipmentRepository.findByDriverAndDate(driverId, date);
    }

    public List<Shipment> getShipmentsByDateRange(LocalDate startDate, LocalDate endDate) {
        return shipmentRepository.findByShipmentDateBetween(startDate, endDate);
    }

    public Shipment getShipmentById(Long id) {
        return shipmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));
    }

    public List<Shipment> getAllShipments() {
        return shipmentRepository.findAll();
    }

    @Transactional
    public void deleteShipment(Long id) {
        shipmentRepository.deleteById(id);
    }
}
