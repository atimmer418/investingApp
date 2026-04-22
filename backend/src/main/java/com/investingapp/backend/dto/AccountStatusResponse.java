package com.investingapp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AccountStatusResponse {

    private String accountStatus;
    private boolean hasActionRequired;
}
