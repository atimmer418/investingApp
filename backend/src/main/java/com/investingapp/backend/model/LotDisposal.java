package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * FIFO relief of one TaxLot by one sell fill. realizedPnl is SIGNED
 * (negative = loss). disallowedLoss is a positive magnitude carved out of a
 * loss by wash-sale matching; the summary only ever counts
 * allowedLoss = |loss| − disallowed at the harvest-event level.
 * harvestEventId is null for external / user-initiated sells detected by
 * reconciliation.
 */
@Entity
@Table(name = "tax_lot_disposals",
        indexes = {
                @Index(name = "idx_disposals_user_symbol_at", columnList = "user_id,symbol,disposed_at"),
                @Index(name = "idx_disposals_sell_order", columnList = "sell_order_id")
        },
        uniqueConstraints = @UniqueConstraint(name = "uq_disposals_activity_lot",
                columnNames = { "sell_activity_id", "tax_lot_id" }))
@Getter
@Setter
@NoArgsConstructor
public class LotDisposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "tax_lot_id", nullable = false)
    private Long taxLotId;

    @Column(name = "symbol", length = 10, nullable = false)
    private String symbol;

    @Column(name = "quantity", precision = 18, scale = 9, nullable = false)
    private BigDecimal quantity;

    @Column(name = "proceeds_per_share", precision = 18, scale = 6, nullable = false)
    private BigDecimal proceedsPerShare;

    /** Signed: negative = loss, positive = gain. */
    @Column(name = "realized_pnl", precision = 12, scale = 2, nullable = false)
    private BigDecimal realizedPnl;

    /** Positive magnitude washed out of a loss; 0 when no wash sale. */
    @Column(name = "disallowed_loss", precision = 12, scale = 2, nullable = false)
    private BigDecimal disallowedLoss = BigDecimal.ZERO;

    @Column(name = "wash_sale", nullable = false)
    private Boolean washSale = false;

    /** The replacement lot whose basis absorbed the disallowed loss. */
    @Column(name = "replacement_lot_id")
    private Long replacementLotId;

    /** Alpaca fill time in ET. */
    @Column(name = "disposed_at", nullable = false)
    private LocalDateTime disposedAt;

    @Column(name = "sell_order_id", length = 64)
    private String sellOrderId;

    @Column(name = "sell_activity_id", length = 64)
    private String sellActivityId;

    /** Null ⇒ external / user-initiated sell. */
    @Column(name = "harvest_event_id")
    private Long harvestEventId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.of("America/New_York"));
        if (this.disallowedLoss == null) {
            this.disallowedLoss = BigDecimal.ZERO;
        }
        if (this.washSale == null) {
            this.washSale = false;
        }
    }
}
