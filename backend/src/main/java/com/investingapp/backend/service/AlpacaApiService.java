import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class AlpacaApiService {

    private final WebClient webClient;

    public AlpacaApiService(
        @Value("${alpaca.api.key}") String apiKey,
        @Value("${alpaca.api.secret}") String apiSecret
    ) {
        this.webClient = WebClient.builder()
            .baseUrl("https://paper-api.alpaca.markets/v2") // Use live endpoint in production
            .defaultHeader("APCA-API-KEY-ID", apiKey)
            .defaultHeader("APCA-API-SECRET-KEY", apiSecret)
            .build();
    }

    public Mono<String> getAccountInfo() {
        return webClient.get()
            .uri("/account")
            .retrieve()
            .bodyToMono(String.class);
    }
}