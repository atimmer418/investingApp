package com.investingapp.backend.service;

import com.investingapp.backend.model.User;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Plain JUnit 5 (no Spring context) — verifies the single-flight + 60s TTL cache wrapped around
 * getPortfolioDashboard(). The uncached Alpaca assembly (fetchPortfolioDashboard) is overridden by a
 * counting subclass so we can assert exactly how many times it runs, without mocking Alpaca's wire
 * format. This is the backend analog of the frontend shareReplay(1) single-flight in
 * PortfolioStoreService.
 */
class PortfolioDashboardServiceCacheTest {

    /** decrypt() is identity so tests need no real key/crypto (getPortfolioDashboard decrypts first). */
    private static class IdentityEncryptionService extends EncryptionService {
        IdentityEncryptionService() {
            super(null);
        }

        @Override
        public String decrypt(String encryptedData) {
            return encryptedData;
        }
    }

    /** Counts (and can delay / fail) the uncached fetch so cache behavior is observable. */
    private static class CountingService extends PortfolioDashboardService {
        final AtomicInteger fetches = new AtomicInteger(0);
        volatile long fetchDelayMs = 0;
        volatile int failFirstN = 0;

        @Override
        PortfolioDashboardData fetchPortfolioDashboard(User user, String accountId) {
            int n = fetches.incrementAndGet();
            if (fetchDelayMs > 0) {
                try {
                    Thread.sleep(fetchDelayMs);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            if (n <= failFirstN) {
                throw new RuntimeException("simulated Alpaca failure #" + n);
            }
            return new PortfolioDashboardData(null, List.of(), null, List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
        }
    }

    private static CountingService newService() throws Exception {
        CountingService svc = new CountingService();
        Field f = PortfolioDashboardService.class.getDeclaredField("encryptionService");
        f.setAccessible(true);
        f.set(svc, new IdentityEncryptionService());
        return svc;
    }

    private static User userWithAccount(String acct) {
        User u = new User();
        u.setAlpacaAccountId(acct);
        return u;
    }

    @Test
    void servesFromCacheWithinTtlAndFetchesOnce() throws Exception {
        CountingService svc = newService();
        User user = userWithAccount("acct-1");

        PortfolioDashboardService.PortfolioDashboardData a = svc.getPortfolioDashboard(user);
        PortfolioDashboardService.PortfolioDashboardData b = svc.getPortfolioDashboard(user);

        assertEquals(1, svc.fetches.get(), "second call within TTL must be served from cache");
        assertSame(a, b, "cache must return the same assembled instance");
    }

    @Test
    void singleFlightCollapsesConcurrentCallers() throws Exception {
        CountingService svc = newService();
        svc.fetchDelayMs = 150; // hold the fetch open so all threads pile onto the same in-flight future
        User user = userWithAccount("acct-1");

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger nonNull = new AtomicInteger(0);
        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    if (svc.getPortfolioDashboard(user) != null) {
                        nonNull.incrementAndGet();
                    }
                } catch (Exception ignored) {
                    // failures are asserted via the fetch counter / nonNull tally
                }
            });
        }
        start.countDown(); // release all threads at once
        pool.shutdown();
        assertTrue(pool.awaitTermination(5, TimeUnit.SECONDS), "workers should finish");

        assertEquals(1, svc.fetches.get(), "concurrent callers must collapse onto a single fetch");
        assertEquals(threads, nonNull.get(), "every concurrent caller must receive the shared result");
    }

    @Test
    void errorsAreNotCachedAndNextCallRetries() throws Exception {
        CountingService svc = newService();
        svc.failFirstN = 1; // first fetch throws, second succeeds
        User user = userWithAccount("acct-1");

        assertThrows(RuntimeException.class, () -> svc.getPortfolioDashboard(user));
        // The failure cached nothing, so this call refetches and succeeds.
        assertNotNull(svc.getPortfolioDashboard(user));
        assertEquals(2, svc.fetches.get(), "a failed fetch must not be cached; the next call refetches");
    }

    @Test
    void differentAccountsAreCachedIndependently() throws Exception {
        CountingService svc = newService();

        svc.getPortfolioDashboard(userWithAccount("acct-1"));
        svc.getPortfolioDashboard(userWithAccount("acct-2"));
        svc.getPortfolioDashboard(userWithAccount("acct-1")); // served from acct-1's cache entry

        assertEquals(2, svc.fetches.get(), "each account keys its own cache entry");
    }
}
