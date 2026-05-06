# Comprehensive ToLink Backend API Testing
$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:8080"
$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [scriptblock]$TestCode
    )
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Test: $Name" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    
    try {
        $result = & $TestCode
        Write-Host "✓ PASS" -ForegroundColor Green
        Write-Host $result
        $script:testResults += [PSCustomObject]@{Test=$Name; Status="PASS"; Details=$result}
        return $true
    } catch {
        Write-Host "✗ FAIL" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += [PSCustomObject]@{Test=$Name; Status="FAIL"; Details=$_.Exception.Message}
        return $false
    }
}

Write-Host "`n╔══════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║  ToLink Backend Comprehensive Tests  ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════╝`n" -ForegroundColor Magenta

# Test 1: Root Endpoint
Test-Endpoint "1. Root Endpoint (GET /v1)" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1" -Method Get
    "Response: $response"
}

# Test 2: Create Account
$testEmail = "testuser$(Get-Random -Minimum 1000 -Maximum 9999)@example.com"
$testPassword = "Test1234!"

Test-Endpoint "2. Create User Account" {
    $body = @{
        email = $testEmail
        password = $testPassword
        name = "Test User $(Get-Random -Minimum 100 -Maximum 999)"
    } | ConvertTo-Json
    
    $script:session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/signup" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -WebSession $script:session
    
    $script:userId = $response.id
    "Created user: $($response.name) ($($response.email)) [ID: $($response.id)]"
}

# Test 3: Get Current User
Test-Endpoint "3. Get Current User Profile" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/me" `
        -Method Get `
        -WebSession $script:session
    
    "User: $($response.name), Email: $($response.email), Role: $($response.role)"
}

# Test 4: Update Profile
Test-Endpoint "4. Update User Profile" {
    $body = @{
        name = "Updated Test User"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/users/me" `
        -Method Patch `
        -Body $body `
        -ContentType "application/json" `
        -WebSession $script:session
    
    "Updated name to: $($response.name)"
}

# Test 5: Change Password
Test-Endpoint "5. Change Password" {
    $newPassword = "NewTest1234!"
    $body = @{
        currentPassword = $testPassword
        newPassword = $newPassword
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/change-password" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -WebSession $script:session
    
    # Change it back
    $body2 = @{
        currentPassword = $newPassword
        newPassword = $testPassword
    } | ConvertTo-Json
    
    $null = Invoke-RestMethod -Uri "$baseUrl/v1/auth/change-password" `
        -Method Post `
        -Body $body2 `
        -ContentType "application/json" `
        -WebSession $script:session
    
    "Password changed and reverted successfully"
}

# Test 6: Create Short URL (Public)
Test-Endpoint "6. Create Short URL (Public)" {
    $body = @{
        originalUrl = "https://www.github.com/microsoft/vscode"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"
    
    $script:publicShortCode = $response.shortCode
    $script:publicLinkId = $response.id
    "Short URL: $($response.shortUrl) -> $($response.originalUrl) [Clicks: $($response.clickCount)]"
}

# Test 7: Create Short URL with Custom Alias
$customAlias = "mylink$(Get-Random -Minimum 1000 -Maximum 9999)"
Test-Endpoint "7. Create Short URL with Custom Alias" {
    $body = @{
        originalUrl = "https://www.example.com"
        customAlias = $customAlias
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"
    
    $script:customShortCode = $response.shortCode
    "Short URL with alias '$customAlias': $($response.shortUrl)"
}

# Test 8: Get URL Stats
Test-Endpoint "8. Get URL Statistics" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/stats/$script:publicShortCode" `
        -Method Get
    
    "Short Code: $($response.shortCode), Clicks: $($response.clickCount), Created: $($response.createdAt)"
}

# Test 9: Check Alias Availability (Available)
Test-Endpoint "9. Check Alias Availability (Available)" {
    $testAlias = "available-alias-$(Get-Random -Minimum 10000 -Maximum 99999)"
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/alias-availability?alias=$testAlias" `
        -Method Get
    
    "Alias '$testAlias' available: $($response.available)"
}

# Test 10: Check Alias Availability (Taken)
Test-Endpoint "10. Check Alias Availability (Taken)" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/alias-availability?alias=$customAlias" `
        -Method Get
    
    if ($response.available -eq $false) {
        "Alias '$customAlias' is taken (expected). Suggestions: $($response.suggestions -join ', ')"
    } else {
        throw "Expected alias to be taken but it shows as available"
    }
}

# Test 11: Suggest Short Code
Test-Endpoint "11. Suggest Short Code" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/suggest-code?length=8" `
        -Method Get
    
    "Suggested code: $($response.shortCode) (length: $($response.shortCode.Length))"
}

# Test 12: Test URL Redirection
Test-Endpoint "12. Test URL Redirection" {
    $response = Invoke-WebRequest -Uri "$baseUrl/r/$script:publicShortCode" `
        -MaximumRedirection 0 `
        -ErrorAction SilentlyContinue
    
    $location = $response.Headers.Location
    $statusCode = $response.StatusCode
    "Redirect Status: $statusCode, Location: $location"
}

