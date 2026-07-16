package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * A ±30-day wash-sale enforcement window opened by a harvest sale. Committed
 * in the SAME transaction as the harvest claim — before the sell order exists
 * — so buy-side enforcement always precedes the sale.
 *
 * The guard's blocking contract is DATE-based: a buy of the symbol (or any
 * identity-group sibling) is blocked iff startDate <= today <= endDate. The
 * `active` flag is only an index hint / cancellation marker; a canceled
 * window also has its endDate rewound so date comparison agrees.
 *
 * Windows are tier-, mode- and enrollment-independent by construction: they
 * protect a loss the user already realized, so subscription expiry or
 * unenrollment never disables them.
 */
@Entity
@Table(name = "tlh_wash_windows",
        indexes = {
                @Index(name = "idx_wash_windows_user_symbol_end", columnList = "user_id,symbol,end_date"),
                @Index(name = "idx_wash_windows_active", columnList = "active")
        })
@Getter
@Setter
@NoArgsConstructor
public class WashSaleWindow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "symbol", length = 10, nullable = false)
    private String symbol;

    /** Sell submission date (provisional); rewritten to the fill date on confirm. */
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /** fillDate + 30; buys become legal again on endDate + 1. */
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", length = 20, nullable = false)
    private WindowReason reason;

    @Column(name = "harvest_event_id")
    private Long harvestEventId;

    /** Where blocked scheduled-contribution slices are redirected; null ⇒ skip to cash. */
    @Column(name = "redirect_symbol", length = 10)
    private String redirectSymbol;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public enum WindowReason {
        HARVEST_SALE
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.of("America/New_York"));
        if (this.active == null) {
            this.active = true;
        }
    }
}
