package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * One acquisition lot of a security, reconstructed from Alpaca FILL activity
 * (or applied synthetically for TLH's own orders). The lot ledger is FRED's
 * source of truth for cost basis — Alpaca's Broker API exposes no tax lots.
 *
 * Effective basis per share = washAdjustedCostPerShare when a wash-sale
 * disallowance has been folded in, else costPerShare.
 */
@Entity
@Table(name = "tax_lots",
        indexes = {
                @Index(name = "idx_tax_lots_user_symbol_status", columnList = "user_id,symbol,status"),
                @Index(name = "idx_tax_lots_user_source_order", columnList = "user_id,source_order_id")
        },
        uniqueConstraints = @UniqueConstraint(name = "uq_tax_lots_source_activity", columnNames = "source_activity_id"))
@Getter
@Setter
@NoArgsConstructor
public class TaxLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "symbol", length = 10, nullable = false)
    private String symbol;

    @Column(name = "original_quantity", precision = 18, scale = 9, nullable = false)
    private BigDecimal originalQuantity;

    @Column(name = "remaining_quantity", precision = 18, scale = 9, nullable = false)
    private BigDecimal remainingQuantity;

    @Column(name = "cost_per_share", precision = 18, scale = 6, nullable = false)
    private BigDecimal costPerShare;

    /** Basis after wash-sale disallowance was added; null when untouched. */
    @Column(name = "wash_adjusted_cost_per_share", precision = 18, scale = 6)
    private BigDecimal washAdjustedCostPerShare;

    /** Alpaca fill transaction_time converted to ET — never the poll clock. */
    @Column(name = "acquired_at", nullable = false)
    private LocalDateTime acquiredAt;

    /** Wash-sale holding-period tacking: acquiredAt of the disallowed lot. */
    @Column(name = "holding_period_tacked_from")
    private LocalDateTime holdingPeriodTackedFrom;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20, nullable = false)
    private LotSource source;

    /** Alpaca activity id — dedup key for activity-ingested fills. */
    @Column(name = "source_activity_id", length = 64)
    private String sourceActivityId;

    /** Alpaca order id — dedup key for poller-applied synthetic fills. */
    @Column(name = "source_order_id", length = 64)
    private String sourceOrderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 15, nullable = false)
    private LotStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum LotSource {
        SCHEDULED_BUY, DRIP, LUMP_SUM, TLH_REPLACEMENT, TLH_REENTRY, BACKFILL, EXTERNAL, REBASED
    }

    public enum LotStatus {
        OPEN, CLOSED, UNRECONCILED
    }

    public BigDecimal effectiveCostPerShare() {
        return washAdjustedCostPerShare != null ? washAdjustedCostPerShare : costPerShare;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("America/New_York"));
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = LotStatus.OPEN;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.of("America/New_York"));
    }
}
