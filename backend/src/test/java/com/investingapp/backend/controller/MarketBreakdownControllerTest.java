package com.investingapp.backend.controller;

import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.MarketBreakdownRepository;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.MarketBreakdownEmailComposer;
import com.investingapp.backend.service.MarketBreakdownService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MarketBreakdownControllerTest {

    private MarketBreakdownRepository repo;
    private MarketBreakdownService service;
    private MarketBreakdownEmailComposer composer;
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        repo = mock(MarketBreakdownRepository.class);
        service = mock(MarketBreakdownService.class);
        composer = mock(MarketBreakdownEmailComposer.class);
        userRepository = mock(UserRepository.class);

        User user = new User();
        user.setId(7L);
        user.setEmail("andy@fredvested.com");
        UserDetailsImpl principal = mock(UserDetailsImpl.class);
        when(principal.getId()).thenReturn(7L);
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(principal);
        SecurityContextHolder.getContext().setAuthentication(auth);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MarketBreakdownController controller(boolean manualGenerateEnabled) {
        return new MarketBreakdownController(repo, service, composer, userRepository, manualGenerateEnabled);
    }

    @Test
    void previewReturns404WhenNotGenerated() {
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.empty());

        ResponseEntity<?> response = controller(false).preview("2026-06");

        assertEquals(404, response.getStatusCode().value());
    }

    @Test
    void previewRendersHtmlForRequestingUser() {
        MarketBreakdown row = new MarketBreakdown();
        row.setPeriodKey("2026-06");
        row.setPeriodLabel("June 2026");
        row.setStatus(MarketBreakdown.STATUS_GENERATED);
        row.setNarrativeHtml("<p>ok</p>");
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.of(row));
        when(composer.resolveNumbers(any(User.class), any())).thenReturn(null);
        when(composer.compose(any(), any())).thenReturn(
                new MarketBreakdownEmailComposer.ComposedEmail("s", "<html>x</html>", "t"));

        ResponseEntity<?> response = controller(false).preview("2026-06");

        assertEquals(200, response.getStatusCode().value());
        assertEquals("<html>x</html>", response.getBody());
    }

    @Test
    void previewRejectsBadMonth() {
        ResponseEntity<?> response = controller(false).preview("junk");
        assertEquals(400, response.getStatusCode().value());
    }

    @Test
    void generateIsForbiddenWhenFlagOff() {
        ResponseEntity<?> response = controller(false).generate("2026-06");
        assertEquals(403, response.getStatusCode().value());
        verify(service, never()).getOrGenerate(any());
    }

    @Test
    void generateRunsWhenFlagOn() {
        MarketBreakdown row = new MarketBreakdown();
        row.setPeriodKey("2026-06");
        row.setStatus(MarketBreakdown.STATUS_GENERATED);
        when(service.getOrGenerate(java.time.YearMonth.of(2026, 6))).thenReturn(row);

        ResponseEntity<?> response = controller(true).generate("2026-06");

        assertEquals(200, response.getStatusCode().value());
        verify(service).getOrGenerate(java.time.YearMonth.of(2026, 6));
    }

    // --- Real-dispatch coverage (standalone MockMvc: servlet dispatch + content
    // negotiation + message conversion, no Spring context). Direct method-call
    // tests can't see produces/converter failures; these can. ---

    @Test
    void previewBadMonthReturns400JsonOverHttp() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller(false)).build();

        mvc.perform(get("/api/market-breakdown/preview").param("month", "junk"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void previewNotGeneratedReturns404OverHttp() throws Exception {
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.empty());
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller(false)).build();

        mvc.perform(get("/api/market-breakdown/preview").param("month", "2026-06"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void previewHappyPathReturnsHtmlOverHttp() throws Exception {
        MarketBreakdown row = new MarketBreakdown();
        row.setPeriodKey("2026-06");
        row.setPeriodLabel("June 2026");
        row.setStatus(MarketBreakdown.STATUS_GENERATED);
        row.setNarrativeHtml("<p>ok</p>");
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.of(row));
        when(composer.resolveNumbers(any(User.class), any())).thenReturn(null);
        when(composer.compose(any(), any())).thenReturn(
                new MarketBreakdownEmailComposer.ComposedEmail("s", "<html>x</html>", "t"));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller(false)).build();

        mvc.perform(get("/api/market-breakdown/preview").param("month", "2026-06"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string("<html>x</html>"));
    }
}
