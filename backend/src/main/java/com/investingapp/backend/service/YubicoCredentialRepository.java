// src/main/java/com/investingapp/backend/service/YubicoCredentialRepository.java
package com.investingapp.backend.service;

import com.investingapp.backend.model.PasskeyCredential;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.PasskeyCredentialRepository;
import com.investingapp.backend.repository.UserRepository;
import com.yubico.webauthn.CredentialRepository;
import com.yubico.webauthn.RegisteredCredential;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class YubicoCredentialRepository implements CredentialRepository {

    private final UserRepository userRepository;
    private final PasskeyCredentialRepository passkeyCredentialRepository;

    @Autowired
    public YubicoCredentialRepository(UserRepository userRepository, PasskeyCredentialRepository passkeyCredentialRepository) {
        this.userRepository = userRepository;
        this.passkeyCredentialRepository = passkeyCredentialRepository;
    }

    @Override
    public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
        return userRepository.findByEmail(username).map(user ->
            passkeyCredentialRepository.findAllByUser(user).stream()
                .map(cred -> PublicKeyCredentialDescriptor.builder()
                    .id(PasskeyCredential.base64UrlToByteArray(cred.getExternalId()))
                    .build())
                .collect(Collectors.toSet())
        ).orElse(Set.of());
    }

    @Override
    public Optional<ByteArray> getUserHandleForUsername(String username) {
        return userRepository.findByEmail(username)
                .map(user -> PasskeyCredential.base64UrlToByteArray(user.getUserHandle()));
    }

    @Override
    public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
        return userRepository.findByUserHandle(PasskeyCredential.byteArrayToBase64Url(userHandle))
                .map(User::getEmail);
    }

    @Override
    public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
        String externalId = PasskeyCredential.byteArrayToBase64Url(credentialId);
        return passkeyCredentialRepository.findByExternalId(externalId)
            .filter(cred -> cred.getUser().getUserHandle().equals(PasskeyCredential.byteArrayToBase64Url(userHandle)))
            .map(cred -> RegisteredCredential.builder()
                .credentialId(credentialId)
                .userHandle(userHandle)
                .publicKeyCose(PasskeyCredential.base64UrlToByteArray(cred.getPublicKeyCose()))
                .signatureCount(cred.getSignatureCount())
                .build());
    }

    @Override
    public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
        String externalId = PasskeyCredential.byteArrayToBase64Url(credentialId);
        return passkeyCredentialRepository.findByExternalId(externalId).stream()
            .map(cred -> RegisteredCredential.builder()
                .credentialId(credentialId)
                .userHandle(PasskeyCredential.base64UrlToByteArray(cred.getUser().getUserHandle()))
                .publicKeyCose(PasskeyCredential.base64UrlToByteArray(cred.getPublicKeyCose()))
                .signatureCount(cred.getSignatureCount())
                .build()
            ).collect(Collectors.toSet());
    }
}