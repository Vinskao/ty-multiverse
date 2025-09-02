# People Update API

## Endpoint
`POST /api/people/update`

## Description
This endpoint forwards people update requests to the backend server. It accepts the same request body structure as the backend API and provides proper error handling and logging.

## Request Format

### Headers
```
Content-Type: application/json
Accept: */*
```

### Request Body
The request body should contain a JSON object with the following structure:

```json
{
  "nameOriginal": "string",
  "codeName": "string", 
  "name": "string",
  "physicPower": 0,
  "magicPower": 0,
  "utilityPower": 0,
  "dob": "string",
  "race": "string",
  "attributes": "string",
  "gender": "string",
  "assSize": "string",
  "boobsSize": "string",
  "heightCm": 0,
  "weightKg": 0,
  "profession": "string",
  "combat": "string",
  "favoriteFoods": "string",
  "job": "string",
  "physics": "string",
  "knownAs": "string",
  "personality": "string",
  "interest": "string",
  "likes": "string",
  "dislikes": "string",
  "concubine": "string",
  "faction": "string",
  "armyId": 0,
  "armyName": "string",
  "deptId": 0,
  "deptName": "string",
  "originArmyId": 0,
  "originArmyName": "string",
  "gaveBirth": true,
  "email": "string",
  "age": 0,
  "proxy": "string",
  "baseAttributes": "string",
  "bonusAttributes": "string",
  "stateAttributes": "string",
  "embedding": "string",
  "createdAt": "2025-08-03T12:19:33.395Z",
  "updatedAt": "2025-08-03T12:19:33.395Z",
  "version": 0
}
```

## Example Usage

### cURL
```bash
curl -X 'POST' \
  'http://localhost:8080/tymb/people/update' \
  -H 'accept: */*' \
  -H 'Content-Type: application/json' \
  -d '{
  "nameOriginal": "string",
  "codeName": "string",
  "name": "string",
  "physicPower": 0,
  "magicPower": 0,
  "utilityPower": 0,
  "dob": "string",
  "race": "string",
  "attributes": "string",
  "gender": "string",
  "assSize": "string",
  "boobsSize": "string",
  "heightCm": 0,
  "weightKg": 0,
  "profession": "string",
  "combat": "string",
  "favoriteFoods": "string",
  "job": "string",
  "physics": "string",
  "knownAs": "string",
  "personality": "string",
  "interest": "string",
  "likes": "string",
  "dislikes": "string",
  "concubine": "string",
  "faction": "string",
  "armyId": 0,
  "armyName": "string",
  "deptId": 0,
  "deptName": "string",
  "originArmyId": 0,
  "originArmyName": "string",
  "gaveBirth": true,
  "email": "string",
  "age": 0,
  "proxy": "string",
  "baseAttributes": "string",
  "bonusAttributes": "string",
  "stateAttributes": "string",
  "embedding": "string",
  "createdAt": "2025-08-03T12:19:33.395Z",
  "updatedAt": "2025-08-03T12:19:33.395Z",
  "version": 0
}'
```

### JavaScript/Fetch
```javascript
const response = await fetch('/api/people/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': '*/*'
  },
  body: JSON.stringify(requestData)
});

if (response.ok) {
  const result = await response.json();
  console.log('Update successful:', result);
} else {
  console.error('Update failed:', response.status);
}
```

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    // Backend response data
  }
}
```

### Error Response (500)
```json
{
  "success": false,
  "message": "更新失敗: [error details]",
  "error": "[error string]"
}
```

## Environment Configuration

The API route automatically detects the environment and forwards requests to the appropriate backend URL:

- **Development**: `http://localhost:8080/tymb/people/update`
- **Production**: Uses `PUBLIC_TYMB_URL` environment variable or defaults to `https://peoplesystem.tatdvsonorth.com/tymb/people/update`

## Testing

You can test the endpoint using the provided test script:

1. Include the test script in your page
2. Open browser console
3. Run `testPeopleUpdate()`

Or use the cURL command provided above with your actual data. 