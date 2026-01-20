package com.bakery.warehouse.service;

import com.bakery.warehouse.entity.Shipment;
import com.bakery.warehouse.entity.ShipmentItem;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PDFService {

    @Value("${app.pdf.storage-path}")
    private String storagePath;

    public String generateShipmentPDF(Shipment shipment) throws Exception {
        File directory = new File(storagePath);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        String fileName = "shipment_" + shipment.getShipmentNumber() + ".pdf";
        String filePath = storagePath + File.separator + fileName;

        try (FileOutputStream fos = new FileOutputStream(filePath);
             PdfWriter writer = new PdfWriter(fos);
             PdfDocument pdf = new PdfDocument(writer);
             Document document = new Document(pdf)) {

            document.add(new Paragraph("DOCUMENTO DI TRASPORTO")
                    .setFontSize(20)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER));

            document.add(new Paragraph("\n"));

            document.add(new Paragraph("Numero: " + shipment.getShipmentNumber()));
            document.add(new Paragraph("Data: " + shipment.getShipmentDate()
                    .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
            document.add(new Paragraph("Negozio: " + shipment.getShop().getName()));
            document.add(new Paragraph("Indirizzo: " + shipment.getShop().getAddress() +
                    ", " + shipment.getShop().getCity()));

            if (shipment.getDriver() != null) {
                document.add(new Paragraph("Autista: " + shipment.getDriver().getFullName()));
            }

            document.add(new Paragraph("\n"));

            List<ShipmentItem> shipmentItems = new ArrayList<>();
            List<ShipmentItem> returnItems = new ArrayList<>();

            BigDecimal shipmentTotal = BigDecimal.ZERO;
            BigDecimal returnsTotal = BigDecimal.ZERO;

            for (ShipmentItem item : shipment.getItems()) {
                if (item.getItemType() == ShipmentItem.ItemType.RETURN) {
                    returnItems.add(item);
                    if (item.getTotalPrice() != null) {
                        returnsTotal = returnsTotal.add(item.getTotalPrice());
                    }
                } else {
                    shipmentItems.add(item);
                    if (item.getTotalPrice() != null) {
                        shipmentTotal = shipmentTotal.add(item.getTotalPrice());
                    }
                }
            }

            if (!shipmentItems.isEmpty()) {
                float[] columnWidths = {3, 6, 2, 2, 2, 3};
                Table shipmentTable = new Table(UnitValue.createPercentArray(columnWidths));
                shipmentTable.setWidth(UnitValue.createPercentValue(100));

                shipmentTable.addHeaderCell("Codice");
                shipmentTable.addHeaderCell("Prodotto");
                shipmentTable.addHeaderCell("Quantità");
                shipmentTable.addHeaderCell("Unità");
                shipmentTable.addHeaderCell("Prezzo");
                shipmentTable.addHeaderCell("Totale");

                for (ShipmentItem item : shipmentItems) {
                    shipmentTable.addCell(item.getProduct().getCode());
                    shipmentTable.addCell(item.getProduct().getName());
                    shipmentTable.addCell(item.getQuantity().toString());
                    shipmentTable.addCell(item.getProduct().getUnit());
                    shipmentTable.addCell("€ " + item.getUnitPrice().toString());
                    shipmentTable.addCell("€ " + item.getTotalPrice().toString());
                }

                document.add(shipmentTable);
            }

            if (!returnItems.isEmpty()) {
                document.add(new Paragraph("\n"));
                document.add(new Paragraph("Resi").setBold());

                float[] returnColumnWidths = {3, 6, 2, 2, 4, 3};
                Table returnTable = new Table(UnitValue.createPercentArray(returnColumnWidths));
                returnTable.setWidth(UnitValue.createPercentValue(100));

                returnTable.addHeaderCell("Codice");
                returnTable.addHeaderCell("Prodotto");
                returnTable.addHeaderCell("Quantità");
                returnTable.addHeaderCell("Unità");
                returnTable.addHeaderCell("Motivo");
                returnTable.addHeaderCell("Totale");

                for (ShipmentItem item : returnItems) {
                    returnTable.addCell(item.getProduct().getCode());
                    returnTable.addCell(item.getProduct().getName());
                    returnTable.addCell(item.getQuantity().toString());
                    returnTable.addCell(item.getProduct().getUnit());
                    String reason = item.getReturnReason() != null
                            ? item.getReturnReason().name().replace('_', ' ')
                            : "-";
                    returnTable.addCell(reason);
                    returnTable.addCell("€ " + item.getTotalPrice().toString());
                }

                document.add(returnTable);
            }

            document.add(new Paragraph("\n"));

            if (shipmentTotal.compareTo(BigDecimal.ZERO) > 0) {
                document.add(new Paragraph("Totale Spedizioni: € " + shipmentTotal.toString())
                        .setTextAlignment(TextAlignment.RIGHT));
            }

            if (returnsTotal.compareTo(BigDecimal.ZERO) > 0) {
                document.add(new Paragraph("Totale Resi: € " + returnsTotal.toString())
                        .setTextAlignment(TextAlignment.RIGHT));
            }

            BigDecimal netTotal = shipmentTotal.subtract(returnsTotal);

            document.add(new Paragraph("TOTALE NETTO (Spedizioni - Resi): € " + netTotal.toString())
                    .setFontSize(14)
                    .setBold()
                    .setTextAlignment(TextAlignment.RIGHT));

            if (shipment.getNotes() != null && !shipment.getNotes().isEmpty()) {
                document.add(new Paragraph("\n"));
                document.add(new Paragraph("Note: " + shipment.getNotes()));
            }

            document.add(new Paragraph("\n\n"));
            document.add(new Paragraph("Firma per accettazione: ____________________"));
        }

        return filePath;
    }
}
