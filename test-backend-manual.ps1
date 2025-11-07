# Comprehensive Backend Testing Script
# Tests all major backend endpoints with proper error handling

$baseUrl = "http://localhost:8080"
$testResults = @()

function Write-TestResult {
    param($name, $status, $message)
    $color = if ($status -eq "PASS") { "Green" } elseif ($status -eq "FAIL") { "Red" } else { "Yellow" }
    Write-Host "`n[$status] $name" -ForegroundColor $color
    Write-Host "    $message" -ForegroundColor Gray
    $script:testResults += [PSCustomObject]@{
        Test = $name
        Status = $status
        Message = $message
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TOLINK BACKEND COMPREHENSIVE TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Root Endpoint
Write-Host "Test 1: Root Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1" -Method Get
    Write-TestResult "Root Endpoint" "PASS" "Response: $response"
} catch {
    Write-TestResult "Root Endpoint" "FAIL" $_.Exception.Message
}

# Test 2: User Signup
Write-Host "`nTest 2: User Signup" -ForegroundColor Yellow
$randomEmail = "testuser$(Get-Random -Minimum 1000 -Maximum 9999)@example.com"
$signupBody = @{
    email = $randomEmail
    password = "Test1234!"
    name = "Test User"
} | ConvertTo-Json

try {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $response = Invoke-WebRequest -Uri "$baseUrl/v1/auth/signup" `
        -Method Post `
        -Body $signupBody `
        -ContentType "application/json" `
        -WebSession $session
    
    $user = $response.Content | ConvertFrom-Json
    $global:authSession = $session
    Write-TestResult "User Signup" "PASS" "Created user: $($user.email)"
} catch {
    Write-TestResult "User Signup" "FAIL" $_.Exception.Message
    exit 1
}

# Test 3: Get Current User
Write-Host "`nTest 3: Get Current User Profile" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/me" `
        -Method Get `
        -WebSession $global:authSession
    
    Write-TestResult "Get Current User" "PASS" "User: $($response.name) | Email: $($response.email) | Role: $($response.role)"
} catch {
    Write-TestResult "Get Current User" "FAIL" $_.Exception.Message
}

# Test 4: Create Short URL (Unauthenticated)
Write-Host "`nTest 4: Create Short URL (Public)" -ForegroundColor Yellow
$urlBody = @{
    originalUrl = "https://github.com/nestjs/nest"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $urlBody `
        -ContentType "application/json"
    
    $global:shortCode = $response.shortCode
    Write-TestResult "Create Short URL" "PASS" "Short URL: $($response.shortUrl) -> $($response.originalUrl)"
} catch {
    Write-TestResult "Create Short URL" "FAIL" $_.Exception.Message
}

# Test 5: Create Short URL with Custom Alias
Write-Host "`nTest 5: Create Short URL with Custom Alias" -ForegroundColor Yellow
$aliasBody = @{
    originalUrl = "https://www.google.com"
    customAlias = "google-$(Get-Random -Minimum 100 -Maximum 999)"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $aliasBody `
        -ContentType "application/json"
    
    $global:customShortCode = $response.shortCode
    Write-TestResult "Create Custom Alias" "PASS" "Custom alias: $($response.shortCode) -> $($response.originalUrl)"
} catch {
    Write-TestResult "Create Custom Alias" "FAIL" $_.Exception.Message
}

# Test 6: Get URL Stats
Write-Host "`nTest 6: Get URL Statistics" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/stats/$global:shortCode" `
        -Method Get
    
    Write-TestResult "Get URL Stats" "PASS" "Clicks: $($response.clickCount) | Created: $($response.createdAt)"
} catch {
    Write-TestResult "Get URL Stats" "FAIL" $_.Exception.Message
}

# Test 7: Check Alias Availability
Write-Host "`nTest 7: Check Alias Availability" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/alias-availability?alias=test-alias-$(Get-Random)" `
        -Method Get
    
    Write-TestResult "Check Alias Availability" "PASS" "Available: $($response.available) | Suggestions: $($response.suggestions.Count)"
} catch {
    Write-TestResult "Check Alias Availability" "FAIL" $_.Exception.Message
}

# Test 8: Suggest Short Code
Write-Host "`nTest 8: Suggest Short Code" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/suggest-code?length=7" `
        -Method Get
    
    Write-TestResult "Suggest Short Code" "PASS" "Suggested code: $($response.shortCode)"
} catch {
    Write-TestResult "Suggest Short Code" "FAIL" $_.Exception.Message
}

# Test 9: Test URL Redirection
Write-Host "`nTest 9: Test URL Redirection" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/r/$global:shortCode" `
        -MaximumRedirection 0 `
        -ErrorAction SilentlyContinue
    
    # Expected to get a redirect, so we check the exception
    Write-TestResult "URL Redirection" "INFO" "Status: $($response.StatusCode)"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -in @(301, 302)) {
        $redirectUrl = $_.Exception.Response.Headers.Location
        Write-TestResult "URL Redirection" "PASS" "Redirects to: $redirectUrl (Status: $($_.Exception.Response.StatusCode.value__))"
    } else {
        Write-TestResult "URL Redirection" "FAIL" $_.Exception.Message
    }
}

# Test 10: Create Authenticated Short URL
Write-Host "`nTest 10: Create Authenticated Short URL" -ForegroundColor Yellow
$authUrlBody = @{
    originalUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links" `
        -Method Post `
        -Body $authUrlBody `
        -ContentType "application/json" `
        -WebSession $global:authSession
    
    $global:authLinkId = $response.id
    $global:authShortCode = $response.shortCode
    Write-TestResult "Create Auth Short URL" "PASS" "Auth link: $($response.shortUrl) | ID: $($response.id)"
} catch {
    Write-TestResult "Create Auth Short URL" "FAIL" $_.Exception.Message
}

# Test 11: Get User Links List
Write-Host "`nTest 11: Get User Links List" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links?limit=10&offset=0" `
        -Method Get `
        -WebSession $global:authSession
    
    Write-TestResult "Get User Links List" "PASS" "Total links: $($response.total) | Returned: $($response.data.Count)"
} catch {
    Write-TestResult "Get User Links List" "FAIL" $_.Exception.Message
}

# Test 12: Get Specific Link
Write-Host "`nTest 12: Get Specific Link by ID" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$global:authLinkId" `
        -Method Get `
        -WebSession $global:authSession
    
    Write-TestResult "Get Specific Link" "PASS" "Link: $($response.shortCode) -> $($response.originalUrl)"
} catch {
    Write-TestResult "Get Specific Link" "FAIL" $_.Exception.Message
}

# Test 13: Update Link
Write-Host "`nTest 13: Update Link" -ForegroundColor Yellow
$updateBody = @{
    urlName = "My Awesome Test Link"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$global:authLinkId" `
        -Method Patch `
        -Body $updateBody `
        -ContentType "application/json" `
        -WebSession $global:authSession
    
    Write-TestResult "Update Link" "PASS" "Updated name: $($response.urlName)"
} catch {
    Write-TestResult "Update Link" "FAIL" $_.Exception.Message
}

# Test 14: Get Public Link Metadata
Write-Host "`nTest 14: Get Public Link Metadata" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/links/$global:shortCode/public-meta" `
        -Method Get
    
    Write-TestResult "Get Public Metadata" "PASS" "Status: $($response.status) | Has Password: $($response.hasPassword) | Is Private: $($response.isPrivate)"
} catch {
    Write-TestResult "Get Public Metadata" "FAIL" $_.Exception.Message
}

# Test 15: Analytics Overview
Write-Host "`nTest 15: Analytics Overview" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/overview?scope=user&range=30d" `
        -Method Get `
        -WebSession $global:authSession
    
    Write-TestResult "Analytics Overview" "PASS" "Total Clicks: $($response.totalClicks) | Total Links: $($response.totalLinks)"
} catch {
    Write-TestResult "Analytics Overview" "FAIL" $_.Exception.Message
}

# Test 16: Analytics Clicks Series
Write-Host "`nTest 16: Analytics Clicks Series" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/clicks/series?scope=user&range=7d&granularity=day" `
        -Method Get `
        -WebSession $global:authSession
    
    Write-TestResult "Analytics Clicks Series" "PASS" "Data points: $($response.series.Count)"
} catch {
    Write-TestResult "Analytics Clicks Series" "FAIL" $_.Exception.Message
}

# Test 17: Analytics Per-URL
Write-Host "`nTest 17: Analytics Per-URL" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/analytics/clicks/per-url?range=30d" `
        -Method Get `
        -WebSession $global:authSession
    
    Write-TestResult "Analytics Per-URL" "PASS" "URLs tracked: $($response.urls.Count)"
} catch {
    Write-TestResult "Analytics Per-URL" "FAIL" $_.Exception.Message
}

