[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression") | Out-Null
[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null

$zipPath = (Resolve-Path "dobbypay_backend_production.zip").Path
$mode = [System.IO.Compression.ZipArchiveMode]::Update
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, $mode)
$entry = $zip.GetEntry("backend/config/database.php")
if ($null -ne $entry) {
    $entry.Delete()
}
$sourceFile = (Resolve-Path "backend/config/database.php").Path
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $sourceFile, "backend/config/database.php")
$zip.Dispose()
Write-Output "SUCCESS"
