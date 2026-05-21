$url = "https://naver.me/5zUXvb8G"
$req = [System.Net.HttpWebRequest]::Create($url)
$req.AllowAutoRedirect = $false
try {
    $res = $req.GetResponse()
    $loc = $res.Headers["Location"]
    Write-Output "Redirect URL: $loc"
    $res.Close()
} catch {
    Write-Output "Error: $_"
}
