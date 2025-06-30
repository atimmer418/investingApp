// src/main/java/com/investingapp/backend/config/SecurityConfig.java
package com.investingapp.backend.config;

import com.investingapp.backend.security.jwt.AuthEntryPointJwt;
import com.investingapp.backend.security.jwt.AuthTokenFilter;
import com.investingapp.backend.security.services.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value; // Import Value
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration; // Import CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource; // Import CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource; // Import UrlBasedCorsConfigurationSource

import java.util.Arrays; // Import Arrays
import java.util.List; // Import List

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;

    // Assuming your Angular app (when accessed from iPhone) runs on port 8100
    // and your MacBook's IP is something like 192.168.1.123
    // You should get this from your application.properties or environment variables if possible,
    // or define it clearly here. For now, let's hardcode for demonstration.
    // IMPORTANT: Replace "YOUR_MACBOOK_IP_ADDRESS" with your actual MacBook's IP.
    // IMPORTANT: Replace "YOUR_ANGULAR_PORT_ON_IPHONE" with the port (e.g., 8100, 4200).
    private final String iphoneAngularOrigin = "http://YOUR_MACBOOK_IP_ADDRESS:YOUR_ANGULAR_PORT_ON_IPHONE";


    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Define your allowed origins.
        // This should include:
        // - localhost for local browser testing
        // - capacitor://localhost, ionic://localhost if you use those schemes for native builds
        // - The IP address origin for testing on your physical iPhone
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:8100",          // Common for Ionic/Capacitor serve
                "http://localhost:4200",          // Common for ng serve
                "http://localhost:3000",          // Common for ng serve
                "capacitor://localhost",
                "ionic://localhost",
                "http://localhost",               // Sometimes needed by native wrappers
                iphoneAngularOrigin,               // Your iPhone's access point
                "https://37de-2600-4040-2a92-8800-a865-27f2-f55c-bf44.ngrok-free.app",
                "http://192.168.1.166:3000",
                "http://api-test.fredvested.com:3000"
        ));
        // ngrok
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*")); // Allow all headers
        configuration.setAllowCredentials(true); // Important for cookies, authorization headers with HTTPS
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); // Apply this configuration to all paths
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource())) // ADD THIS LINE for CORS
            .csrf(AbstractHttpConfigurer::disable)
            .exceptionHandling(customizer -> customizer.authenticationEntryPoint(unauthorizedHandler))
            .securityContext(context -> context
                .securityContextRepository(new RequestAttributeSecurityContextRepository())
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/.well-known/apple-app-site-association").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/plaid/create_link_token_anonymous").permitAll()
                .requestMatchers("/api/plaid/exchange_public_token_anonymous").permitAll()
                .requestMatchers("/api/passkey/**").permitAll()
                .requestMatchers("/hello").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .anonymous(AbstractHttpConfigurer::disable);

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}