# Test 18: Update User Profile
Write-Host "`nTest 18: Update User Profile" -ForegroundColor Yellow
$profileBody = @{
    name = "Test User Updated"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/users/me" `
        -Method Patch `
        -Body $profileBody `
        -ContentType "application/json" `
        -WebSession $global:authSession
    
    Write-TestResult "Update User Profile" "PASS" "Updated name: $($response.name)"
} catch {
    Write-TestResult "Update User Profile" "FAIL" $_.Exception.Message
}

# Test 19: Change Password
Write-Host "`nTest 19: Change Password" -ForegroundColor Yellow
$changePassBody = @{
    currentPassword = "Test1234!"
    newPassword = "NewTest1234!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/change-password" `
        -Method Post `
        -Body $changePassBody `
        -ContentType "application/json" `
        -WebSession $global:authSession
    
    Write-TestResult "Change Password" "PASS" "Password changed successfully"
    
    # Change it back
    $changeBackBody = @{
        currentPassword = "NewTest1234!"
        newPassword = "Test1234!"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$baseUrl/v1/auth/change-password" `
        -Method Post `
        -Body $changeBackBody `
        -ContentType "application/json" `
        -WebSession $global:authSession | Out-Null
} catch {
    Write-TestResult "Change Password" "FAIL" $_.Exception.Message
}

# Test 20: Delete Link
Write-Host "`nTest 20: Delete Link" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/v1/links/$global:authLinkId" `
        -Method Delete `
        -WebSession $global:authSession | Out-Null
    
    Write-TestResult "Delete Link" "PASS" "Link deleted successfully"
} catch {
    Write-TestResult "Delete Link" "FAIL" $_.Exception.Message
}

# Test 21: Logout
Write-Host "`nTest 21: Logout" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/v1/auth/logout" `
        -Method Post `
        -WebSession $global:authSession | Out-Null
    
    Write-TestResult "Logout" "PASS" "Logged out successfully"
} catch {
    Write-TestResult "Logout" "FAIL" $_.Exception.Message
}

# Test 22: Verify Logout
Write-Host "`nTest 22: Verify Logout (Should Fail)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/auth/me" `
        -Method Get `
        -WebSession $global:authSession
    
    Write-TestResult "Verify Logout" "FAIL" "Still authenticated after logout"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-TestResult "Verify Logout" "PASS" "Correctly unauthorized (401)"
    } else {
        Write-TestResult "Verify Logout" "FAIL" $_.Exception.Message
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$info = ($testResults | Where-Object { $_.Status -eq "INFO" }).Count
$total = $testResults.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Info: $info" -ForegroundColor Yellow

if ($total -gt 0) {
    $successRate = [math]::Round(($passed / $total) * 100, 2)
    Write-Host "Success Rate: $successRate%" -ForegroundColor Cyan
}

Write-Host "`nDetailed Results:" -ForegroundColor White
$testResults | Format-Table -AutoSize

if ($failed -eq 0) {
    Write-Host "`n✅ All tests passed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some tests failed. Review the details above." -ForegroundColor Yellow
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

