package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * One tax-loss-harvest chain for one (user, symbol): the audit row for the
 * sell leg, the replacement leg, and the optional day-31 re-entry leg.
 *
 * The UNIQUE (user_id, symbol, cycle_date, mode) constraint is the claim-level
 * idempotency guarantee — a scheduler re-run or concurrent cycle cannot create
 * a second harvest of the same symbol on the same day. Client order ids are
 * persisted BEFORE any HTTP call so crash recovery can adopt-or-fail against
 * Alpaca's own client_order_id uniqueness.
 *
 * Loss sign convention: realizedLoss / disallowedLoss / allowedLoss are
 * POSITIVE magnitudes; allowedLoss = max(0, realizedLoss − disallowedLoss)
 * is the ONLY figure the summary endpoint ever sums.
 */
@Entity
@Table(name = "tlh_harvest_events",
        indexes = {
                @Index(name = "idx_tlh_events_status", columnList = "status"),
                @Index(name = "idx_tlh_events_user_year", columnList = "user_id,tax_year")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_tlh_events_claim", columnNames = { "user_id", "symbol", "cycle_date", "mode" }),
                @UniqueConstraint(name = "uq_tlh_events_sell_client_order", columnNames = "sell_client_order_id")
        })
@Getter
@Setter
@NoArgsConstructor
public class TlhHarvestEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Encrypted snapshot of the user's Alpaca account id at claim time. */
    @Column(name = "alpaca_account_id", length = 512)
    private String alpacaAccountId;

    @Column(name = "symbol", length = 10, nullable = false)
    private String symbol;

    @Column(name = "replacement_symbol", length = 10)
    private String replacementSymbol;

    @Enumerated(EnumType.STRING)
    @Column(name = "replacement_policy", length = 15)
    private ReplacementPolicy replacementPolicy;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", length = 10, nullable = false)
    private HarvestMode mode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private EventStatus status;

    @Column(name = "cycle_date", nullable = false)
    private LocalDate cycleDate;

    @Column(name = "veto_reason", length = 60)
    private String vetoReason;

    @Column(name = "quantity_targeted", precision = 18, scale = 9)
    private BigDecimal quantityTargeted;

    @Column(name = "quantity_sold", precision = 18, scale = 9)
    private BigDecimal quantitySold;

    @Column(name = "est_cost_basis", precision = 12, scale = 2)
    private BigDecimal estCostBasis;

    @Column(name = "estimated_loss", precision = 12, scale = 2)
    private BigDecimal estimatedLoss;

    /** Positive magnitude of the net realized loss (0 on a net gain). */
    @Column(name = "realized_loss", precision = 12, scale = 2)
    private BigDecimal realizedLoss;

    /** Positive net gain when the fill unexpectedly realized one (COMPLETED_GAIN). */
    @Column(name = "net_gain", precision = 12, scale = 2)
    private BigDecimal netGain;

    @Column(name = "disallowed_loss", precision = 12, scale = 2, nullable = false)
    private BigDecimal disallowedLoss = BigDecimal.ZERO;

    /** max(0, realizedLoss − disallowedLoss) — the only summed figure. */
    @Column(name = "allowed_loss", precision = 12, scale = 2, nullable = false)
    private BigDecimal allowedLoss = BigDecimal.ZERO;

    /** True when the harvest ran on a REBASED (position-level) basis estimate. */
    @Column(name = "basis_estimated", nullable = false)
    private Boolean basisEstimated = false;

    @Column(name = "actual_proceeds", precision = 12, scale = 2)
    private BigDecimal actualProceeds;

    /** ET year of sellFilledAt. */
    @Column(name = "tax_year")
    private Integer taxYear;

    @Column(name = "sell_client_order_id", length = 48)
    private String sellClientOrderId;

    @Column(name = "sell_order_id", length = 64)
    private String sellOrderId;

    @Column(name = "sell_submitted_at")
    private LocalDateTime sellSubmittedAt;

    /** Alpaca filled_at converted to ET — anchors the wash window and taxYear. */
    @Column(name = "sell_filled_at")
    private LocalDateTime sellFilledAt;

    /** Current attempt id: "tlh-b-{eventId}-a{n}". */
    @Column(name = "replacement_client_order_id", length = 48)
    private String replacementClientOrderId;

    @Column(name = "replacement_attempts", nullable = false)
    private Integer replacementAttempts = 0;

    @Column(name = "replacement_order_id", length = 64)
    private String replacementOrderId;

    @Column(name = "replacement_notional", precision = 12, scale = 2)
    private BigDecimal replacementNotional;

    @Column(name = "replacement_filled_qty", precision = 18, scale = 9)
    private BigDecimal replacementFilledQty;

    @Column(name = "replacement_filled_avg_price", precision = 18, scale = 6)
    private BigDecimal replacementFilledAvgPrice;

    @Column(name = "replacement_filled_at")
    private LocalDateTime replacementFilledAt;

    /** Current attempt id: "tlh-r-{eventId}-a{n}". */
    @Column(name = "reentry_client_order_id", length = 48)
    private String reentryClientOrderId;

    @Column(name = "reentry_attempts", nullable = false)
    private Integer reentryAttempts = 0;

    @Column(name = "reentry_order_id", length = 64)
    private String reentryOrderId;

    @Column(name = "reentry_due_on")
    private LocalDate reentryDueOn;

    /** PENDING, SUBMITTED, FILLED, ABANDONED — null when no re-entry leg. */
    @Column(name = "reentry_status", length = 20)
    private String reentryStatus;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum HarvestMode {
        DRY_RUN, LIVE
    }

    public enum ReplacementPolicy {
        PAIR, HOLD_CASH, NONE
    }

    public enum EventStatus {
        PROPOSED,               // dry-run: full numbers, no orders
        VETOED,                 // eligibility/replacement/race veto — audit row
        EXPIRED,                // stale dry-run proposal swept
        SELL_PENDING,           // claimed + window committed, order not yet confirmed
        SELL_SUBMITTED,         // sell order accepted by Alpaca
        SELL_FILLED,            // sell filled, loss realized, replacement leg pending
        REPLACEMENT_SUBMITTED,  // replacement buy accepted by Alpaca
        COMPLETED,              // replacement filled
        COMPLETED_PARTIAL,      // sell partially filled; disallowance applied
        COMPLETED_NO_REPLACEMENT, // holding cash (policy / degraded); may re-enter
        COMPLETED_GAIN,         // fill realized a net gain; window canceled, excluded from savings
        REENTERED,              // day-31 re-entry into the original symbol filled
        CANCELED_UNFILLED,      // sell died with zero fill; window canceled
        CANCELED_ACCOUNT,       // account closed/liquidated mid-chain
        FAILED                  // terminal error; window canceled
    }

    /** Statuses that hold a live order chain — one per user at a time. */
    public static final java.util.List<EventStatus> IN_FLIGHT_STATUSES = java.util.List.of(
            EventStatus.SELL_PENDING, EventStatus.SELL_SUBMITTED,
            EventStatus.SELL_FILLED, EventStatus.REPLACEMENT_SUBMITTED);

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("America/New_York"));
        this.createdAt = now;
        this.updatedAt = now;
        if (this.disallowedLoss == null) this.disallowedLoss = BigDecimal.ZERO;
        if (this.allowedLoss == null) this.allowedLoss = BigDecimal.ZERO;
        if (this.replacementAttempts == null) this.replacementAttempts = 0;
        if (this.reentryAttempts == null) this.reentryAttempts = 0;
        if (this.basisEstimated == null) this.basisEstimated = false;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.of("America/New_York"));
    }
}
