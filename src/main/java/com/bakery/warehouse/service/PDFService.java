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

            float[] columnWidths = {3, 6, 2, 2, 2, 3};
            Table table = new Table(UnitValue.createPercentArray(columnWidths));
            table.setWidth(UnitValue.createPercentValue(100));

            table.addHeaderCell("Codice");
            table.addHeaderCell("Prodotto");
            table.addHeaderCell("Quantità");
            table.addHeaderCell("Unità");
            table.addHeaderCell("Prezzo");
            table.addHeaderCell("Totale");

            BigDecimal grandTotal = BigDecimal.ZERO;

            for (ShipmentItem item : shipment.getItems()) {
                table.addCell(item.getProduct().getCode());
                table.addCell(item.getProduct().getName());
                table.addCell(item.getQuantity().toString());
                table.addCell(item.getProduct().getUnit());
                table.addCell("€ " + item.getUnitPrice().toString());
                table.addCell("€ " + item.getTotalPrice().toString());

                grandTotal = grandTotal.add(item.getTotalPrice());
            }

            document.add(table);

            document.add(new Paragraph("\n"));
            document.add(new Paragraph("TOTALE: € " + grandTotal.toString())
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
