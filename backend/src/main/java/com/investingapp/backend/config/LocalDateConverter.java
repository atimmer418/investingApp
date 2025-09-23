package com.investingapp.backend.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.LocalDate;
import java.sql.Date;

@Converter(autoApply = true)
public class LocalDateConverter implements AttributeConverter<LocalDate, Date> {

    @Override
    public Date convertToDatabaseColumn(LocalDate localDate) {
        if (localDate == null) {
            return null;
        }
        // Force the conversion to happen without any timezone adjustment
        return Date.valueOf(localDate);
    }

    @Override
    public LocalDate convertToEntityAttribute(Date date) {
        if (date == null) {
            return null;
        }
        // Convert back without timezone adjustment
        return date.toLocalDate();
    }
}