# Test 13: Get Public Link Metadata
Test-Endpoint "13. Get Public Link Metadata" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$script:publicShortCode/public-meta" `
        -Method Get
    
    "Status: $($response.status), Has Password: $($response.hasPassword), Is Private: $($response.isPrivate)"
}

# Test 14: Create Authenticated Short URL
Test-Endpoint "14. Create Authenticated Short URL" {
    $body = @{
        originalUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        urlName = "Rick Astley Video"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -WebSession $script:session
    
    $script:authLinkId = $response.id
    $script:authShortCode = $response.shortCode
    "Short URL: $($response.shortUrl), Name: $($response.urlName)"
}

# Test 15: Create Password Protected Link
$linkPassword = "secret123"
Test-Endpoint "15. Create Password Protected Link" {
    $body = @{
        originalUrl = "https://www.secret-site.com"
        password = $linkPassword
        urlName = "Secret Link"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -WebSession $script:session
    
    $script:passwordLinkId = $response.id
    $script:passwordShortCode = $response.shortCode
    "Password-protected link: $($response.shortUrl)"
}

# Test 16: Get User Links
Test-Endpoint "16. Get User's Links (Paginated)" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links?limit=10&offset=0&sort=-createdAt" `
        -Method Get `
        -WebSession $script:session
    
    "Total links: $($response.total), Returned: $($response.data.Count), Has More: $($response.hasMore)"
}

# Test 17: Search User Links
Test-Endpoint "17. Search User Links" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links?search=Rick" `
        -Method Get `
        -WebSession $script:session
    
    "Search results for 'Rick': $($response.total) links found"
}

# Test 18: Filter Active Links
Test-Endpoint "18. Filter Active Links" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links?filter=active" `
        -Method Get `
        -WebSession $script:session
    
    "Active links: $($response.total)"
}

# Test 19: Get Specific Link
Test-Endpoint "19. Get Specific Link by ID" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$script:authLinkId" `
        -Method Get `
        -WebSession $script:session
    
    "Link: $($response.shortCode) -> $($response.originalUrl), Name: $($response.urlName)"
}

# Test 20: Update Link
Test-Endpoint "20. Update Link Properties" {
    $body = @{
        urlName = "Updated Rick Astley Video"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$script:authLinkId" `
        -Method Patch `
        -Body $body `
        -ContentType "application/json" `
        -WebSession $script:session
    
    "Updated name to: $($response.urlName)"
}

# Test 21: Set Link Expiry
Test-Endpoint "21. Set Link Expiration" {
    $expiryDate = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $body = @{
        expiresAt = $expiryDate
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$script:authLinkId" `
        -Method Patch `
        -Body $body `
        -ContentType "application/json" `
        -WebSession $script:session
    
    "Set expiry to: $($response.expiresAt)"
}

# Test 22: Analytics Overview (User Scope)
Test-Endpoint "22. Analytics Overview (User Scope)" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/overview?scope=user&range=30d" `
        -Method Get `
        -WebSession $script:session
    
    "Total Clicks: $($response.totalClicks), Total Links: $($response.totalLinks), Devices: Desktop=$($response.devices.desktop), Mobile=$($response.devices.mobile)"
}

# Test 23: Analytics Clicks Series
Test-Endpoint "23. Analytics Clicks Time Series" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/clicks/series?scope=user&range=7d&granularity=day" `
        -Method Get `
        -WebSession $script:session
    
    "Data points: $($response.series.Count), Range: $($response.range)"
}

# Test 24: Analytics Per-URL Clicks
Test-Endpoint "24. Analytics Per-URL Clicks" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/clicks/per-url?range=30d" `
        -Method Get `
        -WebSession $script:session
    
    "URLs tracked: $($response.urls.Count)"
}

# Test 25: Analytics for Specific Link
Test-Endpoint "25. Analytics Overview (Link Scope)" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/overview?scope=link&linkId=$script:authLinkId&range=30d" `
        -Method Get `
        -WebSession $script:session
    
    "Link Clicks: $($response.totalClicks), Referrers: $($response.topReferrers.Count)"
}

# Test 26: Simulate Link Click (to generate analytics)
Test-Endpoint "26. Simulate Link Click (Generate Analytics)" {
    $null = Invoke-WebRequest -Uri "$baseUrl/r/$script:authShortCode" `
        -MaximumRedirection 10 `
        -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" `
        -ErrorAction SilentlyContinue
    
    Start-Sleep -Milliseconds 500
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/stats/$script:authShortCode" `
        -Method Get
    
    "Link clicked successfully. New click count: $($response.clickCount)"
}

# Test 27: Verify Password Protected Link Metadata
Test-Endpoint "27. Verify Password Protected Link Metadata" {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$script:passwordShortCode/public-meta" `
        -Method Get
    
    if ($response.hasPassword -eq $true -and $response.status -eq "password_required") {
        "Password protection verified: Status=$($response.status), HasPassword=$($response.hasPassword)"
    } else {
        throw "Expected password protection but got Status=$($response.status), HasPassword=$($response.hasPassword)"
    }
}

# Test 28: Access Password Protected Link (Wrong Password)
Test-Endpoint "28. Access Password Protected Link (Wrong Password)" {
    try {
        $body = @{
            password = "wrongpassword"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$script:passwordShortCode/access" `
            -Method Post `
            -Body $body `
            -ContentType "application/json"
        
        throw "Should have failed with wrong password"
    } catch {
        if ($_.Exception.Message -like "*401*" -or $_.Exception.Message -like "*Unauthorized*") {
            "Correctly rejected wrong password (401 Unauthorized)"
        } else {
            throw $_
        }
    }
}

# Test 29: Access Password Protected Link (Correct Password)
Test-Endpoint "29. Access Password Protected Link (Correct Password)" {
    $body = @{
        password = $linkPassword
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$script:passwordShortCode/access" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"
    
    $script:redirectToken = $response.redirectToken
    "Access granted. Redirect token received. Redirect URL: $($response.redirectUrl)"
}

# Test 30: Redirect with Token
Test-Endpoint "30. Redirect with Valid Token" {
    $redirectUrl = "/v1/links/$script:passwordShortCode/redirect?token=$script:redirectToken"
    $response = Invoke-WebRequest -Uri "$baseUrl$redirectUrl" `
        -MaximumRedirection 0 `
        -ErrorAction SilentlyContinue
    
    $location = $response.Headers.Location
    "Redirect successful to: $location (Status: $($response.StatusCode))"
}

# Test 31: Delete Link
Test-Endpoint "31. Delete Link" {
    $response = Invoke-WebRequest -Uri "$baseUrl/v1/links/$script:authLinkId" `
        -Method Delete `
        -WebSession $script:session
    
    if ($response.StatusCode -eq 204) {
        "Link deleted successfully (Status: 204 No Content)"
    } else {
        throw "Expected 204 but got $($response.StatusCode)"
    }
}

# Test 32: Verify Link Deleted
Test-Endpoint "32. Verify Link Deleted" {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$script:authLinkId" `
            -Method Get `
            -WebSession $script:session
        
        throw "Link still accessible after deletion"
    } catch {
        if ($_.Exception.Message -like "*404*" -or $_.Exception.Message -like "*Not Found*") {
            "Link correctly returns 404 after deletion"
        } else {
            throw $_
        }
    }
}

# Test 33: Logout
Test-Endpoint "33. Logout User" {
    $response = Invoke-WebRequest -Uri "$baseUrl/v1/auth/logout" `
        -Method Post `
        -WebSession $script:session
    
    if ($response.StatusCode -eq 204) {
        "Logged out successfully (Status: 204)"
    } else {
        throw "Expected 204 but got $($response.StatusCode)"
    }
}

# Test 34: Verify Logout
Test-Endpoint "34. Verify Logout (Cannot Access Protected Route)" {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/me" `
            -Method Get `
            -WebSession $script:session
        
        throw "Still authenticated after logout"
    } catch {
        if ($_.Exception.Message -like "*401*" -or $_.Exception.Message -like "*Unauthorized*") {
            "Correctly unauthorized after logout (401)"
        } else {
            throw $_
        }
    }
}

# Test 35: Login with Existing Account
Test-Endpoint "35. Login with Existing Account" {
    $body = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json
    
    $script:session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/login" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -WebSession $script:session
    
    "Logged in: $($response.name) ($($response.email))"
}

# Test 36: Invalid Login
Test-Endpoint "36. Invalid Login (Wrong Password)" {
    try {
        $body = @{
            email = $testEmail
            password = "WrongPassword123!"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/login" `
            -Method Post `
            -Body $body `
            -ContentType "application/json"
        
        throw "Should have failed with wrong password"
    } catch {
        if ($_.Exception.Message -like "*401*" -or $_.Exception.Message -like "*Unauthorized*") {
            "Correctly rejected wrong password (401)"
        } else {
            throw $_
        }
    }
}

# Summary
Write-Host "`n╔══════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║         TEST SUMMARY                 ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Magenta

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $testResults.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red

if ($total -gt 0) {
    $successRate = [math]::Round(($passed/$total)*100, 2)
    Write-Host "Success Rate: $successRate%" -ForegroundColor Cyan
}

Write-Host "`n"
if ($failed -gt 0) {
    Write-Host "Failed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  ✗ $($_.Test)" -ForegroundColor Red
        Write-Host "    Error: $($_.Details)" -ForegroundColor DarkRed
    }
}

if ($failed -eq 0) {
    Write-Host "`n✅ All tests passed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  $failed test(s) failed. See details above." -ForegroundColor Yellow
}

Write-Host "`n"



