# ToLink Backend API Testing Script
# This script tests all backend endpoints systematically

$baseUrl = "http://localhost:8080"
$results = @()

# Helper function to log results
function Log-Test {
    param($name, $status, $details)
    $results += [PSCustomObject]@{
        Test = $name
        Status = $status
        Details = $details
    }
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "$name" -ForegroundColor Yellow
    Write-Host "Status: $status" -ForegroundColor $(if ($status -eq "PASS") { "Green" } else { "Red" })
    Write-Host "Details: $details"
    Write-Host "============================================`n"
}

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   ToLink Backend API Testing Suite" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Test 1: Root Endpoint
Write-Host "Test 1: Root Endpoint (GET /v1)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1" -Method Get
    Log-Test "Root Endpoint" "PASS" "Response: $response"
} catch {
    Log-Test "Root Endpoint" "FAIL" $_.Exception.Message
}

# Test 2: Signup
Write-Host "Test 2: User Signup (POST /v1/auth/signup)" -ForegroundColor Cyan
$signupBody = @{
    email = "testuser@example.com"
    password = "Test1234!"
    name = "Test User"
} | ConvertTo-Json

try {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/signup" `
        -Method Post `
        -Body $signupBody `
        -ContentType "application/json" `
        -WebSession $session `
        -SessionVariable 'global:authSession'
    
    Log-Test "User Signup" "PASS" "User created: $($response.name) ($($response.email))"
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.statusCode -eq 409) {
        Log-Test "User Signup" "INFO" "User already exists (409) - This is expected on re-runs"
        
        # Try login instead
        Write-Host "Attempting login instead..." -ForegroundColor Yellow
        $loginBody = @{
            email = "testuser@example.com"
            password = "Test1234!"
        } | ConvertTo-Json
        
        try {
            $global:authSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
            $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/login" `
                -Method Post `
                -Body $loginBody `
                -ContentType "application/json" `
                -WebSession $global:authSession
            
            Log-Test "User Login (Fallback)" "PASS" "Logged in: $($response.name) ($($response.email))"
        } catch {
            Log-Test "User Login (Fallback)" "FAIL" $_.Exception.Message
            exit 1
        }
    } else {
        Log-Test "User Signup" "FAIL" $errorDetails.message
    }
}

# Test 3: Get Current User Profile
Write-Host "Test 3: Get Current User (GET /v1/auth/me)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/me" `
        -Method Get `
        -WebSession $global:authSession
    
    Log-Test "Get Current User" "PASS" "User: $($response.name) ($($response.email))"
    $global:userId = $response.id
} catch {
    Log-Test "Get Current User" "FAIL" $_.Exception.Message
}

# Test 4: Create Short URL (Public - No Auth)
Write-Host "Test 4: Create Short URL (POST /v1/links)" -ForegroundColor Cyan
$createUrlBody = @{
    originalUrl = "https://www.github.com/nestjs/nest"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $createUrlBody `
        -ContentType "application/json"
    
    Log-Test "Create Short URL" "PASS" "Short URL: $($response.shortUrl) -> $($response.originalUrl)"
    $global:shortCode = $response.shortCode
    $global:linkId = $response.id
} catch {
    Log-Test "Create Short URL" "FAIL" $_.Exception.Message
}

# Test 5: Create Short URL with Custom Alias
Write-Host "Test 5: Create Short URL with Custom Alias" -ForegroundColor Cyan
$customAliasBody = @{
    originalUrl = "https://www.google.com"
    customAlias = "google-search"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $customAliasBody `
        -ContentType "application/json"
    
    Log-Test "Create Short URL with Alias" "PASS" "Short URL: $($response.shortUrl) (alias: $($response.shortCode))"
    $global:customShortCode = $response.shortCode
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.statusCode -eq 400 -and $errorDetails.message -like "*already exists*") {
        Log-Test "Create Short URL with Alias" "INFO" "Alias already exists - Expected on re-runs"
        $global:customShortCode = "google-search"
    } else {
        Log-Test "Create Short URL with Alias" "FAIL" $errorDetails.message
    }
}

# Test 6: Get URL Stats
Write-Host "Test 6: Get URL Stats (GET /v1/links/stats/:shortCode)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/stats/$global:shortCode" -Method Get
    Log-Test "Get URL Stats" "PASS" "Clicks: $($response.clickCount), Created: $($response.createdAt)"
} catch {
    Log-Test "Get URL Stats" "FAIL" $_.Exception.Message
}

# Test 7: Check Alias Availability
Write-Host "Test 7: Check Alias Availability (GET /v1/links/alias-availability)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/alias-availability?alias=test-alias-123" -Method Get
    Log-Test "Check Alias Availability" "PASS" "Available: $($response.available)"
} catch {
    Log-Test "Check Alias Availability" "FAIL" $_.Exception.Message
}

# Test 8: Suggest Short Code
Write-Host "Test 8: Suggest Short Code (GET /v1/links/suggest-code)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/suggest-code?length=7" -Method Get
    Log-Test "Suggest Short Code" "PASS" "Suggested: $($response.shortCode)"
} catch {
    Log-Test "Suggest Short Code" "FAIL" $_.Exception.Message
}

# Test 9: Test Redirection (Direct HTTP GET)
Write-Host "Test 9: Test URL Redirection (GET /r/:shortCode)" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/r/$global:shortCode" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 301 -or $response.StatusCode -eq 302) {
        $redirectUrl = $response.Headers.Location
        Log-Test "URL Redirection" "PASS" "Redirects to: $redirectUrl (Status: $($response.StatusCode))"
    } else {
        Log-Test "URL Redirection" "FAIL" "Unexpected status code: $($response.StatusCode)"
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 301) {
        $redirectUrl = $_.Exception.Response.Headers.Location
        Log-Test "URL Redirection" "PASS" "Redirects to: $redirectUrl (Status: 301)"
    } else {
        Log-Test "URL Redirection" "FAIL" $_.Exception.Message
    }
}

# Test 10: Get User Links (Authenticated)
Write-Host "Test 10: Get User Links (GET /v1/links)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links?limit=10&offset=0" `
        -Method Get `
        -WebSession $global:authSession
    
    Log-Test "Get User Links" "PASS" "Found $($response.total) links, returned $($response.data.Count) items"
} catch {
    Log-Test "Get User Links" "FAIL" $_.Exception.Message
}

# Test 11: Create Authenticated Short URL
Write-Host "Test 11: Create Authenticated Short URL" -ForegroundColor Cyan
$authUrlBody = @{
    originalUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $authUrlBody `
        -ContentType "application/json" `
        -WebSession $global:authSession
    
    Log-Test "Create Authenticated Short URL" "PASS" "Short URL: $($response.shortUrl)"
    $global:authLinkId = $response.id
    $global:authShortCode = $response.shortCode
} catch {
    Log-Test "Create Authenticated Short URL" "FAIL" $_.Exception.Message
}

# Test 12: Get Specific Link
Write-Host "Test 12: Get Specific Link (GET /v1/links/:id)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$global:authLinkId" `
        -Method Get `
        -WebSession $global:authSession
    
    Log-Test "Get Specific Link" "PASS" "Link: $($response.shortCode) -> $($response.originalUrl)"
} catch {
    Log-Test "Get Specific Link" "FAIL" $_.Exception.Message
}

# Test 13: Update Link
Write-Host "Test 13: Update Link (PATCH /v1/links/:id)" -ForegroundColor Cyan
$updateBody = @{
    urlName = "My Awesome Link"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$global:authLinkId" `
        -Method Patch `
        -Body $updateBody `
        -ContentType "application/json" `
        -WebSession $global:authSession
    
    Log-Test "Update Link" "PASS" "Updated link name to: $($response.urlName)"
} catch {
    Log-Test "Update Link" "FAIL" $_.Exception.Message
}

# Test 14: Analytics Overview
Write-Host "Test 14: Analytics Overview (GET /v1/analytics/overview)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/overview?scope=user&range=30d" `
        -Method Get `
        -WebSession $global:authSession
    
    Log-Test "Analytics Overview" "PASS" "Total Clicks: $($response.totalClicks), Total Links: $($response.totalLinks)"
} catch {
    Log-Test "Analytics Overview" "FAIL" $_.Exception.Message
}

# Test 15: Analytics Clicks Series
Write-Host "Test 15: Analytics Clicks Series (GET /v1/analytics/clicks/series)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/clicks/series?scope=user&range=7d&granularity=day" `
        -Method Get `
        -WebSession $global:authSession
    
    Log-Test "Analytics Clicks Series" "PASS" "Data points: $($response.series.Count)"
} catch {
    Log-Test "Analytics Clicks Series" "FAIL" $_.Exception.Message
}

# Test 16: Analytics Per-URL Clicks
Write-Host "Test 16: Analytics Per-URL Clicks (GET /v1/analytics/clicks/per-url)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/clicks/per-url?range=30d" `
        -Method Get `
        -WebSession $global:authSession
    
    Log-Test "Analytics Per-URL Clicks" "PASS" "URLs tracked: $($response.urls.Count)"
} catch {
    Log-Test "Analytics Per-URL Clicks" "FAIL" $_.Exception.Message
}

# Test 17: Update User Profile
Write-Host "Test 17: Update User Profile (PATCH /v1/users/me)" -ForegroundColor Cyan
$updateProfileBody = @{
    name = "Test User Updated"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/users/me" `
        -Method Patch `
        -Body $updateProfileBody `
        -ContentType "application/json" `
        -WebSession $global:authSession
    
    Log-Test "Update User Profile" "PASS" "Updated name to: $($response.name)"
} catch {
    Log-Test "Update User Profile" "FAIL" $_.Exception.Message
}

# Test 18: Change Password
Write-Host "Test 18: Change Password (POST /v1/auth/change-password)" -ForegroundColor Cyan
$changePasswordBody = @{
    currentPassword = "Test1234!"
    newPassword = "NewTest1234!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/change-password" `
        -Method Post `
        -Body $changePasswordBody `
        -ContentType "application/json" `
        -WebSession $global:authSession
    
    Log-Test "Change Password" "PASS" "Password changed successfully"
    
    # Change it back
    $changeBackBody = @{
        currentPassword = "NewTest1234!"
        newPassword = "Test1234!"
    } | ConvertTo-Json
    
    $null = Invoke-RestMethod -Uri "$baseUrl/v1/auth/change-password" `
        -Method Post `
        -Body $changeBackBody `
        -ContentType "application/json" `
        -WebSession $global:authSession
} catch {
    Log-Test "Change Password" "FAIL" $_.Exception.Message
}

# Test 19: Get Public Link Metadata
Write-Host "Test 19: Get Public Link Metadata (GET /v1/links/:shortCode/public-meta)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$global:shortCode/public-meta" -Method Get
    Log-Test "Get Public Link Metadata" "PASS" "Status: $($response.status), Has Password: $($response.hasPassword)"
} catch {
    Log-Test "Get Public Link Metadata" "FAIL" $_.Exception.Message
}

# Test 20: Logout
Write-Host "Test 20: Logout (POST /v1/auth/logout)" -ForegroundColor Cyan
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/v1/auth/logout" `
        -Method Post `
        -WebSession $global:authSession
    
    Log-Test "Logout" "PASS" "Logged out successfully"
} catch {
    Log-Test "Logout" "FAIL" $_.Exception.Message
}

# Test 21: Verify Logout (Should fail)
Write-Host "Test 21: Verify Logout - Access Protected Route (GET /v1/auth/me)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/me" `
        -Method Get `
        -WebSession $global:authSession
    
    Log-Test "Verify Logout" "FAIL" "Still authenticated after logout"
} catch {
    Log-Test "Verify Logout" "PASS" "Cannot access protected route (expected 401)"
}

# Summary
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "          TEST SUMMARY" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$info = ($results | Where-Object { $_.Status -eq "INFO" }).Count
$total = $results.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Info: $info" -ForegroundColor Yellow
Write-Host "Success Rate: $([math]::Round(($passed/$total)*100, 2))%" -ForegroundColor Cyan

Write-Host "`nDetailed Results:" -ForegroundColor White
$results | Format-Table -AutoSize

if ($failed -eq 0) {
    Write-Host "`n✅ All tests passed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some tests failed. Please review the failures above." -ForegroundColor Yellow
}

Write-Host "`n========================================`n" -ForegroundColor Magenta



