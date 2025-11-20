# isAdmin 判斷標準說明

## 📋 當前判斷流程

### 1. 前端判斷邏輯 (`NavScript.ts`)

**位置**: `NavScript.ts` 第 282-364 行 (`validateAdminAccess()` 方法)

**流程**:
1. 檢查用戶是否已登入 (`isLoggedIn && token`)
2. 調用 Gateway API: `GET /tymg/auth/admin`
3. 根據響應狀態碼判斷：
   - **200 OK** → `isAdmin = true` ✅
   - **403 Forbidden** → `isAdmin = false` ❌ (用戶已登入但沒有管理員權限)
   - **401 Unauthorized** → `isAdmin = false` ❌ (Token 無效)
   - **404 Not Found** → `isAdmin = false` ❌ (端點不存在或路由問題)
   - **其他錯誤** → `isAdmin = false` ❌

**代碼位置**:
```typescript
// NavScript.ts:282-364
private async validateAdminAccess() {
  const apiUrl = `${gatewayUrl}/auth/admin`;
  const response = await fetch(apiUrl, {
    headers: { 'Authorization': `Bearer ${this.token}` }
  });
  
  if (response.ok) {
    this.isAdmin = true;  // ✅ 200 OK
  } else {
    this.isAdmin = false;  // ❌ 其他狀態碼
  }
}
```

### 2. 後端判斷邏輯 (`AuthController.java`)

**位置**: `AuthController.java` 第 40-55 行 (`adminEndpoint()` 方法)

**要求**:
- 使用 `@PreAuthorize("hasRole('manage-users')")` 註解
- 需要 JWT token 中包含 `manage-users` 角色
- Spring Security 會檢查用戶是否有 `ROLE_manage-users` 權限

**代碼位置**:
```java
// AuthController.java:40-55
@PreAuthorize("hasRole('manage-users')")
@GetMapping("/admin")
public ResponseEntity<BackendApiResponse<Map<String, Object>>> adminEndpoint() {
    // 只有擁有 manage-users 角色的用戶才能訪問
    // Spring Security 會自動檢查 JWT token 中的角色
}
```

## 🔍 關鍵問題

### ⚠️ 問題：Spring Security 無法從 Keycloak JWT 提取角色

**原因**:
- Spring Security OAuth2 Resource Server **默認**只從 JWT token 的 `scope` claim 中提取權限
- 但 **Keycloak** 使用的是 `realm_access.roles` 或 `resource_access` 來存儲角色
- 當前配置**沒有**自定義 `JwtAuthenticationConverter` 來從 Keycloak 格式中提取角色

**影響**:
- 即使 Keycloak JWT token 中包含 `manage-users` 角色
- Spring Security 也無法識別，導致 `hasRole('manage-users')` 檢查失敗
- 結果：`isAdmin` 總是 `false`，即使用戶實際上有管理員角色

## 🔧 解決方案

### 需要添加 `JwtAuthenticationConverter` 配置

在 `SecurityConfig.java` 中添加以下配置：

```java
@Bean
public JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = 
        new JwtGrantedAuthoritiesConverter();
    
    // 從 Keycloak 的 realm_access.roles 中提取角色
    grantedAuthoritiesConverter.setAuthoritiesClaimName("realm_access.roles");
    grantedAuthoritiesConverter.setAuthorityPrefix("ROLE_");
    
    JwtAuthenticationConverter jwtAuthenticationConverter = 
        new JwtAuthenticationConverter();
    jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(
        grantedAuthoritiesConverter
    );
    
    return jwtAuthenticationConverter;
}

// 在 SecurityFilterChain 中使用
.oauth2ResourceServer(oauth2 -> oauth2
    .jwt(jwt -> jwt
        .decoder(jwtDecoder())
        .jwtAuthenticationConverter(jwtAuthenticationConverter())  // 添加這行
    )
)
```

### 或者使用自定義 Converter

```java
@Component
public class KeycloakJwtAuthenticationConverter 
    implements Converter<Jwt, AbstractAuthenticationToken> {
    
    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        return new JwtAuthenticationToken(jwt, authorities);
    }
    
    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        // 從 realm_access.roles 提取角色
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null) {
            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) realmAccess.get("roles");
            if (roles != null) {
                return roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList());
            }
        }
        return Collections.emptyList();
    }
}
```

## 📊 當前狀態

根據你的日誌：
```
isLoggedIn: true
isAdmin: false
hasUserAccess: true
```

**分析**:
- ✅ 用戶已成功登入 (`isLoggedIn: true`)
- ✅ 用戶有基本訪問權限 (`hasUserAccess: true`)
- ❌ 但沒有管理員權限 (`isAdmin: false`)

**可能的原因**:
1. **最可能**: Spring Security 無法從 Keycloak JWT token 中提取 `manage-users` 角色
2. **次要**: Keycloak 用戶實際沒有分配 `manage-users` 角色
3. **次要**: Gateway 路由配置問題（但 `hasUserAccess: true` 說明路由正常）

## 🧪 調試建議

### 1. 檢查 JWT Token 內容

訪問 `/tymb/auth/token-info` 端點（需要認證），查看：
- `realm_access.roles` 是否包含 `manage-users`
- `authorities` 中是否有 `ROLE_manage-users`

### 2. 檢查 Keycloak 用戶角色

在 Keycloak Admin Console 中確認：
- 用戶是否分配了 `manage-users` 角色（Realm 級別或 Client 級別）
- 角色映射是否正確

### 3. 檢查後端日誌

查看 Backend 日誌中是否有：
- `Access Denied` 錯誤
- `hasRole('manage-users')` 檢查失敗的訊息

## 📝 總結

**isAdmin 判斷標準**:
1. 前端調用 `/tymg/auth/admin` 端點
2. 後端檢查 `hasRole('manage-users')`
3. Spring Security 需要從 JWT token 中提取 `manage-users` 角色
4. **當前問題**: 缺少 `JwtAuthenticationConverter` 配置，無法從 Keycloak JWT 提取角色

**下一步**:
- 添加 `JwtAuthenticationConverter` 配置
- 確保 Keycloak 用戶有 `manage-users` 角色
- 測試 `/tymb/auth/token-info` 端點確認角色提取是否正常

