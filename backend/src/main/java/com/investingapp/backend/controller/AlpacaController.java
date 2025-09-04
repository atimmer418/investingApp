import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class AlpacaController {

    private final AlpacaApiService alpacaApiService;

    public AlpacaController(AlpacaApiService alpacaApiService) {
        this.alpacaApiService = alpacaApiService;
    }

    @GetMapping("/api/alpaca/account")
    public Mono<String> getAccount() {
        return alpacaApiService.getAccountInfo();
    }
}