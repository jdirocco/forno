package com.bakery.warehouse.service;

import com.bakery.warehouse.entity.Shipment;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class WhatsAppService {

    @Value("${app.twilio.account-sid}")
    private String accountSid;

    @Value("${app.twilio.auth-token}")
    private String authToken;

    @Value("${app.twilio.whatsapp-from}")
    private String whatsappFrom;

    @PostConstruct
    public void init() {
        if (accountSid != null && !accountSid.startsWith("your-") && authToken != null && !authToken.startsWith("your-")) {
            Twilio.init(accountSid, authToken);
        }
    }

    public void sendShipmentWhatsApp(Shipment shipment) {
        if (!isTwilioConfigured()) {
            System.out.println("Twilio not configured, skipping WhatsApp notification");
            return;
        }

        String shopWhatsApp = shipment.getShop().getWhatsappNumber();
        if (shopWhatsApp == null || shopWhatsApp.isEmpty()) {
            throw new RuntimeException("Shop WhatsApp number not configured");
        }

        String messageBody = buildWhatsAppMessage(shipment);

        try {
            Message message = Message.creator(
                    new PhoneNumber("whatsapp:" + shopWhatsApp),
                    new PhoneNumber(whatsappFrom),
                    messageBody
            ).create();

            System.out.println("WhatsApp sent: " + message.getSid());

            if (shipment.getDriver() != null && shipment.getDriver().getWhatsappNumber() != null) {
                Message driverMessage = Message.creator(
                        new PhoneNumber("whatsapp:" + shipment.getDriver().getWhatsappNumber()),
                        new PhoneNumber(whatsappFrom),
                        messageBody
                ).create();
                System.out.println("WhatsApp sent to driver: " + driverMessage.getSid());
            }

        } catch (Exception e) {
            throw new RuntimeException("Failed to send WhatsApp: " + e.getMessage(), e);
        }
    }

    private String buildWhatsAppMessage(Shipment shipment) {
        StringBuilder message = new StringBuilder();
        message.append("*Documento di Trasporto*\n\n");
        message.append("Numero: ").append(shipment.getShipmentNumber()).append("\n");
        message.append("Data: ").append(shipment.getShipmentDate()
                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n");
        message.append("Negozio: ").append(shipment.getShop().getName()).append("\n");
        message.append("Indirizzo: ").append(shipment.getShop().getAddress())
                .append(", ").append(shipment.getShop().getCity()).append("\n");

        if (shipment.getDriver() != null) {
            message.append("Autista: ").append(shipment.getDriver().getFullName()).append("\n");
        }

        message.append("\nControlla la tua email per il documento completo in PDF.");

        return message.toString();
    }

    private boolean isTwilioConfigured() {
        return accountSid != null && !accountSid.startsWith("your-") &&
                authToken != null && !authToken.startsWith("your-") &&
                whatsappFrom != null && !whatsappFrom.startsWith("whatsapp:+1415");
    }
}
