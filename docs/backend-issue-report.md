# 後端問題報告：People Update API

## 緊急問題

### 問題描述
`/people/update` 端點執行錯誤的 SQL 操作，導致主鍵衝突錯誤。

### 錯誤詳情
```
ERROR: duplicate key value violates unique constraint "people_pkey"
Detail: Key (name)=(Wavo) already exists.
SQLState: 23505
```

## 問題分析

### 根本原因
1. **錯誤的 SQL 操作**: 後端執行 `INSERT` 而不是 `UPDATE`
2. **Hibernate 配置問題**: 可能缺少正確的實體映射
3. **業務邏輯錯誤**: 更新操作被錯誤地實現為插入操作

### 當前 SQL 語句
```sql
-- 錯誤：執行 INSERT
insert into people (age, army_id, army_name, ...) values (...)
```

### 正確的 SQL 語句應該是
```sql
-- 正確：執行 UPDATE
UPDATE people 
SET age = ?, army_id = ?, army_name = ?, ...
WHERE name = ?;
```

## 建議修復方案

### 方案 1: 修復 Hibernate 實體映射
```java
@Entity
@Table(name = "people")
public class Person {
    @Id
    @Column(name = "name")
    private String name;
    
    // 其他欄位...
    
    // 確保有正確的更新方法
    public void updateFrom(Person other) {
        // 更新所有欄位除了主鍵
        this.age = other.age;
        this.armyId = other.armyId;
        // ... 其他欄位
    }
}
```

### 方案 2: 修復 Service 層邏輯
```java
@Service
public class PeopleService {
    
    @Transactional
    public Person updatePerson(Person person) {
        // 檢查是否存在
        Person existing = personRepository.findByName(person.getName());
        
        if (existing != null) {
            // 更新現有記錄
            existing.updateFrom(person);
            return personRepository.save(existing);
        } else {
            // 插入新記錄
            return personRepository.save(person);
        }
    }
}
```

### 方案 3: 使用 UPSERT 操作
```java
@Query(value = """
    INSERT INTO people (name, age, army_id, ...) 
    VALUES (:#{#person.name}, :#{#person.age}, ...)
    ON CONFLICT (name) DO UPDATE SET
        age = EXCLUDED.age,
        army_id = EXCLUDED.army_id,
        -- ... 其他欄位
    """, nativeQuery = true)
void upsertPerson(@Param("person") Person person);
```

## 檢查清單

### 需要檢查的文件
- [ ] `Person.java` 實體類
- [ ] `PersonRepository.java` 數據訪問層
- [ ] `PeopleService.java` 業務邏輯層
- [ ] `PeopleController.java` 控制器層

### 需要驗證的配置
- [ ] Hibernate 實體映射正確
- [ ] 主鍵生成策略正確
- [ ] 事務管理配置正確
- [ ] SQL 日誌記錄開啟

## 預期結果

修復後應該：
1. 正確執行 `UPDATE` 操作
2. 不再出現主鍵衝突錯誤
3. 成功更新現有角色數據
4. 返回正確的 HTTP 200 狀態碼

## 聯繫信息

如果需要在修復過程中協助，請聯繫前端開發團隊。 