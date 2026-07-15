package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * One row per month: the generated Monthly Market Breakdown narrative plus the
 * exact inputs (ETF returns) and web-search citations used — the compliance
 * audit trail. Every recipient of a month gets this identical narrative;
 * regeneration after FAILED updates the row in place (periodKey is unique).
 */
@Entity
@Table(name = "market_breakdown")
@Data
@NoArgsConstructor
public class MarketBreakdown {

    public static final String STATUS_GENERATED = "GENERATED";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "period_key", nullable = false, unique = true, length = 10)
    private String periodKey; // "2026-06"

    @Column(nullable = false, length = 30)
    private String periodLabel; // "June 2026"

    @Column(columnDefinition = "LONGTEXT")
    private String narrativeHtml; // validated fragment: <p> <strong> <em> <h3> <ul> <li> <br> only

    @Column(columnDefinition = "TEXT")
    private String etfReturnsJson; // numbers fed to Claude — audit

    @Column(columnDefinition = "TEXT")
    private String sourcesJson; // web-search citations — audit

    @Column(length = 60)
    private String model; // e.g. claude-sonnet-5

    @Column(nullable = false, length = 12)
    private String status; // GENERATED | FAILED

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime generatedAt; // touched on every (re)generation attempt
}
