package com.bakery.warehouse.service;

import com.bakery.warehouse.entity.Shipment;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendShipmentEmail(Shipment shipment) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        String shopEmail = shipment.getShop().getEmail();
        if (shopEmail == null || shopEmail.isEmpty()) {
            throw new RuntimeException("Shop email not configured");
        }

        helper.setTo(shopEmail);

        if (shipment.getDriver() != null && shipment.getDriver().getEmail() != null) {
            helper.setCc(shipment.getDriver().getEmail());
        }

        helper.setSubject("Documento di Trasporto - " + shipment.getShipmentNumber());

        String emailBody = buildEmailBody(shipment);
        helper.setText(emailBody, true);

        if (shipment.getPdfPath() != null) {
            File pdfFile = new File(shipment.getPdfPath());
            if (pdfFile.exists()) {
                FileSystemResource file = new FileSystemResource(pdfFile);
                helper.addAttachment("DDT_" + shipment.getShipmentNumber() + ".pdf", file);
            }
        }

        mailSender.send(message);
    }

    private String buildEmailBody(Shipment shipment) {
        StringBuilder body = new StringBuilder();
        body.append("<html><body>");
        body.append("<h2>Documento di Trasporto</h2>");
        body.append("<p><strong>Numero:</strong> ").append(shipment.getShipmentNumber()).append("</p>");
        body.append("<p><strong>Data:</strong> ")
                .append(shipment.getShipmentDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .append("</p>");
        body.append("<p><strong>Negozio:</strong> ").append(shipment.getShop().getName()).append("</p>");
        body.append("<p><strong>Indirizzo:</strong> ").append(shipment.getShop().getAddress())
                .append(", ").append(shipment.getShop().getCity()).append("</p>");

        if (shipment.getDriver() != null) {
            body.append("<p><strong>Autista:</strong> ").append(shipment.getDriver().getFullName()).append("</p>");
        }

        body.append("<p>Trova allegato il documento di trasporto in formato PDF.</p>");
        body.append("<p>Cordiali saluti,<br>Piccolo forno a legna - Manoppello</p>");
        body.append("</body></html>");

        return body.toString();
    }
}
